import * as vscode from 'vscode';

import { HelmViewProvider } from './view-provider.js';

export function activate(context: vscode.ExtensionContext): void {
  const provider = new HelmViewProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(HelmViewProvider.viewType, provider, {
      webviewOptions: { retainContextWhenHidden: true },
    }),
    vscode.commands.registerCommand('helm.openChat', async () => {
      await vscode.commands.executeCommand('workbench.view.extension.helm');
    }),
  );
}

export function deactivate(): void {}
