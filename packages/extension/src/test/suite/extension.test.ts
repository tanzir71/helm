import assert from 'node:assert/strict';

import { describe, it } from 'mocha';
import * as vscode from 'vscode';

interface WebviewAuditResult {
  errors: string[];
  mainInteractiveCount: number;
  settingsInteractiveCount: number;
  samples: Array<{
    id: string;
    color: string;
    backgroundColor: string;
    borderColor: string;
  }>;
}

describe('Helm extension', () => {
  it('activates and streams a mock chat turn', async () => {
    const extension = vscode.extensions.getExtension('helm-local.helm');
    assert.ok(extension, 'Helm extension was not discovered');
    await extension.activate();
    assert.equal(extension.isActive, true);
    const response = await vscode.commands.executeCommand<string>(
      'helm.testMockTurn',
      'hello integration',
    );
    assert.equal(response, 'Mock received: hello integration');
  });

  it('consumes steering at the next tool-loop boundary', async () => {
    const response = await vscode.commands.executeCommand<string>('helm.testSteerAtToolBoundary');
    assert.equal(response, 'Steer consumed at tool boundary');
  });

  it('preserves the queue across steer and stop, then resumes FIFO', async () => {
    const result = await vscode.commands.executeCommand<{
      preservedQueue: string[];
      resumedText?: string;
    }>('helm.testQueueSteerStop');
    assert.deepEqual(result.preservedQueue, ['queued follow-up']);
    assert.equal(result.resumedText, 'Mock received: queued follow-up');
  });

  it('executes, advances, and persists an approved plan one step at a time', async () => {
    const result = await vscode.commands.executeCommand<{
      completed: boolean[];
      persisted: boolean[];
      turns: string[];
    }>('helm.testPlanExecution');
    assert.deepEqual(result.completed, [true, true]);
    assert.deepEqual(result.persisted, [true, true]);
    assert.deepEqual(result.turns, [
      'Execute approved plan step 1/2: Inspect the target',
      'Execute approved plan step 2/2: Report the result',
    ]);
  });

  it('accepts two native diffs, verifies the program, and restores the turn checkpoint', async () => {
    const result = await vscode.commands.executeCommand<{
      output: string;
      changed: boolean;
      restored: boolean;
    }>('helm.testTwoFileEdit');
    assert.equal(result.changed, true);
    assert.match(result.output, /hello/u);
    assert.equal(result.restored, true);
  });

  it('traverses every main and settings control with visible keyboard focus', async () => {
    const result = await vscode.commands.executeCommand<WebviewAuditResult>(
      'helm.testWebviewAudit',
      'keyboard',
    );
    assert.ok(result, 'Webview keyboard audit returned no result');
    assert.deepEqual(result.errors, []);
    assert.ok(result.mainInteractiveCount >= 5, 'Expected at least five main-panel controls');
    assert.ok(result.settingsInteractiveCount >= 30, 'Expected the full settings control set');
  });

  it('resolves intentional colors for new sections in light, dark, and high-contrast themes', async () => {
    const configuration = vscode.workspace.getConfiguration('workbench');
    const previousTheme = configuration.get<string>('colorTheme');
    const palettes = new Set<string>();
    try {
      for (const theme of [
        'Default Light Modern',
        'Default Dark Modern',
        'Default High Contrast',
      ]) {
        await configuration.update('colorTheme', theme, vscode.ConfigurationTarget.Global);
        await new Promise((resolve) => setTimeout(resolve, 300));
        const result = await vscode.commands.executeCommand<WebviewAuditResult>(
          'helm.testWebviewAudit',
          'theme',
        );
        assert.ok(result, `${theme} audit returned no result`);
        assert.deepEqual(result.errors, [], `${theme} theme audit failed`);
        assert.deepEqual(result.samples.map((sample) => sample.id).sort(), [
          'code-graph',
          'skills',
          'web',
        ]);
        palettes.add(
          JSON.stringify(
            result.samples.map(({ color, backgroundColor, borderColor }) => ({
              color,
              backgroundColor,
              borderColor,
            })),
          ),
        );
      }
      assert.equal(palettes.size, 3, 'Each VS Code theme should resolve a distinct palette');
    } finally {
      if (previousTheme) {
        await configuration.update('colorTheme', previousTheme, vscode.ConfigurationTarget.Global);
      }
    }
  });

  it('loads Codicons and contains the composer and pickers at 240px', async () => {
    const result = await vscode.commands.executeCommand<WebviewAuditResult>(
      'helm.testWebviewAudit',
      'responsive',
    );
    assert.ok(result, 'Webview responsive audit returned no result');
    assert.deepEqual(result.errors, []);
  });
});
