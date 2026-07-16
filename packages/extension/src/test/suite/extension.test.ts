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
});
