import {
  isOpenWeightFamily,
  resolveModelProfile,
  STATIC_MODELS,
  type ApprovalMode,
  type HostToWebviewMessage,
  type SuggestedAction,
} from '@helm/core/browser';
import { useCallback, useEffect, useReducer } from 'react';

import { Composer, type SubmitKind } from './components/Composer/Composer';
import { CodeGraphNotice } from './components/CodeGraphNotice';
import { QueueStrip } from './components/Composer/QueueStrip';
import { SuggestionRow } from './components/Composer/SuggestionRow';
import { DiffGroup } from './components/DiffGroup';
import { EmptyState } from './components/EmptyState';
import { GoalBanner } from './components/GoalBanner';
import { Header } from './components/Header';
import { Notice } from './components/Notice';
import { PlanCard } from './components/PlanCard';
import { SettingsView } from './components/Settings/SettingsView';
import { ToolCard } from './components/ToolCard';
import { ToolGroupCard } from './components/ToolGroupCard';
import { Transcript } from './components/Transcript';
import { groupConsecutiveTools } from './components/tool-groups';
import {
  selectIsRunning,
  selectStreamingMessage,
  selectTokenLabel,
  selectVisibleSuggestions,
} from './state/selectors';
import { resolveClientCommand } from './state/client-command';
import { initialUiState, uiReducer } from './state/store';
import { runWebviewAudit } from './state/webview-audit';
import { vscode } from './vscode';

function statusForTool(name: string): string {
  const statuses: Record<string, string> = {
    read_file: 'Reading a file…',
    list_dir: 'Exploring the workspace…',
    glob: 'Finding files…',
    grep: 'Searching the code…',
    run_command: 'Running a command…',
    web_search: 'Searching the web…',
    web_fetch: 'Reading a web page…',
    explore_code: 'Querying the code graph…',
  };
  return statuses[name] ?? 'Working…';
}

export function App(): React.JSX.Element {
  const [state, dispatch] = useReducer(uiReducer, initialUiState);
  const running = selectIsRunning(state);
  const streamingMessage = selectStreamingMessage(state);
  const suggestions = selectVisibleSuggestions(state);
  const tokenLabel = selectTokenLabel(state);
  const modelProfile = resolveModelProfile(state.settings.modelId);
  const tokenCount = state.tokenUsage.input + state.tokenUsage.output;
  const nearingCompaction =
    tokenCount >=
    modelProfile.contextWindow * (isOpenWeightFamily(modelProfile.family) ? 0.7 : 0.8);
  const models =
    state.modelsByProvider[state.settings.provider] ??
    STATIC_MODELS[state.settings.provider as keyof typeof STATIC_MODELS] ??
    [];
  const pendingTool = [...state.tools]
    .reverse()
    .find((tool) => tool.ok === undefined && !tool.approval);
  const toolDisplayItems = groupConsecutiveTools(state.tools);
  const status =
    running && (pendingTool || !streamingMessage?.text)
      ? pendingTool
        ? statusForTool(pendingTool.name)
        : 'Thinking…'
      : undefined;

  useEffect(() => {
    const receive = (event: MessageEvent<HostToWebviewMessage>) => {
      if (event.data.type === 'runWebviewAudit') {
        const { mode, requestId } = event.data;
        void runWebviewAudit(mode).then((result) =>
          vscode.postMessage({
            type: 'webviewAuditResult',
            requestId,
            result,
          }),
        );
        return;
      }
      dispatch({ type: 'hostMessage', message: event.data });
    };
    window.addEventListener('message', receive);
    vscode.postMessage({ type: 'webviewReady' });
    return () => window.removeEventListener('message', receive);
  }, []);

  useEffect(() => {
    const match = /@(file|folder):([^\s]*)$/u.exec(state.input);
    if (!match) {
      dispatch({ type: 'contextItemsCleared' });
      return;
    }
    vscode.postMessage({
      type: 'requestContextItems',
      kind: match[1] as 'file' | 'folder',
      query: match[2] ?? '',
    });
  }, [state.input]);

  useEffect(() => {
    const confirmation = state.pendingConfirmation;
    if (!confirmation) return;
    const confirmed = window.confirm(confirmation.message);
    if (confirmation.kind === 'fullAccess') {
      vscode.postMessage({ type: 'confirmFullAccess', confirmed });
    } else if (confirmation.kind === 'deleteCodeGraph') {
      if (confirmed) vscode.postMessage({ type: 'deleteCodeGraphIndex' });
    } else if (confirmation.kind === 'skillsGit') {
      vscode.postMessage({
        type: 'confirmAddSkillsGit',
        url: confirmation.url,
        confirmed,
      });
    } else if (confirmed) {
      vscode.postMessage({ type: 'clearSession' });
    }
    dispatch({ type: 'confirmationHandled', id: confirmation.id });
  }, [state.pendingConfirmation]);

  useEffect(() => {
    if (!state.notice || state.notice.level === 'error') return;
    const id = window.setTimeout(
      () => dispatch({ type: 'noticeDismissed', id: state.notice!.id }),
      6_000,
    );
    return () => window.clearTimeout(id);
  }, [state.notice]);

  const send = (kind: SubmitKind, text = state.input) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const clientCommand = resolveClientCommand(trimmed);
    if (clientCommand === 'openSettings' || clientCommand === 'openSkills') {
      dispatch({
        type: 'settingsVisibilityChanged',
        open: true,
        ...(clientCommand === 'openSkills' ? { focus: 'skills' as const } : {}),
      });
      dispatch({ type: 'inputChanged', value: '' });
      dispatch({ type: 'suggestionsCleared' });
      return;
    }
    vscode.postMessage({ type: kind, id: crypto.randomUUID(), text: trimmed });
    dispatch({ type: 'inputChanged', value: '' });
    dispatch({ type: 'suggestionsCleared' });
  };

  const requestModels = useCallback((provider: string, baseURL: string, key?: string) => {
    vscode.postMessage({
      type: 'requestModels',
      provider,
      ...(baseURL ? { baseURL } : {}),
      ...(key ? { key } : {}),
    });
  }, []);

  const saveApiKey = useCallback((provider: string, key: string) => {
    vscode.postMessage({ type: 'saveApiKey', provider, key });
  }, []);

  const saveProviderSettings = useCallback(
    (
      provider: string,
      modelId: string,
      baseURL: string,
      reasoningEffort: 'low' | 'medium' | 'high',
    ) => {
      vscode.postMessage({
        type: 'saveProviderSettings',
        provider,
        modelId,
        reasoningEffort,
        ...(baseURL ? { baseURL } : {}),
      });
    },
    [],
  );

  const testConnection = useCallback(
    (provider: string, modelId: string, baseURL: string, key?: string) => {
      dispatch({ type: 'connectionTestStarted', provider });
      vscode.postMessage({
        type: 'testConnection',
        provider,
        modelId,
        ...(baseURL ? { baseURL } : {}),
        ...(key ? { key } : {}),
      });
    },
    [],
  );

  const chooseSuggestion = (suggestion: SuggestedAction) => {
    if (suggestion.kind === 'undo') vscode.postMessage({ type: 'undoLastChange' });
    else if (suggestion.kind === 'restoreCheckpoint')
      vscode.postMessage({ type: 'restoreCheckpoint' });
    else send('userMessage', suggestion.label);
  };

  if (state.settingsOpen) {
    return (
      <main className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
        <SettingsView
          connectionResults={state.connectionResults}
          {...(state.settingsFocus ? { focusSection: state.settingsFocus } : {})}
          modelsByProvider={state.modelsByProvider}
          onBack={() => dispatch({ type: 'settingsVisibilityChanged', open: false })}
          onAddSkillsFolder={() => vscode.postMessage({ type: 'addSkillsFolder' })}
          onAddSkillsGit={(url) => vscode.postMessage({ type: 'requestAddSkillsGit', url })}
          onRemoveAllowedDomain={(domain) =>
            vscode.postMessage({ type: 'removeAllowedDomain', domain })
          }
          codeGraphSettings={state.codeGraphSettings}
          onDeleteCodeGraph={() => vscode.postMessage({ type: 'requestDeleteCodeGraphIndex' })}
          onIndexCodeGraph={(addToGitignore) =>
            vscode.postMessage({ type: 'initializeCodeGraph', addToGitignore })
          }
          onOpenExternal={(url) => vscode.postMessage({ type: 'openExternal', url })}
          onReindexCodeGraph={() => vscode.postMessage({ type: 'reindexCodeGraph' })}
          onSaveCodeGraphSettings={(enabled) =>
            vscode.postMessage({ type: 'saveCodeGraphSettings', enabled })
          }
          onRemoveApiKey={(provider) => vscode.postMessage({ type: 'removeApiKey', provider })}
          onRemoveWebApiKey={(provider) =>
            vscode.postMessage({ type: 'removeWebApiKey', provider })
          }
          onRequestModels={requestModels}
          onSaveApiKey={saveApiKey}
          onSaveDefaults={(defaults) => vscode.postMessage({ type: 'saveDefaults', ...defaults })}
          onSaveProviderSettings={saveProviderSettings}
          onSaveWebSettings={(web) => vscode.postMessage({ type: 'saveWebSettings', ...web })}
          onTestConnection={testConnection}
          onTestWebSearch={(provider, key) => {
            dispatch({ type: 'connectionTestStarted', provider: `web:${provider}` });
            vscode.postMessage({ type: 'testWebSearch', provider, ...(key ? { key } : {}) });
          }}
          providerKeyStates={state.providerKeyStates}
          settings={state.settings}
          skillsSettings={state.skillsSettings}
          onToggleSkill={(id, enabled) => vscode.postMessage({ type: 'toggleSkill', id, enabled })}
          webSettings={state.webSettings}
        />
      </main>
    );
  }

  return (
    <main className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
      <Header
        onNewSession={() => {
          if (state.messages.length === 0 || window.confirm('Start a new session?')) {
            vscode.postMessage({ type: 'clearSession' });
          }
        }}
        onOpenSettings={() => dispatch({ type: 'settingsVisibilityChanged', open: true })}
      />
      {state.settings.goal && <GoalBanner goal={state.settings.goal} />}
      {state.codeGraphConsent && (
        <CodeGraphNotice
          gitRepository={state.codeGraphConsent.gitRepository}
          indexing={state.codeGraphSettings.indexing}
          onDismiss={() => {
            vscode.postMessage({ type: 'dismissCodeGraphConsent' });
            dispatch({ type: 'codeGraphConsentDismissed' });
          }}
          onIndex={(addToGitignore) => {
            vscode.postMessage({ type: 'initializeCodeGraph', addToGitignore });
            dispatch({ type: 'codeGraphConsentDismissed' });
          }}
        />
      )}
      {state.notice && (
        <Notice
          notice={state.notice}
          onDismiss={() => dispatch({ type: 'noticeDismissed', id: state.notice!.id })}
        />
      )}
      <Transcript
        activeRunMessageId={state.activeRunMessageId}
        messages={state.messages}
        reasoningDurationMs={state.reasoningDurationMs}
        reasoningStartedAt={state.reasoningStartedAt}
        status={status}
      >
        {state.messages.length === 0 && (
          <EmptyState
            hasApiKey={state.hasApiKey}
            onOpenSettings={() => dispatch({ type: 'settingsVisibilityChanged', open: true })}
            onSend={(text) => send('userMessage', text)}
            onUseOllama={() => {
              saveProviderSettings('ollama', 'qwen3-coder', 'http://localhost:11434', 'medium');
              dispatch({ type: 'settingsVisibilityChanged', open: true });
            }}
          />
        )}
        {toolDisplayItems.map((item) => {
          if (item.kind === 'group') return <ToolGroupCard key={item.key} tools={item.tools} />;
          const { tool } = item;
          return (
            <ToolCard
              key={item.key}
              onApprove={(always) => {
                vscode.postMessage({
                  type: 'approveTool',
                  callId: tool.id,
                  ...(always && tool.alwaysAllowPattern
                    ? { alwaysAllowPattern: tool.alwaysAllowPattern }
                    : {}),
                });
                dispatch({ type: 'toolApprovalHandled', id: tool.id });
              }}
              onReject={() => {
                vscode.postMessage({ type: 'rejectTool', callId: tool.id });
                dispatch({ type: 'toolApprovalHandled', id: tool.id });
              }}
              onOpenUrl={(url) => vscode.postMessage({ type: 'openExternal', url })}
              tool={tool}
            />
          );
        })}
        <DiffGroup
          diffs={state.diffs}
          onDecide={(id, accepted) => {
            vscode.postMessage({ type: accepted ? 'applyDiff' : 'rejectDiff', diffId: id });
            dispatch({ type: 'diffHandled', id });
          }}
          onOpen={(id) => vscode.postMessage({ type: 'openDiff', diffId: id })}
        />
        {state.plan && state.plan.steps.length > 0 && (
          <PlanCard
            onDismiss={() => vscode.postMessage({ type: 'dismissPlan' })}
            onExecute={() => vscode.postMessage({ type: 'executePlan' })}
            onRevise={() => dispatch({ type: 'inputChanged', value: '/plan Revise the plan: ' })}
            onToggle={(index) => vscode.postMessage({ type: 'togglePlanStep', index })}
            plan={state.plan}
            running={running}
          />
        )}
      </Transcript>
      <section className="grid shrink-0 gap-1 px-2 pt-1 pb-2">
        <QueueStrip
          items={state.queue}
          onClear={() => vscode.postMessage({ type: 'clearQueue' })}
          onRemove={(id) => vscode.postMessage({ type: 'removeQueuedMessage', id })}
          onReorder={(ids) => vscode.postMessage({ type: 'reorderQueue', ids })}
          onSteer={(item) =>
            vscode.postMessage({ type: 'steerMessage', id: item.id, text: item.text })
          }
        />
        <SuggestionRow items={suggestions} onChoose={chooseSuggestion} />
        <Composer
          contextItems={state.contextItems}
          input={state.input}
          models={models}
          onInputChange={(value) => dispatch({ type: 'inputChanged', value })}
          onModelChange={(modelId, reasoningEffort) =>
            saveProviderSettings(
              state.settings.provider,
              modelId,
              state.settings.baseURL ?? '',
              reasoningEffort,
            )
          }
          onModeChange={(mode: ApprovalMode) => vscode.postMessage({ type: 'setMode', mode })}
          onStop={() => vscode.postMessage({ type: 'stopRun' })}
          onSubmit={send}
          onToggleAutoContext={() =>
            vscode.postMessage({ type: 'setAutoContext', enabled: !state.settings.autoContext })
          }
          running={running}
          settings={state.settings}
        />
        <div
          className={`text-right text-[length:var(--helm-font-size-meta)] ${nearingCompaction ? 'text-[var(--helm-warning)]' : 'text-[var(--helm-description-foreground)]'}`}
        >
          {tokenLabel}
        </div>
      </section>
    </main>
  );
}
