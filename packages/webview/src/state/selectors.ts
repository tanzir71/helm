import type { ChatMessage } from '@helm/core/browser';

import type { UiState } from './store';

export function selectIsRunning(state: UiState): boolean {
  return state.runState !== 'idle';
}

export function selectStreamingMessage(state: UiState): ChatMessage | undefined {
  return state.messages.find((message) => message.id === state.activeRunMessageId);
}

export function selectTokenLabel(state: UiState): string {
  const total = state.tokenUsage.input + state.tokenUsage.output;
  const count =
    total >= 1_000 ? `${(total / 1_000).toFixed(total >= 10_000 ? 1 : 2)}k` : `${total}`;
  return `${count} tokens · ~$${state.tokenUsage.estimatedCost.toFixed(4)}`;
}

export function selectVisibleSuggestions(state: UiState) {
  return state.runState === 'idle' ? state.suggestions.slice(0, 3) : [];
}
