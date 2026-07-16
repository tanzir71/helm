import type {
  ChatMessage,
  CodeGraphSettingsState,
  HostToWebviewMessage,
  PlanState,
  ProviderKeyState,
  RunState,
  SessionSettings,
  SkillSettingsState,
  SuggestedAction,
  WebSettingsState,
} from '@helm/core/browser';

export interface UiTool {
  id: string;
  name: string;
  input: unknown;
  output?: unknown;
  ok?: boolean;
  approval?: string;
  alwaysAllowPattern?: string;
}

export interface UiDiff {
  id: string;
  path: string;
  before: string;
  after: string;
}

export interface UiNotice {
  id: number;
  level: 'info' | 'error';
  message: string;
}

export interface UiConnectionResult {
  message: string;
  ok: boolean;
}

export type PendingConfirmation =
  | { id: number; kind: 'fullAccess'; message: string }
  | { id: number; kind: 'clearSession'; message: string }
  | { id: number; kind: 'deleteCodeGraph'; message: string }
  | { id: number; kind: 'skillsGit'; message: string; url: string };

export interface UiState {
  version: string | undefined;
  messages: ChatMessage[];
  activeRunMessageId: string | undefined;
  reasoningStartedAt: Record<string, number>;
  reasoningDurationMs: Record<string, number>;
  runState: RunState;
  queue: Array<{ id: string; text: string }>;
  suggestions: SuggestedAction[];
  tools: UiTool[];
  diffs: UiDiff[];
  settings: SessionSettings;
  hasApiKey: boolean;
  settingsOpen: boolean;
  settingsFocus: 'skills' | undefined;
  notice: UiNotice | undefined;
  input: string;
  tokenUsage: { input: number; output: number; estimatedCost: number };
  plan: PlanState | undefined;
  contextItems: string[];
  modelsByProvider: Record<string, Array<{ id: string; label: string }>>;
  providerKeyStates: Record<string, ProviderKeyState>;
  connectionResults: Record<string, UiConnectionResult>;
  webSettings: WebSettingsState;
  codeGraphSettings: CodeGraphSettingsState;
  codeGraphConsent: { gitRepository: boolean } | undefined;
  skillsSettings: SkillSettingsState;
  pendingConfirmation: PendingConfirmation | undefined;
  fileAttachments: string[];
  eventSequence: number;
}

export const DEFAULT_SETTINGS: SessionSettings = {
  provider: 'anthropic',
  modelId: 'claude-sonnet-4-5',
  mode: 'agent',
  workflow: 'assist',
  enterBehavior: 'queue',
  autoContext: true,
  reasoningEffort: 'medium',
};

export const initialUiState: UiState = {
  version: undefined,
  messages: [],
  activeRunMessageId: undefined,
  reasoningStartedAt: {},
  reasoningDurationMs: {},
  runState: 'idle',
  queue: [],
  suggestions: [],
  tools: [],
  diffs: [],
  settings: DEFAULT_SETTINGS,
  hasApiKey: false,
  settingsOpen: false,
  settingsFocus: undefined,
  notice: undefined,
  input: '',
  tokenUsage: { input: 0, output: 0, estimatedCost: 0 },
  plan: undefined,
  contextItems: [],
  modelsByProvider: {},
  providerKeyStates: {},
  connectionResults: {},
  webSettings: {
    allowedDomains: [],
    enabled: true,
    provider: 'duckduckgo',
    providerKeys: {},
  },
  codeGraphSettings: {
    enabled: true,
    indexed: false,
    indexing: false,
    runtime: 'cli',
    fileCount: 0,
    symbolCount: 0,
    edgeCount: 0,
  },
  codeGraphConsent: undefined,
  skillsSettings: { items: [], errors: [] },
  pendingConfirmation: undefined,
  fileAttachments: [],
  eventSequence: 0,
};

export type UiAction =
  | { type: 'hostMessage'; message: HostToWebviewMessage }
  | { type: 'inputChanged'; value: string }
  | { type: 'settingsVisibilityChanged'; open: boolean; focus?: 'skills' }
  | { type: 'noticeDismissed'; id: number }
  | { type: 'suggestionsCleared' }
  | { type: 'contextItemsCleared' }
  | { type: 'fileAttachmentRemoved'; reference: string }
  | { type: 'fileAttachmentsCleared' }
  | { type: 'connectionTestStarted'; provider: string }
  | { type: 'toolApprovalHandled'; id: string }
  | { type: 'diffHandled'; id: string }
  | { type: 'confirmationHandled'; id: number }
  | { type: 'codeGraphConsentDismissed' };

function upsertMessage(messages: ChatMessage[], next: ChatMessage): ChatMessage[] {
  const index = messages.findIndex((message) => message.id === next.id);
  if (index === -1) return [...messages, next];
  return messages.map((message) => (message.id === next.id ? next : message));
}

function updateMessage(
  messages: ChatMessage[],
  id: string,
  update: (message: ChatMessage) => ChatMessage,
): ChatMessage[] {
  return messages.map((message) => (message.id === id ? update(message) : message));
}

function nextNotice(
  state: UiState,
  level: UiNotice['level'],
  message: string,
): Pick<UiState, 'eventSequence' | 'notice'> {
  const id = state.eventSequence + 1;
  return { eventSequence: id, notice: { id, level, message } };
}

function withGoal(settings: SessionSettings, goal: string | undefined): SessionSettings {
  if (goal) return { ...settings, goal };
  const next = { ...settings };
  delete next.goal;
  return next;
}

function reduceHostMessage(state: UiState, message: HostToWebviewMessage): UiState {
  switch (message.type) {
    case 'hello':
      return { ...state, version: message.version };
    case 'sessionRestored':
      return {
        ...state,
        messages: message.messages,
        settings: message.settings,
        plan: message.settings.plan,
        activeRunMessageId: undefined,
        reasoningStartedAt: {},
        reasoningDurationMs: {},
        suggestions: [],
        tools: [],
        diffs: [],
        fileAttachments: [],
      };
    case 'messageAdded':
      return { ...state, messages: upsertMessage(state.messages, message.message) };
    case 'assistantStarted':
      return {
        ...state,
        messages: upsertMessage(state.messages, message.message),
        activeRunMessageId: message.message.id,
      };
    case 'assistantDelta':
      return {
        ...state,
        messages: updateMessage(state.messages, message.runId, (current) => ({
          ...current,
          text: current.text + message.text,
        })),
      };
    case 'reasoningDelta':
      return {
        ...state,
        reasoningStartedAt: state.reasoningStartedAt[message.runId]
          ? state.reasoningStartedAt
          : { ...state.reasoningStartedAt, [message.runId]: Date.now() },
        messages: updateMessage(state.messages, message.runId, (current) => ({
          ...current,
          reasoning: (current.reasoning ?? '') + message.text,
        })),
      };
    case 'reasoningReplaced':
      return {
        ...state,
        reasoningStartedAt: state.reasoningStartedAt[message.runId]
          ? state.reasoningStartedAt
          : { ...state.reasoningStartedAt, [message.runId]: Date.now() },
        messages: updateMessage(state.messages, message.runId, (current) => ({
          ...current,
          reasoning: message.text,
        })),
      };
    case 'assistantCompleted': {
      const reasoningStartedAt = state.reasoningStartedAt[message.id];
      return {
        ...state,
        messages: message.interrupted
          ? updateMessage(state.messages, message.id, (current) => ({
              ...current,
              interrupted: true,
            }))
          : state.messages,
        activeRunMessageId:
          state.activeRunMessageId === message.id ? undefined : state.activeRunMessageId,
        reasoningDurationMs: reasoningStartedAt
          ? {
              ...state.reasoningDurationMs,
              [message.id]: Date.now() - reasoningStartedAt,
            }
          : state.reasoningDurationMs,
      };
    }
    case 'runStateChanged':
      return {
        ...state,
        runState: message.state,
        ...(message.state === 'idle' ? { activeRunMessageId: undefined } : {}),
      };
    case 'queueUpdated':
      return { ...state, queue: message.items };
    case 'suggestions':
      return {
        ...state,
        suggestions: [
          ...state.suggestions.filter((item) => item.kind !== 'prompt'),
          ...message.items,
        ],
      };
    case 'suggestionAvailable':
      return {
        ...state,
        suggestions: [
          message.item,
          ...state.suggestions.filter((item) => item.kind !== message.item.kind),
        ],
      };
    case 'toolCallStarted':
      return {
        ...state,
        tools: [
          ...state.tools.filter((tool) => tool.id !== message.callId),
          { id: message.callId, name: message.tool, input: message.input },
        ],
      };
    case 'toolCallFinished':
      return {
        ...state,
        tools: state.tools.map((tool) =>
          tool.id === message.callId ? { ...tool, output: message.output, ok: message.ok } : tool,
        ),
      };
    case 'toolApprovalRequested':
      return {
        ...state,
        tools: state.tools.map((tool) =>
          tool.id === message.callId
            ? {
                ...tool,
                approval: message.summary,
                ...(message.alwaysAllowPattern
                  ? { alwaysAllowPattern: message.alwaysAllowPattern }
                  : {}),
              }
            : tool,
        ),
      };
    case 'diffProposed':
      return {
        ...state,
        diffs: [
          ...state.diffs.filter((diff) => diff.id !== message.diffId),
          {
            id: message.diffId,
            path: message.path,
            before: message.before,
            after: message.after,
          },
        ],
      };
    case 'settingsChanged':
      return {
        ...state,
        settings: message.settings,
        plan: message.settings.plan,
        hasApiKey: message.hasApiKey,
        providerKeyStates: message.providerKeys,
        webSettings: message.web,
        codeGraphSettings: message.codeGraph,
        skillsSettings: message.skills,
      };
    case 'codeGraphProgress':
      return {
        ...state,
        codeGraphSettings: {
          ...state.codeGraphSettings,
          indexing: true,
          progress: message.progress,
        },
      };
    case 'codeGraphConsentRequired':
      return { ...state, codeGraphConsent: { gitRepository: message.gitRepository } };
    case 'codeGraphDeleteConfirmationRequired': {
      const id = state.eventSequence + 1;
      return {
        ...state,
        eventSequence: id,
        pendingConfirmation: {
          id,
          kind: 'deleteCodeGraph',
          message:
            'Delete the local .codegraph index for this workspace? Source files are not affected.',
        },
      };
    }
    case 'skillsGitConfirmationRequired': {
      const id = state.eventSequence + 1;
      return {
        ...state,
        eventSequence: id,
        pendingConfirmation: {
          id,
          kind: 'skillsGit',
          message: `Clone skills from ${message.url}? This runs git clone --depth 1 and validates each SKILL.md before copying it.`,
          url: message.url,
        },
      };
    }
    case 'openSkillsSettings':
      return { ...state, settingsOpen: true, settingsFocus: 'skills' };
    case 'runWebviewAudit':
      return state;
    case 'modelsUpdated':
      return {
        ...state,
        modelsByProvider: { ...state.modelsByProvider, [message.provider]: message.models },
      };
    case 'contextItems':
      return {
        ...state,
        contextItems: message.items.map((item) =>
          item.includes(' ') ? `@${message.kind}:"${item}"` : `@${message.kind}:${item}`,
        ),
      };
    case 'fileAttachmentsSelected':
      return {
        ...state,
        fileAttachments: [...new Set([...state.fileAttachments, ...message.items])],
      };
    case 'connectionResult':
      return {
        ...state,
        connectionResults: {
          ...state.connectionResults,
          [message.provider]: { ok: message.ok, message: message.message },
        },
      };
    case 'tokenUsage':
      return {
        ...state,
        tokenUsage: {
          input: message.input,
          output: message.output,
          estimatedCost: message.estimatedCost,
        },
      };
    case 'steered':
      return {
        ...state,
        messages: [
          ...state.messages,
          {
            id: `steer-${message.id}`,
            role: 'system',
            text: '— steered —',
            createdAt: Date.now(),
          },
        ],
      };
    case 'compacted':
      return {
        ...state,
        ...nextNotice(
          state,
          'info',
          `Context compacted from ${message.tokensBefore.toLocaleString()} to ${message.tokensAfter.toLocaleString()} tokens.`,
        ),
      };
    case 'goalChanged':
      return { ...state, settings: withGoal(state.settings, message.goal) };
    case 'planChanged':
      return { ...state, plan: message.plan };
    case 'fullAccessConfirmationRequired': {
      const id = state.eventSequence + 1;
      return {
        ...state,
        eventSequence: id,
        pendingConfirmation: {
          id,
          kind: 'fullAccess',
          message:
            'Full Access can edit files and run commands without asking. Helm still blocks dangerous commands. Enable it for this workspace?',
        },
      };
    }
    case 'error': {
      if (message.action === 'confirmClear') {
        const id = state.eventSequence + 1;
        return {
          ...state,
          eventSequence: id,
          pendingConfirmation: { id, kind: 'clearSession', message: message.message },
        };
      }
      return {
        ...state,
        ...(message.action === 'openSettings' ? { settingsOpen: true } : {}),
        ...nextNotice(state, 'error', message.message),
      };
    }
  }
}

export function uiReducer(state: UiState, action: UiAction): UiState {
  switch (action.type) {
    case 'hostMessage':
      return reduceHostMessage(state, action.message);
    case 'inputChanged':
      return { ...state, input: action.value };
    case 'settingsVisibilityChanged':
      return {
        ...state,
        settingsOpen: action.open,
        settingsFocus: action.open ? action.focus : undefined,
      };
    case 'noticeDismissed':
      return state.notice?.id === action.id ? { ...state, notice: undefined } : state;
    case 'suggestionsCleared':
      return { ...state, suggestions: [] };
    case 'contextItemsCleared':
      return { ...state, contextItems: [] };
    case 'fileAttachmentRemoved':
      return {
        ...state,
        fileAttachments: state.fileAttachments.filter(
          (reference) => reference !== action.reference,
        ),
      };
    case 'fileAttachmentsCleared':
      return { ...state, fileAttachments: [] };
    case 'connectionTestStarted': {
      const connectionResults = { ...state.connectionResults };
      delete connectionResults[action.provider];
      return { ...state, connectionResults };
    }
    case 'toolApprovalHandled':
      return {
        ...state,
        tools: state.tools.map((tool) => {
          if (tool.id !== action.id) return tool;
          const next = { ...tool };
          delete next.approval;
          delete next.alwaysAllowPattern;
          return next;
        }),
      };
    case 'diffHandled':
      return { ...state, diffs: state.diffs.filter((diff) => diff.id !== action.id) };
    case 'confirmationHandled':
      return state.pendingConfirmation?.id === action.id
        ? { ...state, pendingConfirmation: undefined }
        : state;
    case 'codeGraphConsentDismissed':
      return { ...state, codeGraphConsent: undefined };
  }
}
