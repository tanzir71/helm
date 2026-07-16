import { isWebviewToHostMessage, type WebviewAuditMode, type WebviewAuditResult } from '@helm/core';
import * as vscode from 'vscode';

import { SessionManager } from './session-manager.js';

export class HelmViewProvider implements vscode.WebviewViewProvider, vscode.Disposable {
  static readonly viewType = 'helm.chatView';
  private session?: SessionManager;

  constructor(private readonly context: vscode.ExtensionContext) {}

  dispose(): void {
    this.session?.dispose();
  }

  async testMockTurn(text: string): Promise<string | undefined> {
    if (!this.session) throw new Error('Helm chat view is not ready.');
    await this.session.handle({ type: 'userMessage', id: crypto.randomUUID(), text });
    return this.session.lastAssistantText();
  }

  async testSteerAtToolBoundary(): Promise<string | undefined> {
    if (!this.session) throw new Error('Helm chat view is not ready.');
    return this.session.testSteerAtToolBoundary();
  }

  async testQueueSteerStop(): Promise<{
    preservedQueue: string[];
    resumedText?: string;
  }> {
    if (!this.session) throw new Error('Helm chat view is not ready.');
    return this.session.testQueueSteerStop();
  }

  async testTwoFileEdit(): Promise<{ output: string; changed: boolean; restored: boolean }> {
    if (!this.session) throw new Error('Helm chat view is not ready.');
    return this.session.testTwoFileEdit();
  }

  async testPlanExecution(): Promise<{
    completed: boolean[];
    persisted: boolean[];
    turns: string[];
  }> {
    if (!this.session) throw new Error('Helm chat view is not ready.');
    return this.session.testPlanExecution();
  }

  async testSoloWorkflow(): Promise<{
    planned: boolean;
    goalBeforeApproval: string | undefined;
    goalAfterApproval: string | undefined;
    turns: string[];
  }> {
    if (!this.session) throw new Error('Helm chat view is not ready.');
    return this.session.testSoloWorkflow();
  }

  async testWebviewAudit(mode: WebviewAuditMode): Promise<WebviewAuditResult> {
    if (!this.session) throw new Error('Helm chat view is not ready.');
    return await this.session.testWebviewAudit(mode);
  }

  resolveWebviewView(view: vscode.WebviewView): void {
    view.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.context.extensionUri],
    };
    view.webview.html = this.getHtml(view.webview);
    this.session?.dispose();
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri;
    if (!workspaceRoot) {
      void view.webview.postMessage({
        type: 'error',
        message: 'Open a folder or workspace before using Helm.',
      });
      return;
    }
    this.session = new SessionManager(this.context, view.webview, workspaceRoot);
    view.webview.onDidReceiveMessage((message: unknown) => {
      if (!isWebviewToHostMessage(message)) return;
      void this.session?.handle(message).catch((error: unknown) => {
        void view.webview.postMessage({
          type: 'error',
          message: error instanceof Error ? error.message : String(error),
        });
      });
    });
  }

  private getHtml(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview', 'assets', 'index.js'),
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview', 'assets', 'index.css'),
    );
    const nonce = getNonce();
    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; font-src ${webview.cspSource}; img-src ${webview.cspSource} https: data:; script-src ${webview.cspSource} 'nonce-${nonce}';" />
  <link href="${styleUri}" rel="stylesheet" />
  <title>Helm</title>
</head>
<body>
  <div id="root"></div>
  <script nonce="${nonce}" type="module" src="${scriptUri}"></script>
</body>
</html>`;
  }
}

function getNonce(): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from(
    { length: 32 },
    () => alphabet[Math.floor(Math.random() * alphabet.length)],
  ).join('');
}
