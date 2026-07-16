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

  it('keeps exactly one notice and replaces it with the newest event', () => {
    const compacted = uiReducer(initialUiState, {
      type: 'hostMessage',
      message: { type: 'compacted', tokensBefore: 12_000, tokensAfter: 4_000 },
    });
    const failed = uiReducer(compacted, {
      type: 'hostMessage',
      message: { type: 'error', message: 'The request failed.' },
    });

    expect(compacted.notice?.level).toBe('info');
    expect(failed.notice).toEqual({
      id: compacted.eventSequence + 1,
      level: 'error',
      message: 'The request failed.',
    });
  });

  it('keeps provider connection feedback available inside settings', () => {
    const result = uiReducer(initialUiState, {
      type: 'hostMessage',
      message: {
        type: 'connectionResult',
        provider: 'openai',
        ok: false,
        message: 'Invalid API key',
      },
    });

    expect(result.connectionResults.openai).toEqual({
      ok: false,
      message: 'Invalid API key',
    });
    expect(result.notice).toBeUndefined();
  });

  it('adds, deduplicates, removes, and clears selected file attachments', () => {
    const selected = uiReducer(initialUiState, {
      type: 'hostMessage',
      message: {
        type: 'fileAttachmentsSelected',
        items: ['@file:src/main.ts', '@file:"src/shared file.ts"', '@file:src/main.ts'],
      },
    });
    expect(selected.fileAttachments).toEqual(['@file:src/main.ts', '@file:"src/shared file.ts"']);

    const removed = uiReducer(selected, {
      type: 'fileAttachmentRemoved',
      reference: '@file:src/main.ts',
    });
    expect(removed.fileAttachments).toEqual(['@file:"src/shared file.ts"']);

    expect(uiReducer(removed, { type: 'fileAttachmentsCleared' }).fileAttachments).toEqual([]);
  });
});
