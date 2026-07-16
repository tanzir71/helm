import { homedir } from 'node:os';
import path from 'node:path';

import {
  AgentRunner,
  ContextManager,
  createMockResolvedModel,
  loadAgentInstructions,
  parseSlashCommand,
  ProviderRegistry,
  SkillLoader,
  STATIC_MODELS,
  SteerQueue,
  type AgentMessage,
  type ApprovalMode,
  type ChatMessage,
  type HostToWebviewMessage,
  type ProviderId,
  type ResolvedModel,
  type SessionSettings,
  type WebviewToHostMessage,
} from '@helm/core';
import * as vscode from 'vscode';

import { ExtensionToolHost } from './tool-host.js';

interface StoredSession {
  messages: ChatMessage[];
  provider: ProviderId;
  modelId: string;
  mode: ApprovalMode;
  baseURL?: string;
  goal?: string;
  autoContext?: boolean;
  reasoningEffort?: 'low' | 'medium' | 'high';
  usage?: { tokens: number; cost: number };
}

const SESSION_KEY = 'helm.session.v1';
const FULL_ACCESS_KEY = 'helm.fullAccessConfirmed';

export class SessionManager implements vscode.Disposable {
  private readonly runner = new AgentRunner();
  private readonly registry = new ProviderRegistry();
  private readonly queue = new SteerQueue();
  private readonly skills = new SkillLoader();
  private readonly toolHost: ExtensionToolHost;
  private readonly statusBar: vscode.StatusBarItem;
  private session: StoredSession;
  private controller: AbortController | undefined;
  private running = false;
  private disposed = false;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly webview: vscode.Webview,
    private readonly workspaceRoot: vscode.Uri,
  ) {
    this.session = context.workspaceState.get<StoredSession>(SESSION_KEY) ?? {
      messages: [],
      provider: 'anthropic',
      modelId: 'claude-sonnet-4-5',
      mode: 'agent',
    };
    this.toolHost = new ExtensionToolHost(
      workspaceRoot,
      context.globalStorageUri,
      (message) => this.post(message),
      async (name) => (await this.skills.load(name)).body,
    );
    this.statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    this.statusBar.command = 'helm.openChat';
    this.statusBar.show();
    this.updateStatus();
    void this.discoverSkills();
  }

  dispose(): void {
    this.disposed = true;
    this.controller?.abort();
    this.toolHost.dispose();
    this.statusBar.dispose();
  }

  lastAssistantText(): string | undefined {
    for (let index = this.session.messages.length - 1; index >= 0; index -= 1) {
      const message = this.session.messages[index];
      if (message?.role === 'assistant') return message.text;
    }
    return undefined;
  }

  async handle(message: WebviewToHostMessage): Promise<void> {
    switch (message.type) {
      case 'webviewReady':
      case 'requestSession':
        await this.restore();
        break;
      case 'userMessage':
        await this.submit({ id: message.id, text: message.text });
        break;
      case 'queueMessage':
        this.queue.enqueue({ id: message.id, text: message.text });
        this.postQueue();
        break;
      case 'steerMessage':
        if (this.running) {
          this.queue.steer({ id: message.id, text: message.text });
        } else {
          await this.startTurn({ id: message.id, text: message.text });
        }
        break;
      case 'removeQueuedMessage':
        this.queue.remove(message.id);
        this.postQueue();
        break;
      case 'reorderQueue':
        this.queue.reorder(message.ids);
        this.postQueue();
        break;
      case 'stopRun':
        this.stop();
        break;
      case 'resumeQueue': {
        const next = this.queue.resume();
        this.postQueue();
        if (next) await this.startTurn(next);
        break;
      }
      case 'clearQueue':
        this.queue.clear();
        this.postQueue();
        break;
      case 'approveTool':
        this.toolHost.approve(message.callId, message.alwaysAllowPattern);
        break;
      case 'rejectTool':
        this.toolHost.reject(message.callId);
        break;
      case 'applyDiff':
        this.toolHost.resolveDiff(message.diffId, true);
        break;
      case 'rejectDiff':
        this.toolHost.resolveDiff(message.diffId, false);
        break;
      case 'undoLastChange':
        this.post(
          (await this.toolHost.undoLast())
            ? { type: 'suggestions', items: ['Run the tests', 'Show git diff'] }
            : { type: 'error', message: 'There is no Helm checkpoint to restore.' },
        );
        break;
      case 'restoreCheckpoint':
        this.post(
          (await this.toolHost.restoreLastTurn())
            ? { type: 'suggestions', items: ['Run the tests', 'Show git diff'] }
            : { type: 'error', message: 'There is no Helm turn checkpoint to restore.' },
        );
        break;
      case 'setMode':
        await this.setMode(message.mode);
        break;
      case 'confirmFullAccess':
        if (message.confirmed) {
          await this.context.workspaceState.update(FULL_ACCESS_KEY, true);
          this.session.mode = 'fullAccess';
          await this.persist();
        }
        this.postSettings();
        break;
      case 'saveApiKey':
        await this.context.secrets.store(secretKey(message.provider), message.key);
        this.postSettings();
        break;
      case 'saveProviderSettings':
        if (!isProviderId(message.provider)) break;
        this.session.provider = message.provider;
        this.session.modelId = message.modelId;
        if (message.baseURL) this.session.baseURL = message.baseURL;
        else delete this.session.baseURL;
        this.session.reasoningEffort = message.reasoningEffort;
        await this.persist();
        this.postSettings();
        break;
      case 'testConnection':
        await this.testConnection(message.provider, {
          ...(message.key ? { key: message.key } : {}),
          ...(message.modelId ? { modelId: message.modelId } : {}),
          ...(message.baseURL ? { baseURL: message.baseURL } : {}),
        });
        break;
      case 'requestModels':
        await this.requestModels(message.provider, message.baseURL, message.key);
        break;
      case 'requestContextItems':
        await this.requestContextItems(message.kind, message.query);
        break;
      case 'setAutoContext':
        this.session.autoContext = message.enabled;
        await this.persist();
        this.postSettings();
        break;
      case 'clearSession':
        this.session.messages = [];
        delete this.session.goal;
        await this.persist();
        await this.restore();
        break;
      case 'openSettings':
        this.postSettings();
        break;
    }
  }

  private async restore(): Promise<void> {
    this.post({ type: 'hello', version: '0.1.0' });
    this.post({
      type: 'sessionRestored',
      messages: this.session.messages,
      settings: this.settings(),
    });
    this.postQueue();
    this.postSettings();
  }

  private async submit(item: { id: string; text: string }): Promise<void> {
    if (this.running) {
      if (this.settings().enterBehavior === 'steer') this.queue.steer(item);
      else this.queue.enqueue(item);
      this.postQueue();
      return;
    }
    await this.startTurn(item);
  }

  private async startTurn(item: { id: string; text: string }): Promise<void> {
    const command = parseSlashCommand(item.text);
    if (command && (await this.handleImmediateCommand(command.command, command.argument))) return;
    const key = await this.context.secrets.get(secretKey(this.session.provider));
    let resolvedModel;
    try {
      resolvedModel =
        process.env.HELM_MOCK_PROVIDER === '1'
          ? createMockResolvedModel(`Mock received: ${item.text}`)
          : this.registry.resolve({
              provider: this.session.provider,
              modelId: this.session.modelId,
              ...(key ? { apiKey: key } : {}),
              ...(this.session.baseURL ? { baseURL: this.session.baseURL } : {}),
            });
    } catch (error) {
      this.post({
        type: 'error',
        message: error instanceof Error ? error.message : String(error),
        action: 'openSettings',
      });
      return;
    }

    await this.autoCompactIfNeeded(resolvedModel);
    const userMessage: ChatMessage = {
      id: item.id,
      role: 'user',
      text: item.text,
      createdAt: Date.now(),
    };
    this.session.messages.push(userMessage);
    this.post({ type: 'messageAdded', message: userMessage });
    const assistant: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      text: '',
      createdAt: Date.now(),
    };
    this.post({ type: 'assistantStarted', message: assistant });
    this.toolHost.beginTurn(assistant.id);
    this.running = true;
    this.controller = new AbortController();
    this.post({ type: 'runStateChanged', state: 'running' });
    this.updateStatus();

    let text = '';
    let reasoning = '';
    try {
      const instructions = await loadAgentInstructions(
        this.workspaceRoot.fsPath,
        vscode.window.activeTextEditor?.document.uri.fsPath ?? this.workspaceRoot.fsPath,
      );
      const prompt = this.commandPrompt(item.text, command?.command);
      const result = await this.runner.run({
        resolvedModel,
        prompt,
        history: this.historyBefore(userMessage.id),
        mode: this.session.mode,
        host: this.toolHost,
        signal: this.controller.signal,
        steerQueue: this.queue,
        agentsInstructions: instructions.map((file) => file.content).join('\n\n'),
        skillsIndex: this.skills.promptIndex(),
        ...(this.session.goal ? { goal: this.session.goal } : {}),
        context: await this.workspaceContext(item.text),
        reasoningEffort: this.session.reasoningEffort ?? 'medium',
        callbacks: {
          onText: (delta) => {
            text += delta;
            this.post({ type: 'assistantDelta', runId: assistant.id, text: delta });
          },
          onReasoning: (delta) => {
            reasoning += delta;
            this.post({ type: 'reasoningDelta', runId: assistant.id, text: delta });
          },
          onReasoningReplaced: (replacement) => {
            reasoning = replacement;
            this.post({ type: 'reasoningReplaced', runId: assistant.id, text: replacement });
          },
          onSteered: (steer) => this.post({ type: 'steered', id: steer.id, text: steer.text }),
          onStarted: (event) => this.post({ type: 'toolCallStarted', ...event }),
          onFinished: (event) => this.post({ type: 'toolCallFinished', ...event }),
          onLoopWarning: (warning, pause) =>
            this.post({ type: 'error', message: warning, ...(pause ? { action: 'resume' } : {}) }),
          onUsage: (usage) => {
            this.session.usage = {
              tokens: usage.inputTokens + usage.outputTokens,
              cost: usage.estimatedCost,
            };
            this.post({
              type: 'tokenUsage',
              input: usage.inputTokens,
              output: usage.outputTokens,
              estimatedCost: usage.estimatedCost,
            });
            this.updateStatus(usage.inputTokens + usage.outputTokens, usage.estimatedCost);
          },
        },
      });
      text = result.text;
      reasoning = result.reasoning;
      assistant.text = text;
      if (reasoning) assistant.reasoning = reasoning;
      this.session.messages.push(assistant);
      await this.persist();
      this.post({ type: 'assistantCompleted', id: assistant.id });
      this.post({
        type: 'suggestions',
        items: await this.generateSuggestions(resolvedModel, text, result.suggestions),
      });
      if (command?.command === 'plan')
        this.post({ type: 'planProposed', steps: extractPlan(text) });
    } catch (error) {
      const stopped = this.controller.signal.aborted;
      assistant.text = text;
      if (reasoning) assistant.reasoning = reasoning;
      if (stopped) assistant.interrupted = true;
      if (text || reasoning) this.session.messages.push(assistant);
      await this.persist();
      this.post({
        type: 'assistantCompleted',
        id: assistant.id,
        ...(stopped ? { interrupted: true } : {}),
      });
      if (!stopped) {
        const message = error instanceof Error ? error.message : String(error);
        this.post({
          type: 'error',
          message,
          ...(/key|401|unauthorized/iu.test(message) ? { action: 'openSettings' } : {}),
        });
      }
    } finally {
      if (this.toolHost.hasCheckpointForTurn(assistant.id)) {
        this.post({ type: 'checkpointAvailable', label: 'Restore turn checkpoint' });
      }
      this.running = false;
      this.controller = undefined;
      this.post({ type: 'runStateChanged', state: 'idle' });
      this.updateStatus();
      this.postQueue();
    }
    const next = this.queue.completeRun();
    if (next && !this.disposed) {
      this.postQueue();
      await this.startTurn(next);
    }
  }

  private stop(): void {
    if (!this.running) return;
    this.queue.stop();
    this.post({ type: 'runStateChanged', state: 'stopping' });
    this.controller?.abort();
  }

  private async handleImmediateCommand(command: string, argument: string): Promise<boolean> {
    if (command === 'goal') {
      if (!argument) {
        this.post({ type: 'error', message: 'Usage: /goal <what you want Helm to achieve>' });
        return true;
      }
      this.session.goal = argument;
      await this.persist();
      this.post({ type: 'goalChanged', goal: argument });
      this.postSettings();
      return true;
    }
    if (command === 'model') {
      this.postSettings();
      return true;
    }
    if (command === 'status') {
      const usage = this.session.usage ?? { tokens: 0, cost: 0 };
      await this.addLocalAssistant(
        `**Provider:** ${this.session.provider}/${this.session.modelId}\n\n**Mode:** ${this.session.mode}\n\n**Usage:** ${usage.tokens.toLocaleString()} tokens · ≈$${usage.cost.toFixed(4)}\n\n**Queue:** ${this.queue.length}\n\n**Skills:** ${
          this.skills
            .list()
            .map((skill) => skill.name)
            .join(', ') || 'none'
        }`,
      );
      return true;
    }
    if (command === 'help') {
      await this.addLocalAssistant(
        '`/plan` `/goal` `/review` `/init` `/model` `/status` `/compact` `/clear` `/help`',
      );
      return true;
    }
    if (command === 'clear') {
      this.post({ type: 'error', message: 'Clear this session?', action: 'confirmClear' });
      return true;
    }
    if (command === 'compact') {
      await this.compactSession();
      return true;
    }
    return false;
  }

  private commandPrompt(text: string, command?: string): string {
    if (command === 'plan')
      return `${text}\nProduce a numbered implementation plan only. Do not edit files or run commands. Wait for approval.`;
    if (command === 'review')
      return 'Review the current staged and unstaged git diff. Report findings by severity with file:line references.';
    if (command === 'init')
      return 'Inspect this repository and propose an AGENTS.md covering stack, commands, and conventions.';
    return text;
  }

  private async addLocalAssistant(text: string): Promise<void> {
    const message: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      text,
      createdAt: Date.now(),
    };
    this.session.messages.push(message);
    await this.persist();
    this.post({ type: 'messageAdded', message });
  }

  private async compactSession(): Promise<void> {
    const resolvedModel = await this.resolveSessionModel();
    const manager = new ContextManager(resolvedModel.profile);
    const compacted = await manager.compact(this.contextTurns(), (old) =>
      this.summarizeTurns(old, resolvedModel),
    );
    this.replaceContextTurns(compacted.turns);
    await this.persist();
    this.post({
      type: 'compacted',
      tokensBefore: compacted.tokensBefore,
      tokensAfter: compacted.tokensAfter,
    });
    await this.restore();
  }

  private async setMode(mode: ApprovalMode): Promise<void> {
    if (mode === 'fullAccess' && !this.context.workspaceState.get<boolean>(FULL_ACCESS_KEY)) {
      this.post({ type: 'fullAccessConfirmationRequired' });
      return;
    }
    this.session.mode = mode;
    await this.persist();
    this.postSettings();
  }

  private async testConnection(
    providerName: string,
    overrides: { key?: string; modelId?: string; baseURL?: string } = {},
  ): Promise<void> {
    if (!isProviderId(providerName)) return;
    const key = overrides.key ?? (await this.context.secrets.get(secretKey(providerName)));
    const modelId =
      overrides.modelId ??
      (providerName === this.session.provider
        ? this.session.modelId
        : STATIC_MODELS[providerName][0]?.id);
    if (!modelId) {
      this.post({
        type: 'connectionResult',
        provider: providerName,
        ok: false,
        message: 'Choose a model first.',
      });
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);
    try {
      const resolvedModel = this.registry.resolve({
        provider: providerName,
        modelId,
        ...(key ? { apiKey: key } : {}),
        ...(overrides.baseURL
          ? { baseURL: overrides.baseURL }
          : this.session.baseURL
            ? { baseURL: this.session.baseURL }
            : {}),
      });
      await this.runner.run({
        resolvedModel,
        prompt: 'Reply only with OK.',
        mode: 'chat',
        signal: controller.signal,
        maxSteps: 1,
      });
      this.post({
        type: 'connectionResult',
        provider: providerName,
        ok: true,
        message: 'Connection works.',
      });
    } catch (error) {
      this.post({
        type: 'connectionResult',
        provider: providerName,
        ok: false,
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      clearTimeout(timer);
    }
  }

  private async requestModels(
    providerName: string,
    baseURL?: string,
    providedKey?: string,
  ): Promise<void> {
    if (!isProviderId(providerName)) return;
    if (providerName === 'openrouter' || providerName === 'ollama') {
      try {
        const key = providedKey ?? (await this.context.secrets.get(secretKey(providerName)));
        const models = await this.registry.listModels(providerName, {
          ...(key ? { apiKey: key } : {}),
          ...(baseURL ? { baseURL } : {}),
        });
        this.post({ type: 'modelsUpdated', provider: providerName, models });
      } catch (error) {
        this.post({
          type: 'error',
          message: error instanceof Error ? error.message : String(error),
        });
      }
      return;
    }
    this.post({
      type: 'modelsUpdated',
      provider: providerName,
      models: [...STATIC_MODELS[providerName]],
    });
  }

  private async requestContextItems(kind: 'file' | 'folder', query: string): Promise<void> {
    const uris = await vscode.workspace.findFiles(
      '**/*',
      '**/{.git,node_modules,dist,coverage,.vscode-test}/**',
      600,
    );
    const paths = uris.map((uri) => path.relative(this.workspaceRoot.fsPath, uri.fsPath));
    const candidates =
      kind === 'file'
        ? paths
        : [...new Set(paths.flatMap((item) => folderAncestors(path.dirname(item))))];
    this.post({
      type: 'contextItems',
      kind,
      items: candidates
        .filter((item) => fuzzyIncludes(item, query))
        .sort((left, right) => fuzzyScore(left, query) - fuzzyScore(right, query))
        .slice(0, 40),
    });
  }

  private async workspaceContext(text: string): Promise<string> {
    const sections: string[] = [];
    const editor = vscode.window.activeTextEditor;
    if (editor && this.session.autoContext !== false) {
      const relative = path.relative(this.workspaceRoot.fsPath, editor.document.uri.fsPath);
      sections.push(`Active file: ${relative}`);
      const selection = editor.document.getText(editor.selection);
      if (selection) sections.push(`Active selection:\n${selection.slice(0, 20_000)}`);
    }
    if (text.includes('@problems')) {
      const diagnostics = vscode.languages
        .getDiagnostics()
        .flatMap(([uri, items]) =>
          items
            .slice(0, 100)
            .map(
              (item) =>
                `${path.relative(this.workspaceRoot.fsPath, uri.fsPath)}:${item.range.start.line + 1} ${item.message}`,
            ),
        );
      sections.push(`Problems:\n${diagnostics.join('\n')}`);
    }
    if (text.includes('@terminal'))
      sections.push(`Last terminal output:\n${this.toolHost.terminalOutput()}`);
    for (const match of text.matchAll(/@file:(?:"([^"]+)"|([^\s]+))/gu)) {
      try {
        const mentionedPath = match[1] ?? match[2] ?? '';
        const uri = this.contextUri(mentionedPath);
        sections.push(
          `File ${mentionedPath}:\n${new TextDecoder().decode(await vscode.workspace.fs.readFile(uri)).slice(0, 50_000)}`,
        );
      } catch {
        sections.push(`Mentioned file could not be read.`);
      }
    }
    for (const match of text.matchAll(/@folder:(?:"([^"]+)"|([^\s]+))/gu)) {
      try {
        const mentionedPath = match[1] ?? match[2] ?? '';
        sections.push(await this.folderContext(mentionedPath));
      } catch {
        sections.push(`Mentioned folder could not be read.`);
      }
    }
    return sections.join('\n\n');
  }

  private historyBefore(userId: string): AgentMessage[] {
    return this.session.messages
      .filter((message) => message.id !== userId && message.role !== 'system')
      .map((message) => ({ role: message.role as 'user' | 'assistant', content: message.text }));
  }

  private contextUri(relativePath: string): vscode.Uri {
    const resolved = path.resolve(this.workspaceRoot.fsPath, relativePath || '.');
    const relative = path.relative(this.workspaceRoot.fsPath, resolved);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      throw new Error('Mentioned path is outside the workspace.');
    }
    return vscode.Uri.file(resolved);
  }

  private async folderContext(relativePath: string): Promise<string> {
    const folder = this.contextUri(relativePath);
    const files = await vscode.workspace.findFiles(
      new vscode.RelativePattern(folder, '**/*'),
      '**/{.git,node_modules,dist,coverage,.vscode-test}/**',
      250,
    );
    const tree = files.map((uri) => path.relative(folder.fsPath, uri.fsPath)).sort();
    const keyFiles = files
      .filter((uri) =>
        /(?:^|\/)(?:readme(?:\.[^/]*)?|package\.json|tsconfig\.json|pyproject\.toml|cargo\.toml|go\.mod)$/iu.test(
          path.relative(folder.fsPath, uri.fsPath),
        ),
      )
      .slice(0, 8);
    const details: string[] = [];
    let remaining = 20_000;
    for (const uri of keyFiles) {
      if (remaining <= 0) break;
      const content = new TextDecoder().decode(await vscode.workspace.fs.readFile(uri));
      const excerpt = content.slice(0, Math.min(remaining, 6_000));
      remaining -= excerpt.length;
      details.push(`Key file ${path.relative(this.workspaceRoot.fsPath, uri.fsPath)}:\n${excerpt}`);
    }
    return [
      `Folder ${relativePath || '.'} tree:\n${tree.join('\n') || '(empty)'}`,
      ...details,
    ].join('\n\n');
  }

  private async discoverSkills(): Promise<void> {
    await this.skills.discover([
      path.join(this.workspaceRoot.fsPath, '.helm', 'skills'),
      path.join(homedir(), '.helm', 'skills'),
    ]);
  }

  private contextTurns(): Array<{ role: 'user' | 'assistant'; content: string }> {
    return this.session.messages
      .filter((message) => message.role !== 'system')
      .map((message) => ({ role: message.role as 'user' | 'assistant', content: message.text }));
  }

  private replaceContextTurns(
    turns: readonly { role: 'user' | 'assistant'; content: string }[],
  ): void {
    this.session.messages = turns.map((turn) => ({
      id: crypto.randomUUID(),
      role: turn.role,
      text: turn.content,
      createdAt: Date.now(),
    }));
  }

  private async autoCompactIfNeeded(resolvedModel: ResolvedModel): Promise<void> {
    const manager = new ContextManager(resolvedModel.profile);
    const turns = this.contextTurns();
    if (!manager.needsCompaction(turns)) return;
    const compacted = await manager.compact(turns, (old) =>
      this.summarizeTurns(old, resolvedModel),
    );
    this.replaceContextTurns(compacted.turns);
    await this.persist();
    this.post({
      type: 'compacted',
      tokensBefore: compacted.tokensBefore,
      tokensAfter: compacted.tokensAfter,
    });
  }

  private async summarizeTurns(
    turns: readonly { role: 'user' | 'assistant'; content: string }[],
    sessionModel: ResolvedModel,
  ): Promise<string> {
    const transcript = turns.map((turn) => `${turn.role}: ${turn.content}`).join('\n\n');
    try {
      const result = await this.runner.run({
        resolvedModel: await this.resolveUtilityModel(sessionModel),
        prompt:
          'Summarize this coding conversation for a future agent. Preserve decisions, changed files, pending work, commands, failures, and the user goal. Be concise and factual.\n\n' +
          transcript,
        mode: 'chat',
        maxSteps: 1,
      });
      if (result.text.trim()) return result.text.trim();
    } catch {
      // A utility-model failure must not lose the conversation. The deterministic extract below
      // is intentionally kept as a safe fallback.
    }
    return transcript.slice(0, 12_000);
  }

  private async generateSuggestions(
    sessionModel: ResolvedModel,
    assistantText: string,
    fallback: string[],
  ): Promise<string[]> {
    try {
      const result = await this.runner.run({
        resolvedModel: await this.resolveUtilityModel(sessionModel),
        prompt:
          'Suggest 2 to 4 useful next actions after the response below. Output only one action per line, at most 6 words each, no numbering.\n\n' +
          assistantText.slice(-12_000),
        mode: 'chat',
        maxSteps: 1,
      });
      const items = result.text
        .split(/\r?\n/u)
        .map((line) => line.replace(/^\s*(?:[-*]|\d+[.)])\s*/u, '').trim())
        .filter((line) => line.length > 0 && line.split(/\s+/u).length <= 6)
        .slice(0, 4);
      if (items.length >= 2) return items;
    } catch {
      // Suggestions are optional UI assistance; retain the heuristic fallback on any failure.
    }
    return fallback;
  }

  private async resolveSessionModel(): Promise<ResolvedModel> {
    if (process.env.HELM_MOCK_PROVIDER === '1') return createMockResolvedModel();
    const key = await this.context.secrets.get(secretKey(this.session.provider));
    return this.registry.resolve({
      provider: this.session.provider,
      modelId: this.session.modelId,
      ...(key ? { apiKey: key } : {}),
      ...(this.session.baseURL ? { baseURL: this.session.baseURL } : {}),
    });
  }

  private async resolveUtilityModel(sessionModel: ResolvedModel): Promise<ResolvedModel> {
    if (process.env.HELM_MOCK_PROVIDER === '1') return sessionModel;
    const configured = vscode.workspace
      .getConfiguration('helm')
      .get<string>('utilityModel', '')
      .trim();
    let provider: ProviderId | undefined;
    let modelId = '';
    if (configured) {
      const parsed = parseUtilityModel(configured, this.session.provider);
      provider = parsed.provider;
      modelId = parsed.modelId;
    } else {
      const deepSeekKey = await this.context.secrets.get(secretKey('deepseek'));
      if (deepSeekKey) {
        provider = 'deepseek';
        modelId = 'deepseek-v4-flash';
      }
    }
    if (!provider || !modelId) return sessionModel;
    try {
      const key = await this.context.secrets.get(secretKey(provider));
      return this.registry.resolve({
        provider,
        modelId,
        ...(key ? { apiKey: key } : {}),
        ...(provider === this.session.provider && this.session.baseURL
          ? { baseURL: this.session.baseURL }
          : {}),
      });
    } catch {
      return sessionModel;
    }
  }

  private async persist(): Promise<void> {
    await this.context.workspaceState.update(SESSION_KEY, this.session);
  }

  private settings(): SessionSettings {
    const enterBehavior = vscode.workspace
      .getConfiguration('helm')
      .get<'queue' | 'steer'>('enterBehavior', 'queue');
    return {
      provider: this.session.provider,
      modelId: this.session.modelId,
      mode: this.session.mode,
      enterBehavior,
      autoContext: this.session.autoContext !== false,
      reasoningEffort: this.session.reasoningEffort ?? 'medium',
      ...(this.session.baseURL ? { baseURL: this.session.baseURL } : {}),
      ...(this.session.goal ? { goal: this.session.goal } : {}),
    };
  }

  private async postSettings(): Promise<void> {
    const hasApiKey =
      this.session.provider === 'ollama' ||
      Boolean(await this.context.secrets.get(secretKey(this.session.provider)));
    this.post({ type: 'settingsChanged', settings: this.settings(), hasApiKey });
  }

  private postQueue(): void {
    this.post({ type: 'queueUpdated', items: [...this.queue.snapshot()] });
  }

  private post(message: HostToWebviewMessage): void {
    void this.webview.postMessage(message);
  }

  private updateStatus(
    tokens = this.session.usage?.tokens ?? 0,
    cost = this.session.usage?.cost ?? 0,
  ): void {
    const state = this.running ? '$(sync~spin)' : '$(compass)';
    this.statusBar.text = `${state} ${this.session.modelId} · ${this.session.mode}`;
    this.statusBar.tooltip = `Helm · ${tokens.toLocaleString()} tokens · ≈$${cost.toFixed(4)}`;
  }
}

function secretKey(provider: string): string {
  return `helm.apiKey.${provider}`;
}

function isProviderId(value: string): value is ProviderId {
  return value in STATIC_MODELS;
}

function extractPlan(text: string): string[] {
  return text
    .split(/\r?\n/u)
    .map((line) => /^\s*\d+[.)]\s+(.+)$/u.exec(line)?.[1])
    .filter((line): line is string => Boolean(line));
}

function parseUtilityModel(
  value: string,
  fallbackProvider: ProviderId,
): { provider: ProviderId; modelId: string } {
  const separator = value.indexOf('/');
  if (separator > 0) {
    const candidate = value.slice(0, separator);
    if (isProviderId(candidate)) {
      return { provider: candidate, modelId: value.slice(separator + 1) };
    }
  }
  return { provider: fallbackProvider, modelId: value };
}

function folderAncestors(folder: string): string[] {
  if (!folder || folder === '.') return [];
  const parts = folder.split(path.sep);
  return parts.map((_, index) => parts.slice(0, index + 1).join('/'));
}

function fuzzyIncludes(value: string, query: string): boolean {
  let index = 0;
  const normalized = value.toLowerCase();
  for (const character of query.toLowerCase()) {
    index = normalized.indexOf(character, index);
    if (index < 0) return false;
    index += 1;
  }
  return true;
}

function fuzzyScore(value: string, query: string): number {
  const normalized = value.toLowerCase();
  const exact = normalized.indexOf(query.toLowerCase());
  return exact >= 0 ? exact : value.length;
}
