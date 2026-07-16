import { spawn } from 'node:child_process';
import path from 'node:path';

import {
  createSearchProvider,
  fetchReadableWebPage,
  formatSearchResults,
  type ApprovalMode,
  type HostToWebviewMessage,
  type ToolHost,
  type ToolName,
  type WebSearchProviderId,
} from '@helm/core';
import * as vscode from 'vscode';

import {
  allowedDomains,
  commandAllowPattern,
  domainAllowPattern,
  isCommandAllowed,
  isDomainAllowed as matchesAllowedDomain,
} from './allow-patterns.js';
import { isDeniedCommand } from './safety.js';

type PostMessage = (message: HostToWebviewMessage) => void;

export interface WebRuntimeConfig {
  apiKey?: string;
  enabled: boolean;
  provider: WebSearchProviderId;
}

export interface ExtensionToolHostOptions {
  allowPatterns?: string[];
  onAllowPatternsChanged?: (patterns: string[]) => void;
  webConfig: () => Promise<WebRuntimeConfig>;
}

interface PendingApproval {
  alwaysAllowPattern?: string;
  finish: (accepted: boolean) => void;
}

interface PendingDiff {
  id: string;
  relativePath: string;
  uri: vscode.Uri;
  before: string;
  after: string;
  resolve: (accepted: boolean) => void;
}

interface Checkpoint {
  label: string;
  uri: vscode.Uri;
  turnId: string;
  before?: Uint8Array;
}

class DiffContentProvider implements vscode.TextDocumentContentProvider {
  private readonly content = new Map<string, string>();

  provideTextDocumentContent(uri: vscode.Uri): string {
    return this.content.get(uri.toString()) ?? '';
  }

  set(uri: vscode.Uri, content: string): void {
    this.content.set(uri.toString(), content);
  }
}

export class ExtensionToolHost implements ToolHost, vscode.Disposable {
  private readonly approvals = new Map<string, PendingApproval>();
  private readonly diffs = new Map<string, PendingDiff>();
  private readonly alwaysAllowed: Set<string>;
  private readonly checkpoints: Checkpoint[] = [];
  private readonly diffProvider = new DiffContentProvider();
  private readonly disposables: vscode.Disposable[];
  private lastTerminalOutput = '';
  private turnId = 'unscoped';

  constructor(
    private readonly workspaceRoot: vscode.Uri,
    private readonly storageUri: vscode.Uri,
    private readonly post: PostMessage,
    private readonly skillBody: (name: string) => Promise<string>,
    private readonly options: ExtensionToolHostOptions,
  ) {
    this.alwaysAllowed = new Set(options.allowPatterns ?? []);
    this.disposables = [
      vscode.workspace.registerTextDocumentContentProvider('helm-diff', this.diffProvider),
    ];
  }

  async loadSkill(name: string): Promise<string> {
    return this.skillBody(name);
  }

  terminalOutput(): string {
    return this.lastTerminalOutput;
  }

  beginTurn(turnId: string): void {
    this.turnId = turnId;
  }

  hasCheckpointForTurn(turnId: string): boolean {
    return this.checkpoints.some((checkpoint) => checkpoint.turnId === turnId);
  }

  dispose(): void {
    for (const disposable of this.disposables) disposable.dispose();
  }

  approve(callId: string, alwaysAllowPattern?: string): void {
    const pending = this.approvals.get(callId);
    if (
      alwaysAllowPattern &&
      pending?.alwaysAllowPattern &&
      alwaysAllowPattern === pending.alwaysAllowPattern
    ) {
      this.alwaysAllowed.add(alwaysAllowPattern);
      this.options.onAllowPatternsChanged?.([...this.alwaysAllowed].sort());
    }
    pending?.finish(true);
    this.approvals.delete(callId);
  }

  reject(callId: string): void {
    this.approvals.get(callId)?.finish(false);
    this.approvals.delete(callId);
  }

  allowedDomains(): string[] {
    return allowedDomains(this.alwaysAllowed);
  }

  removeAllowedDomain(domain: string): void {
    this.alwaysAllowed.delete(`domain:${domain}`);
    this.options.onAllowPatternsChanged?.([...this.alwaysAllowed].sort());
  }

  resolveDiff(diffId: string, accepted: boolean): void {
    const pending = this.diffs.get(diffId);
    pending?.resolve(accepted);
  }

  async openDiff(diffId: string): Promise<void> {
    const pending = this.diffs.get(diffId);
    if (!pending) return;
    await this.showDiff(diffId, pending.relativePath, pending.before, pending.after);
  }

  async acceptNextPendingDiffForTest(timeoutMs = 5_000): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const diffId = this.diffs.keys().next().value as string | undefined;
      if (diffId) {
        this.resolveDiff(diffId, true);
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    throw new Error('Timed out waiting for Helm to propose a diff.');
  }

  async undoLast(): Promise<boolean> {
    const checkpoint = this.checkpoints.pop();
    if (!checkpoint) return false;
    await this.restoreCheckpoint(checkpoint);
    return true;
  }

  async restoreLastTurn(): Promise<boolean> {
    const turnId = this.checkpoints.at(-1)?.turnId;
    if (!turnId) return false;
    while (this.checkpoints.at(-1)?.turnId === turnId) {
      const checkpoint = this.checkpoints.pop();
      if (checkpoint) await this.restoreCheckpoint(checkpoint);
    }
    return true;
  }

  private async restoreCheckpoint(checkpoint: Checkpoint): Promise<void> {
    if (checkpoint.before) {
      await vscode.workspace.fs.writeFile(checkpoint.uri, checkpoint.before);
    } else {
      try {
        await vscode.workspace.fs.delete(checkpoint.uri);
      } catch {
        // The proposed new file may already have been removed.
      }
    }
  }

  async execute(
    toolName: Exclude<ToolName, 'use_skill'>,
    input: Record<string, unknown>,
    context: { mode: ApprovalMode; callId: string; signal?: AbortSignal },
  ): Promise<unknown> {
    switch (toolName) {
      case 'read_file':
        return this.readFile(input);
      case 'list_dir':
        return this.listDir(input);
      case 'glob':
        return this.glob(input);
      case 'grep':
        return this.grep(input, context.signal);
      case 'write_file':
        return this.writeFile(input, context);
      case 'edit_file':
        return this.editFile(input, context);
      case 'run_command':
        return this.runCommand(input, context);
      case 'fetch_url':
        return this.fetchUrl(input, context.signal);
      case 'web_search':
        return this.webSearch(input, context.signal);
      case 'web_fetch':
        return this.webFetch(input, context);
    }
  }

  private async readFile(input: Record<string, unknown>): Promise<string> {
    const uri = this.workspaceUri(String(input.path));
    const content = new TextDecoder().decode(await vscode.workspace.fs.readFile(uri));
    const lines = content.split(/\r?\n/u);
    const start = Math.max(1, Number(input.start_line ?? 1));
    const end = Math.min(lines.length, Number(input.end_line ?? lines.length));
    return lines
      .slice(start - 1, end)
      .map((line, index) => `${start + index}: ${line}`)
      .join('\n');
  }

  private async listDir(input: Record<string, unknown>): Promise<string> {
    const uri = this.workspaceUri(String(input.path));
    const entries = await vscode.workspace.fs.readDirectory(uri);
    return entries
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([name, type]) => `${type === vscode.FileType.Directory ? 'dir' : 'file'}\t${name}`)
      .join('\n');
  }

  private async glob(input: Record<string, unknown>): Promise<string> {
    const base =
      typeof input.path === 'string' && input.path !== '.'
        ? `${input.path.replace(/\/$/u, '')}/`
        : '';
    const pattern = new vscode.RelativePattern(
      this.workspaceRoot,
      `${base}${String(input.pattern)}`,
    );
    const files = await vscode.workspace.findFiles(
      pattern,
      '**/{node_modules,.git,dist}/**',
      2_000,
    );
    return files.map((uri) => path.relative(this.workspaceRoot.fsPath, uri.fsPath)).join('\n');
  }

  private async grep(input: Record<string, unknown>, signal?: AbortSignal): Promise<string> {
    const query = String(input.query);
    const base =
      typeof input.path === 'string' && input.path !== '.'
        ? `${input.path.replace(/\/$/u, '')}/`
        : '';
    const fileGlob = typeof input.glob === 'string' ? input.glob : '**/*';
    const searchRoot = this.workspaceUri(typeof input.path === 'string' ? input.path : '.');
    try {
      return await grepWithRipgrep(
        query,
        this.workspaceRoot.fsPath,
        path.relative(this.workspaceRoot.fsPath, searchRoot.fsPath) || '.',
        fileGlob,
        signal,
      );
    } catch (error) {
      if (signal?.aborted) throw new Error('Search was stopped.');
      if (!(error instanceof Error) || !error.message.includes('ENOENT')) throw error;
    }
    const files = await vscode.workspace.findFiles(
      new vscode.RelativePattern(this.workspaceRoot, `${base}${fileGlob}`),
      '**/{node_modules,.git,dist}/**',
      1_000,
    );
    const results: string[] = [];
    for (const uri of files) {
      if (signal?.aborted) throw new Error('Search was stopped.');
      if (results.length >= 500) break;
      let content: string;
      try {
        content = new TextDecoder().decode(await vscode.workspace.fs.readFile(uri));
      } catch {
        continue;
      }
      content.split(/\r?\n/u).forEach((line, index) => {
        if (line.includes(query) && results.length < 500) {
          results.push(
            `${path.relative(this.workspaceRoot.fsPath, uri.fsPath)}:${index + 1}:${line}`,
          );
        }
      });
    }
    return results.join('\n');
  }

  private async writeFile(
    input: Record<string, unknown>,
    context: { mode: ApprovalMode; signal?: AbortSignal },
  ): Promise<string> {
    const relativePath = String(input.path);
    const uri = this.workspaceUri(relativePath);
    const before = await this.tryRead(uri);
    const after = String(input.content);
    await this.proposeDiff(relativePath, uri, before, after, context.mode, context.signal);
    return `Updated ${relativePath}`;
  }

  private async editFile(
    input: Record<string, unknown>,
    context: { mode: ApprovalMode; signal?: AbortSignal },
  ): Promise<string> {
    const relativePath = String(input.path);
    const uri = this.workspaceUri(relativePath);
    const before = await this.tryRead(uri);
    const oldText = String(input.old_text);
    if (!before.includes(oldText)) throw new Error(`Exact text was not found in ${relativePath}.`);
    if (before.split(oldText).length !== 2)
      throw new Error(`Exact text occurs more than once in ${relativePath}.`);
    const after = before.replace(oldText, String(input.new_text));
    await this.proposeDiff(relativePath, uri, before, after, context.mode, context.signal);
    return `Edited ${relativePath}`;
  }

  private async proposeDiff(
    relativePath: string,
    uri: vscode.Uri,
    before: string,
    after: string,
    mode: ApprovalMode,
    signal?: AbortSignal,
  ): Promise<void> {
    const diffId = crypto.randomUUID();
    await this.showDiff(diffId, relativePath, before, after);
    let accepted = mode === 'fullAccess';
    if (!accepted) {
      accepted = await new Promise<boolean>((resolve) => {
        const finish = (decision: boolean) => {
          signal?.removeEventListener('abort', abort);
          resolve(decision);
        };
        const abort = () => finish(false);
        this.diffs.set(diffId, { id: diffId, relativePath, uri, before, after, resolve: finish });
        if (signal?.aborted) {
          finish(false);
        } else {
          signal?.addEventListener('abort', abort, { once: true });
          this.post({ type: 'diffProposed', diffId, path: relativePath, before, after });
        }
      });
      this.diffs.delete(diffId);
    }
    if (!accepted) throw new Error(`User rejected the proposed change to ${relativePath}.`);
    await this.checkpoint(relativePath, uri, before);
    await vscode.workspace.fs.createDirectory(vscode.Uri.joinPath(uri, '..'));
    await vscode.workspace.fs.writeFile(uri, new TextEncoder().encode(after));
    this.post({
      type: 'suggestionAvailable',
      item: { kind: 'undo', label: `Undo ${relativePath}` },
    });
  }

  private async showDiff(
    diffId: string,
    relativePath: string,
    before: string,
    after: string,
  ): Promise<void> {
    const beforeUri = vscode.Uri.parse(
      `helm-diff:/before/${diffId}/${encodeURIComponent(relativePath)}`,
    );
    const afterUri = vscode.Uri.parse(
      `helm-diff:/after/${diffId}/${encodeURIComponent(relativePath)}`,
    );
    this.diffProvider.set(beforeUri, before);
    this.diffProvider.set(afterUri, after);
    await vscode.commands.executeCommand(
      'vscode.diff',
      beforeUri,
      afterUri,
      `Helm: ${relativePath}`,
    );
  }

  private async checkpoint(label: string, uri: vscode.Uri, before: string): Promise<void> {
    const existed = before.length > 0 || (await this.exists(uri));
    const bytes = existed ? new TextEncoder().encode(before) : undefined;
    this.checkpoints.push({ label, uri, turnId: this.turnId, ...(bytes ? { before: bytes } : {}) });
    const checkpointDirectory = vscode.Uri.joinPath(this.storageUri, 'checkpoints');
    await vscode.workspace.fs.createDirectory(checkpointDirectory);
    if (bytes) {
      const safeName = `${Date.now()}-${label.replace(/[^a-z0-9._-]/giu, '_')}`;
      await vscode.workspace.fs.writeFile(
        vscode.Uri.joinPath(checkpointDirectory, safeName),
        bytes,
      );
    }
  }

  private async runCommand(
    input: Record<string, unknown>,
    context: { mode: ApprovalMode; callId: string; signal?: AbortSignal },
  ): Promise<string> {
    const command = String(input.command);
    if (isDeniedCommand(command))
      throw new Error('Helm blocked a dangerous command, even in Full Access mode.');
    if (context.mode === 'agent' && !this.isAlwaysAllowed(command)) {
      const alwaysAllowPattern = commandAllowPattern(command);
      this.post({
        type: 'toolApprovalRequested',
        callId: context.callId,
        tool: 'run_command',
        summary: command,
        alwaysAllowPattern,
      });
      const accepted = await new Promise<boolean>((resolve) => {
        const finish = (decision: boolean) => {
          context.signal?.removeEventListener('abort', abort);
          resolve(decision);
        };
        const abort = () => finish(false);
        this.approvals.set(context.callId, { finish, alwaysAllowPattern });
        if (context.signal?.aborted) finish(false);
        else context.signal?.addEventListener('abort', abort, { once: true });
      });
      this.approvals.delete(context.callId);
      if (!accepted) throw new Error('User rejected the command.');
    }
    const cwd = typeof input.cwd === 'string' ? this.workspaceUri(input.cwd) : this.workspaceRoot;
    return this.executeInTerminal(command, cwd, context.signal);
  }

  private isAlwaysAllowed(command: string): boolean {
    return isCommandAllowed(this.alwaysAllowed, command);
  }

  private async executeInTerminal(
    command: string,
    cwd: vscode.Uri,
    signal?: AbortSignal,
  ): Promise<string> {
    const terminal = vscode.window.createTerminal({ name: 'Helm', cwd });
    terminal.show(true);
    const integration =
      terminal.shellIntegration ?? (await waitForShellIntegration(terminal, 2_000));
    if (!integration) {
      this.lastTerminalOutput = await executeFallback(command, cwd.fsPath, signal);
      return this.lastTerminalOutput;
    }
    const execution = integration.executeCommand(command);
    const output: string[] = [];
    const abort = () => terminal.sendText('\u0003', false);
    signal?.addEventListener('abort', abort, { once: true });
    try {
      for await (const chunk of execution.read()) output.push(chunk);
      this.lastTerminalOutput = stripAnsi(output.join('')).slice(-200_000);
      return this.lastTerminalOutput;
    } finally {
      signal?.removeEventListener('abort', abort);
    }
  }

  private async fetchUrl(input: Record<string, unknown>, signal?: AbortSignal): Promise<string> {
    return fetchReadableWebPage(String(input.url), signal);
  }

  private async webSearch(input: Record<string, unknown>, signal?: AbortSignal): Promise<string> {
    const config = await this.options.webConfig();
    if (!config.enabled) throw new Error('Built-in web tools are disabled in Settings.');
    const provider = createSearchProvider(config.provider, {
      ...(config.apiKey ? { apiKey: config.apiKey } : {}),
    });
    const results = await provider.search(
      String(input.query),
      Number(input.max_results ?? 5),
      signal,
    );
    return formatSearchResults(provider.id, results);
  }

  private async webFetch(
    input: Record<string, unknown>,
    context: { mode: ApprovalMode; callId: string; signal?: AbortSignal },
  ): Promise<string> {
    const config = await this.options.webConfig();
    if (!config.enabled) throw new Error('Built-in web tools are disabled in Settings.');
    const url = new URL(String(input.url));
    const domain = url.hostname.toLowerCase();
    if (context.mode === 'agent' && !this.isDomainAllowed(domain)) {
      const alwaysAllowPattern = domainAllowPattern(domain);
      this.post({
        type: 'toolApprovalRequested',
        callId: context.callId,
        tool: 'web_fetch',
        summary: `Fetch ${url.toString()}`,
        alwaysAllowPattern,
      });
      const accepted = await new Promise<boolean>((resolve) => {
        const finish = (decision: boolean) => {
          context.signal?.removeEventListener('abort', abort);
          resolve(decision);
        };
        const abort = () => finish(false);
        this.approvals.set(context.callId, { finish, alwaysAllowPattern });
        if (context.signal?.aborted) finish(false);
        else context.signal?.addEventListener('abort', abort, { once: true });
      });
      this.approvals.delete(context.callId);
      if (!accepted) throw new Error('User rejected the web fetch.');
    }
    return fetchReadableWebPage(url.toString(), context.signal);
  }

  private isDomainAllowed(domain: string): boolean {
    return matchesAllowedDomain(this.alwaysAllowed, domain);
  }

  private workspaceUri(relativePath: string): vscode.Uri {
    const resolved = path.resolve(this.workspaceRoot.fsPath, relativePath || '.');
    const relative = path.relative(this.workspaceRoot.fsPath, resolved);
    if (relative.startsWith('..') || path.isAbsolute(relative))
      throw new Error('Path is outside the workspace.');
    return vscode.Uri.file(resolved);
  }

  private async tryRead(uri: vscode.Uri): Promise<string> {
    try {
      return new TextDecoder().decode(await vscode.workspace.fs.readFile(uri));
    } catch {
      return '';
    }
  }

  private async exists(uri: vscode.Uri): Promise<boolean> {
    try {
      await vscode.workspace.fs.stat(uri);
      return true;
    } catch {
      return false;
    }
  }
}

async function waitForShellIntegration(
  terminal: vscode.Terminal,
  timeoutMs: number,
): Promise<vscode.TerminalShellIntegration | undefined> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      subscription.dispose();
      resolve(undefined);
    }, timeoutMs);
    const subscription = vscode.window.onDidChangeTerminalShellIntegration((event) => {
      if (event.terminal !== terminal) return;
      clearTimeout(timer);
      subscription.dispose();
      resolve(event.shellIntegration);
    });
  });
}

async function executeFallback(
  command: string,
  cwd: string,
  signal?: AbortSignal,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn('/bin/zsh', ['-lc', command], { cwd, env: process.env });
    const output: Buffer[] = [];
    const errors: Buffer[] = [];
    child.stdout.on('data', (chunk: Buffer) => output.push(chunk));
    child.stderr.on('data', (chunk: Buffer) => errors.push(chunk));
    const abort = () => child.kill('SIGTERM');
    signal?.addEventListener('abort', abort, { once: true });
    child.on('error', reject);
    child.on('close', (code) => {
      signal?.removeEventListener('abort', abort);
      const combined = Buffer.concat([...output, ...errors])
        .toString('utf8')
        .slice(-200_000);
      if (code === 0) resolve(combined);
      else reject(new Error(`Command exited with code ${code}.\n${combined}`));
    });
  });
}

function stripAnsi(value: string): string {
  const ansiPattern = new RegExp(`${String.fromCharCode(27)}\\[[0-?]*[ -/]*[@-~]`, 'gu');
  return value.replace(ansiPattern, '');
}

async function grepWithRipgrep(
  query: string,
  cwd: string,
  searchPath: string,
  glob: string,
  signal?: AbortSignal,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      'rg',
      [
        '--line-number',
        '--no-heading',
        '--color',
        'never',
        '--fixed-strings',
        '--glob',
        glob,
        '--',
        query,
        searchPath,
      ],
      { cwd, env: process.env },
    );
    const output: Buffer[] = [];
    const errors: Buffer[] = [];
    child.stdout.on('data', (chunk: Buffer) => output.push(chunk));
    child.stderr.on('data', (chunk: Buffer) => errors.push(chunk));
    const abort = () => child.kill('SIGTERM');
    signal?.addEventListener('abort', abort, { once: true });
    child.on('error', reject);
    child.on('close', (code) => {
      signal?.removeEventListener('abort', abort);
      const text = Buffer.concat(output).toString('utf8').split(/\r?\n/u).slice(0, 500).join('\n');
      if (code === 0 || code === 1) resolve(text);
      else reject(new Error(Buffer.concat(errors).toString('utf8') || `rg exited with ${code}`));
    });
  });
}
