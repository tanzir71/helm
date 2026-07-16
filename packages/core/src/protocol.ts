export type ApprovalMode = 'chat' | 'agent' | 'fullAccess';
export type RunState = 'idle' | 'running' | 'stopping' | 'awaitingApproval';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
  createdAt: number;
  reasoning?: string;
  interrupted?: boolean;
}

export interface SessionSettings {
  provider: string;
  modelId: string;
  mode: ApprovalMode;
  baseURL?: string;
  enterBehavior: 'queue' | 'steer';
  autoContext: boolean;
  reasoningEffort: 'low' | 'medium' | 'high';
  goal?: string;
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
  | {
      type: 'testConnection';
      provider: string;
      key?: string;
      modelId?: string;
      baseURL?: string;
    }
  | { type: 'requestSession' }
  | {
      type: 'saveProviderSettings';
      provider: string;
      modelId: string;
      baseURL?: string;
      reasoningEffort: 'low' | 'medium' | 'high';
    }
  | { type: 'requestModels'; provider: string; baseURL?: string; key?: string }
  | { type: 'requestContextItems'; kind: 'file' | 'folder'; query: string }
  | { type: 'setAutoContext'; enabled: boolean }
  | { type: 'resumeQueue' }
  | { type: 'clearQueue' }
  | { type: 'undoLastChange' }
  | { type: 'restoreCheckpoint' }
  | { type: 'confirmFullAccess'; confirmed: boolean }
  | { type: 'clearSession' };

export type HostToWebviewMessage =
  | { type: 'hello'; version: string }
  | { type: 'sessionRestored'; messages: ChatMessage[]; settings: SessionSettings }
  | { type: 'messageAdded'; message: ChatMessage }
  | { type: 'assistantStarted'; message: ChatMessage }
  | { type: 'assistantCompleted'; id: string; interrupted?: boolean }
  | { type: 'runStateChanged'; state: RunState }
  | { type: 'assistantDelta'; runId: string; text: string }
  | { type: 'reasoningDelta'; runId: string; text: string }
  | { type: 'reasoningReplaced'; runId: string; text: string }
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
  | { type: 'settingsChanged'; settings: SessionSettings; hasApiKey: boolean }
  | { type: 'modelsUpdated'; provider: string; models: Array<{ id: string; label: string }> }
  | { type: 'contextItems'; kind: 'file' | 'folder'; items: string[] }
  | { type: 'goalChanged'; goal?: string }
  | { type: 'planProposed'; steps: string[] }
  | { type: 'fullAccessConfirmationRequired' }
  | { type: 'undoAvailable'; label: string }
  | { type: 'checkpointAvailable'; label: string }
  | { type: 'error'; message: string; action?: string };

export function isWebviewToHostMessage(value: unknown): value is WebviewToHostMessage {
  if (typeof value !== 'object' || value === null || !('type' in value)) return false;
  return typeof value.type === 'string';
}
