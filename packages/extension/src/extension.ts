import * as vscode from 'vscode';

import { HelmViewProvider } from './view-provider.js';

export function activate(context: vscode.ExtensionContext): void {
  const provider = new HelmViewProvider(context);
  context.subscriptions.push(
    provider,
    vscode.window.registerWebviewViewProvider(HelmViewProvider.viewType, provider, {
      webviewOptions: { retainContextWhenHidden: true },
    }),
    vscode.commands.registerCommand('helm.openChat', async () => {
      await vscode.commands.executeCommand('workbench.view.extension.helm');
    }),
  );
  if (process.env.HELM_MOCK_PROVIDER === '1') {
    context.subscriptions.push(
      vscode.commands.registerCommand('helm.testMockTurn', async (text: string) => {
        await vscode.commands.executeCommand('workbench.view.extension.helm');
        await new Promise((resolve) => setTimeout(resolve, 500));
        return provider.testMockTurn(text);
      }),
    );
  }
}

export function deactivate(): void {}
