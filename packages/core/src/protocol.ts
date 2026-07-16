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

export interface PlanState {
  steps: Array<{ text: string; completed: boolean }>;
  executing: boolean;
  currentStep?: number;
}

export interface SessionSettings {
  provider: string;
  modelId: string;
  mode: ApprovalMode;
  baseURL?: string;
  enterBehavior: 'queue' | 'steer';
  autoContext: boolean;
  reasoningEffort: 'low' | 'medium' | 'high';
  utilityModel?: string;
  goal?: string;
  plan?: PlanState;
}

export type SuggestionKind = 'prompt' | 'undo' | 'restoreCheckpoint';

export interface SuggestedAction {
  kind: SuggestionKind;
  label: string;
}

export interface ProviderKeyState {
  configured: boolean;
  connected: boolean;
  masked: string;
}

export type WebSearchProviderId = 'tavily' | 'brave' | 'exa' | 'duckduckgo';

export interface WebSettingsState {
  allowedDomains: string[];
  enabled: boolean;
  provider: WebSearchProviderId;
  providerKeys: Record<string, { configured: boolean; masked: string }>;
}

export type CodeGraphRuntime = 'in-process' | 'cli';

export interface CodeGraphProgress {
  phase: 'scanning' | 'parsing' | 'storing' | 'resolving' | 'starting';
  current: number;
  total: number;
  currentFile?: string;
}

export interface CodeGraphSettingsState {
  enabled: boolean;
  indexed: boolean;
  indexing: boolean;
  runtime: CodeGraphRuntime;
  fileCount: number;
  symbolCount: number;
  edgeCount: number;
  lastSync?: number;
  progress?: CodeGraphProgress;
  error?: string;
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
  | { type: 'openDiff'; diffId: string }
  | { type: 'setMode'; mode: ApprovalMode }
  | { type: 'openSettings' }
  | { type: 'saveApiKey'; provider: string; key: string }
  | { type: 'removeApiKey'; provider: string }
  | {
      type: 'saveWebSettings';
      enabled: boolean;
      provider: WebSearchProviderId;
      key?: string;
    }
  | { type: 'removeWebApiKey'; provider: WebSearchProviderId }
  | { type: 'testWebSearch'; provider: WebSearchProviderId; key?: string }
  | { type: 'removeAllowedDomain'; domain: string }
  | { type: 'saveCodeGraphSettings'; enabled: boolean }
  | { type: 'initializeCodeGraph'; addToGitignore: boolean }
  | { type: 'dismissCodeGraphConsent' }
  | { type: 'reindexCodeGraph' }
  | { type: 'requestDeleteCodeGraphIndex' }
  | { type: 'deleteCodeGraphIndex' }
  | { type: 'openExternal'; url: string }
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
  | {
      type: 'saveDefaults';
      mode: ApprovalMode;
      enterBehavior: 'queue' | 'steer';
      utilityModel: string;
      modelId: string;
      reasoningEffort: 'low' | 'medium' | 'high';
    }
  | { type: 'requestContextItems'; kind: 'file' | 'folder'; query: string }
  | { type: 'setAutoContext'; enabled: boolean }
  | { type: 'resumeQueue' }
  | { type: 'clearQueue' }
  | { type: 'undoLastChange' }
  | { type: 'restoreCheckpoint' }
  | { type: 'executePlan' }
  | { type: 'togglePlanStep'; index: number }
  | { type: 'dismissPlan' }
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
  | {
      type: 'toolApprovalRequested';
      callId: string;
      tool: string;
      summary: string;
      alwaysAllowPattern?: string;
    }
  | { type: 'diffProposed'; diffId: string; path: string; before: string; after: string }
  | { type: 'suggestions'; items: SuggestedAction[] }
  | { type: 'suggestionAvailable'; item: SuggestedAction }
  | { type: 'queueUpdated'; items: Array<{ id: string; text: string }> }
  | { type: 'steered'; id: string; text: string }
  | { type: 'compacted'; tokensBefore: number; tokensAfter: number }
  | { type: 'tokenUsage'; input: number; output: number; estimatedCost: number }
  | { type: 'connectionResult'; provider: string; ok: boolean; message: string }
  | {
      type: 'settingsChanged';
      settings: SessionSettings;
      hasApiKey: boolean;
      providerKeys: Record<string, ProviderKeyState>;
      web: WebSettingsState;
      codeGraph: CodeGraphSettingsState;
    }
  | { type: 'modelsUpdated'; provider: string; models: Array<{ id: string; label: string }> }
  | { type: 'contextItems'; kind: 'file' | 'folder'; items: string[] }
  | { type: 'goalChanged'; goal?: string }
  | { type: 'planChanged'; plan?: PlanState }
  | { type: 'fullAccessConfirmationRequired' }
  | { type: 'codeGraphConsentRequired'; gitRepository: boolean }
  | { type: 'codeGraphDeleteConfirmationRequired' }
  | { type: 'codeGraphProgress'; progress: CodeGraphProgress }
  | { type: 'error'; message: string; action?: string };

export function isWebviewToHostMessage(value: unknown): value is WebviewToHostMessage {
  if (typeof value !== 'object' || value === null || !('type' in value)) return false;
  return typeof value.type === 'string';
}
