export type ApprovalMode = 'chat' | 'agent' | 'fullAccess';
export type RunState = 'idle' | 'running' | 'stopping' | 'awaitingApproval';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
  createdAt: number;
}

export type WebviewToHostMessage =
  | { type: 'webviewReady' }
  | { type: 'userMessage'; id: string; text: string }
  | { type: 'queueMessage'; id: string; text: string }
  | { type: 'steerMessage'; id: string; text: string }
  | { type: 'removeQueuedMessage'; id: string }
  | { type: 'reorderQueue'; ids: string[] }
  | { type: 'stopRun' }
  | { type: 'approveTool'; callId: string; alwaysAllowPattern?: string }
  | { type: 'rejectTool'; callId: string; reason?: string }
  | { type: 'applyDiff'; diffId: string }
  | { type: 'rejectDiff'; diffId: string }
  | { type: 'setMode'; mode: ApprovalMode }
  | { type: 'openSettings' }
  | { type: 'saveApiKey'; provider: string; key: string }
  | { type: 'testConnection'; provider: string }
  | { type: 'requestSession' };

export type HostToWebviewMessage =
  | { type: 'hello'; version: string }
  | { type: 'sessionRestored'; messages: ChatMessage[]; mode: ApprovalMode }
  | { type: 'runStateChanged'; state: RunState }
  | { type: 'assistantDelta'; runId: string; text: string }
  | { type: 'reasoningDelta'; runId: string; text: string }
  | { type: 'toolCallStarted'; callId: string; tool: string; input: unknown }
  | { type: 'toolCallFinished'; callId: string; tool: string; output: unknown; ok: boolean }
  | { type: 'toolApprovalRequested'; callId: string; tool: string; summary: string }
  | { type: 'diffProposed'; diffId: string; path: string; before: string; after: string }
  | { type: 'suggestions'; items: string[] }
  | { type: 'queueUpdated'; items: Array<{ id: string; text: string }> }
  | { type: 'steered'; id: string; text: string }
  | { type: 'compacted'; tokensBefore: number; tokensAfter: number }
  | { type: 'tokenUsage'; input: number; output: number; estimatedCost: number }
  | { type: 'connectionResult'; provider: string; ok: boolean; message: string }
  | { type: 'error'; message: string; action?: string };

export function isWebviewToHostMessage(value: unknown): value is WebviewToHostMessage {
  if (typeof value !== 'object' || value === null || !('type' in value)) return false;
  return typeof value.type === 'string';
}
