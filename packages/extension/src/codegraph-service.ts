import { spawn } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

import type CodeGraph from '@colbymchenry/codegraph';
import type { CodeGraphProgress, CodeGraphRuntime, CodeGraphSettingsState } from '@helm/core';

type CodeGraphClass = typeof CodeGraph;
type CodeGraphInstance = CodeGraph;

interface ToolResult {
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}

interface ToolHandlerInstance {
  execute(toolName: string, args: Record<string, unknown>): Promise<ToolResult>;
}

interface ToolHandlerClass {
  new (graph: CodeGraphInstance | null): ToolHandlerInstance;
}

interface CodeGraphRuntimeModules {
  CodeGraph: CodeGraphClass;
  ToolHandler: ToolHandlerClass;
}

interface CliStatus {
  initialized: boolean;
  fileCount?: number;
  nodeCount?: number;
  edgeCount?: number;
  lastIndexed?: string | null;
}

export type CodeGraphCliRunner = (args: readonly string[], signal?: AbortSignal) => Promise<string>;

export interface CodeGraphServiceOptions {
  extensionRoot?: string;
  nodeVersion?: string;
  runCli?: CodeGraphCliRunner;
  onProgress?: (progress: CodeGraphProgress) => void;
  onStateChanged?: () => void;
}

export function selectCodeGraphRuntime(nodeVersion: string): CodeGraphRuntime {
  const [major = 0, minor = 0] = nodeVersion
    .replace(/^v/u, '')
    .split('.')
    .map((part) => Number.parseInt(part, 10));
  return major > 22 || (major === 22 && minor >= 5) ? 'in-process' : 'cli';
}

export function addCodeGraphToGitignore(content: string): string {
  const lines = content.split(/\r?\n/u);
  if (lines.some((line) => /^\/?\.codegraph\/?$/u.test(line.trim()))) return content;
  const prefix = content.length > 0 && !content.endsWith('\n') ? `${content}\n` : content;
  return `${prefix}.codegraph/\n`;
}

export class CodeGraphService {
  readonly runtime: CodeGraphRuntime;

  private graph: CodeGraphInstance | undefined;
  private modules: CodeGraphRuntimeModules | undefined;
  private indexing = false;
  private progress: CodeGraphProgress | undefined;
  private error: string | undefined;
  private syncTimer: NodeJS.Timeout | undefined;
  private syncing: Promise<void> | undefined;
  private readonly runCli: CodeGraphCliRunner;

  constructor(
    private readonly workspaceRoot: string,
    private readonly options: CodeGraphServiceOptions = {},
  ) {
    this.runtime = selectCodeGraphRuntime(options.nodeVersion ?? process.versions.node);
    this.runCli = options.runCli ?? ((args, signal) => this.spawnCli(args, signal));
  }

  get indexPath(): string {
    return path.join(this.workspaceRoot, '.codegraph', 'codegraph.db');
  }

  hasIndex(): boolean {
    return existsSync(this.indexPath);
  }

  isGitRepository(): boolean {
    return existsSync(path.join(this.workspaceRoot, '.git'));
  }

  isIndexing(): boolean {
    return this.indexing;
  }

  currentProgress(): CodeGraphProgress | undefined {
    return this.progress;
  }

  async settingsState(enabled: boolean): Promise<CodeGraphSettingsState> {
    const base: CodeGraphSettingsState = {
      enabled,
      indexed: this.hasIndex(),
      indexing: this.indexing,
      runtime: this.runtime,
      fileCount: 0,
      symbolCount: 0,
      edgeCount: 0,
      ...(this.progress ? { progress: this.progress } : {}),
      ...(this.error ? { error: this.error } : {}),
    };
    if (!base.indexed) return base;
    try {
      const status =
        this.runtime === 'in-process'
          ? await this.inProcessStatus()
          : parseCliStatus(await this.runCli(['status', this.workspaceRoot, '--json']));
      return {
        ...base,
        indexed: status.initialized,
        fileCount: status.fileCount ?? 0,
        symbolCount: status.nodeCount ?? 0,
        edgeCount: status.edgeCount ?? 0,
        ...(status.lastIndexed ? { lastSync: Date.parse(status.lastIndexed) } : {}),
      };
    } catch (error) {
      return { ...base, error: errorMessage(error) };
    }
  }

  async initialize(addToGitignore: boolean): Promise<void> {
    if (this.indexing) return;
    this.error = undefined;
    this.indexing = true;
    this.updateProgress({ phase: 'starting', current: 0, total: 0 });
    this.options.onStateChanged?.();
    try {
      if (addToGitignore) this.ensureGitignoreEntry();
      if (this.runtime === 'in-process') {
        const { CodeGraph } = this.loadRuntimeModules();
        this.closeGraph();
        this.graph = await CodeGraph.init(this.workspaceRoot, { index: false });
        const result = await this.graph.indexAll({
          onProgress: (progress) => this.updateProgress(progress),
        });
        if (!result.success) {
          throw new Error(`CodeGraph could not index ${result.filesErrored} files.`);
        }
        this.startWatching();
      } else {
        await this.runCli(['init', this.workspaceRoot]);
      }
    } catch (error) {
      this.error = errorMessage(error);
      throw error;
    } finally {
      this.indexing = false;
      this.progress = undefined;
      this.options.onStateChanged?.();
    }
  }

  async reindex(): Promise<void> {
    if (!this.hasIndex()) throw new Error('Create the code graph before re-indexing it.');
    if (this.indexing) return;
    this.error = undefined;
    this.indexing = true;
    this.updateProgress({ phase: 'starting', current: 0, total: 0 });
    this.options.onStateChanged?.();
    try {
      if (this.runtime === 'in-process') {
        const { CodeGraph } = this.loadRuntimeModules();
        this.closeGraph();
        this.graph = await CodeGraph.recreate(this.workspaceRoot);
        const result = await this.graph.indexAll({
          onProgress: (progress) => this.updateProgress(progress),
        });
        if (!result.success) {
          throw new Error(`CodeGraph could not index ${result.filesErrored} files.`);
        }
        this.startWatching();
      } else {
        await this.runCli(['index', this.workspaceRoot, '--quiet']);
      }
    } catch (error) {
      this.error = errorMessage(error);
      throw error;
    } finally {
      this.indexing = false;
      this.progress = undefined;
      this.options.onStateChanged?.();
    }
  }

  async deleteIndex(): Promise<void> {
    if (!this.hasIndex()) return;
    this.error = undefined;
    this.cancelScheduledSync();
    try {
      if (this.runtime === 'in-process') {
        const graph = await this.ensureGraph();
        graph.uninitialize();
        this.graph = undefined;
      } else {
        await this.runCli(['uninit', this.workspaceRoot, '--force']);
      }
    } catch (error) {
      this.error = errorMessage(error);
      throw error;
    } finally {
      this.options.onStateChanged?.();
    }
  }

  async explore(query: string, signal?: AbortSignal): Promise<string> {
    if (!this.hasIndex()) {
      throw new Error(
        'No code graph index exists for this workspace. Use grep and read_file instead.',
      );
    }
    if (!query.trim()) throw new Error('A code-graph query is required.');
    if (this.runtime === 'cli') {
      return this.runCli(['explore', '--path', this.workspaceRoot, query.trim()], signal);
    }
    const graph = await this.ensureGraph();
    const { ToolHandler } = this.loadRuntimeModules();
    const result = await new ToolHandler(graph).execute('codegraph_explore', {
      query: query.trim(),
    });
    const text = result.content.find((item) => item.type === 'text')?.text ?? '';
    if (result.isError) throw new Error(text || 'CodeGraph could not answer this query.');
    return text;
  }

  scheduleSync(): void {
    if (this.runtime !== 'cli' || !this.hasIndex() || this.indexing) return;
    this.cancelScheduledSync();
    this.syncTimer = setTimeout(() => {
      this.syncTimer = undefined;
      this.syncing ??= this.runCli(['sync', this.workspaceRoot, '--quiet'])
        .then(() => {
          this.error = undefined;
          this.options.onStateChanged?.();
        })
        .catch((error: unknown) => {
          this.error = `Automatic code-graph sync failed: ${errorMessage(error)}`;
          this.options.onStateChanged?.();
        })
        .finally(() => {
          this.syncing = undefined;
        });
    }, 2_000);
  }

  dispose(): void {
    this.cancelScheduledSync();
    this.closeGraph();
  }

  private async inProcessStatus(): Promise<CliStatus> {
    const graph = await this.ensureGraph();
    const stats = graph.getStats();
    const lastIndexed = graph.getLastIndexedAt();
    return {
      initialized: true,
      fileCount: stats.fileCount,
      nodeCount: stats.nodeCount,
      edgeCount: stats.edgeCount,
      lastIndexed: lastIndexed === null ? null : new Date(lastIndexed).toISOString(),
    };
  }

  private async ensureGraph(): Promise<CodeGraphInstance> {
    if (this.graph) return this.graph;
    const { CodeGraph } = this.loadRuntimeModules();
    this.graph = await CodeGraph.open(this.workspaceRoot, { sync: true });
    this.startWatching();
    return this.graph;
  }

  private startWatching(): void {
    if (!this.graph || this.graph.isWatching()) return;
    this.graph.watch({
      debounceMs: 2_000,
      onSyncComplete: () => this.options.onStateChanged?.(),
      onSyncError: (error) => {
        this.error = `Automatic code-graph sync failed: ${error.message}`;
        this.options.onStateChanged?.();
      },
      onDegraded: (reason) => {
        this.error = `Code-graph auto-sync stopped: ${reason}`;
        this.options.onStateChanged?.();
      },
    });
  }

  private closeGraph(): void {
    if (!this.graph) return;
    this.graph.unwatch();
    this.graph.close();
    this.graph = undefined;
  }

  private updateProgress(progress: CodeGraphProgress): void {
    this.progress = progress;
    this.options.onProgress?.(progress);
  }

  private ensureGitignoreEntry(): void {
    if (!this.isGitRepository()) return;
    const gitignorePath = path.join(this.workspaceRoot, '.gitignore');
    const current = existsSync(gitignorePath) ? readFileSync(gitignorePath, 'utf8') : '';
    const next = addCodeGraphToGitignore(current);
    if (next !== current) writeFileSync(gitignorePath, next, 'utf8');
  }

  private loadRuntimeModules(): CodeGraphRuntimeModules {
    if (this.modules) return this.modules;
    const runtimeRequire = createRequire(__filename);
    const platformRoot = this.resolvePlatformRoot(runtimeRequire);
    const library = runtimeRequire(path.join(platformRoot, 'lib', 'dist', 'index.js')) as unknown;
    const toolModule = runtimeRequire(
      path.join(platformRoot, 'lib', 'dist', 'mcp', 'tools.js'),
    ) as { ToolHandler?: ToolHandlerClass };
    const CodeGraph = resolveCodeGraphClass(library);
    if (!toolModule.ToolHandler) throw new Error('The bundled CodeGraph tool handler is missing.');
    this.modules = { CodeGraph, ToolHandler: toolModule.ToolHandler };
    return this.modules;
  }

  private resolvePlatformRoot(runtimeRequire: NodeJS.Require): string {
    const packaged = this.options.extensionRoot
      ? path.join(this.options.extensionRoot, 'dist', 'codegraph')
      : undefined;
    if (packaged && existsSync(path.join(packaged, 'package.json'))) return packaged;
    const packageJson = runtimeRequire.resolve('@colbymchenry/codegraph/package.json');
    const packageRequire = createRequire(packageJson);
    const platformPackage = `@colbymchenry/codegraph-${process.platform}-${process.arch}`;
    return path.dirname(packageRequire.resolve(`${platformPackage}/package.json`));
  }

  private async spawnCli(args: readonly string[], signal?: AbortSignal): Promise<string> {
    const runtimeRequire = createRequire(__filename);
    const platformRoot = this.resolvePlatformRoot(runtimeRequire);
    const command =
      process.platform === 'win32'
        ? path.join(platformRoot, 'node.exe')
        : path.join(platformRoot, 'bin', 'codegraph');
    const commandArgs =
      process.platform === 'win32'
        ? ['--liftoff-only', path.join(platformRoot, 'lib', 'dist', 'bin', 'codegraph.js'), ...args]
        : [...args];
    return spawnCodeGraph(command, commandArgs, this.workspaceRoot, signal);
  }

  private cancelScheduledSync(): void {
    if (this.syncTimer) clearTimeout(this.syncTimer);
    this.syncTimer = undefined;
  }
}

function resolveCodeGraphClass(library: unknown): CodeGraphClass {
  if (typeof library === 'function') return library as CodeGraphClass;
  if (typeof library !== 'object' || library === null) {
    throw new Error('The bundled CodeGraph library could not be loaded.');
  }
  const record = library as Record<string, unknown>;
  const candidate = record.CodeGraph ?? record.default;
  if (typeof candidate === 'function') return candidate as CodeGraphClass;
  if (typeof candidate === 'object' && candidate !== null) {
    const nested = candidate as Record<string, unknown>;
    const nestedCandidate = nested.CodeGraph ?? nested.default;
    if (typeof nestedCandidate === 'function') return nestedCandidate as CodeGraphClass;
  }
  throw new Error('The bundled CodeGraph class could not be loaded.');
}

function parseCliStatus(output: string): CliStatus {
  const start = output.indexOf('{');
  const end = output.lastIndexOf('}');
  if (start < 0 || end < start) throw new Error('CodeGraph returned an invalid status response.');
  return JSON.parse(output.slice(start, end + 1)) as CliStatus;
}

function spawnCodeGraph(
  command: string,
  args: readonly string[],
  cwd: string,
  signal?: AbortSignal,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: {
        ...process.env,
        CODEGRAPH_TELEMETRY: process.env.CODEGRAPH_TELEMETRY ?? '0',
        DO_NOT_TRACK: process.env.DO_NOT_TRACK ?? '1',
      },
      windowsHide: true,
    });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    let bytes = 0;
    const collect = (target: Buffer[]) => (chunk: Buffer) => {
      bytes += chunk.length;
      if (bytes > 2_000_000) {
        child.kill('SIGTERM');
        reject(new Error('CodeGraph output exceeded the 2 MB safety limit.'));
        return;
      }
      target.push(chunk);
    };
    child.stdout.on('data', collect(stdout));
    child.stderr.on('data', collect(stderr));
    const abort = () => child.kill('SIGTERM');
    signal?.addEventListener('abort', abort, { once: true });
    child.on('error', reject);
    child.on('close', (code) => {
      signal?.removeEventListener('abort', abort);
      if (signal?.aborted) {
        reject(new Error('The code-graph query was stopped.'));
        return;
      }
      const output = Buffer.concat(stdout).toString('utf8').trim();
      const error = Buffer.concat(stderr).toString('utf8').trim();
      if (code === 0) resolve(output);
      else reject(new Error(error || output || `CodeGraph exited with code ${code}.`));
    });
  });
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
