import assert from 'node:assert/strict';

import { describe, it } from 'mocha';
import * as vscode from 'vscode';

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
});
