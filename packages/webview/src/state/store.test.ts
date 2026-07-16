import type { ChatMessage } from '@helm/core/browser';
import { describe, expect, it } from 'vitest';

import { initialUiState, uiReducer } from './store';

const assistant: ChatMessage = {
  id: 'assistant-1',
  role: 'assistant',
  text: '',
  createdAt: 1,
};

describe('uiReducer', () => {
  it('tracks streaming by the active assistant id instead of object identity', () => {
    const started = uiReducer(initialUiState, {
      type: 'hostMessage',
      message: { type: 'assistantStarted', message: assistant },
    });
    const streamed = uiReducer(started, {
      type: 'hostMessage',
      message: { type: 'assistantDelta', runId: assistant.id, text: 'Hello' },
    });

    expect(streamed.activeRunMessageId).toBe(assistant.id);
    expect(streamed.messages[0]).not.toBe(assistant);
    expect(streamed.messages[0]?.text).toBe('Hello');

    const completed = uiReducer(streamed, {
      type: 'hostMessage',
      message: { type: 'assistantCompleted', id: assistant.id },
    });
    expect(completed.activeRunMessageId).toBeUndefined();
  });

  it('merges typed suggestions by kind without inspecting labels', () => {
    const withUndo = uiReducer(initialUiState, {
      type: 'hostMessage',
      message: {
        type: 'suggestionAvailable',
        item: { kind: 'undo', label: 'Revert that edit' },
      },
    });
    const withPrompts = uiReducer(withUndo, {
      type: 'hostMessage',
      message: {
        type: 'suggestions',
        items: [{ kind: 'prompt', label: 'Explain the change' }],
      },
    });

    expect(withPrompts.suggestions).toEqual([
      { kind: 'undo', label: 'Revert that edit' },
      { kind: 'prompt', label: 'Explain the change' },
    ]);
  });

  it('clears a removed goal instead of retaining stale state', () => {
    const withGoal = {
      ...initialUiState,
      settings: { ...initialUiState.settings, goal: 'Finish the refactor' },
    };
    const result = uiReducer(withGoal, {
      type: 'hostMessage',
      message: { type: 'goalChanged' },
    });

    expect(result.settings.goal).toBeUndefined();
  });
});
