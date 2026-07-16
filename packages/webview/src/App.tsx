import {
  filterSlashCommands,
  resolveModelProfile,
  STATIC_MODELS,
  type ApprovalMode,
  type ChatMessage,
  type HostToWebviewMessage,
  type PlanState,
  type SessionSettings,
} from '@helm/core/browser';
import {
  Check,
  ChevronDown,
  CircleStop,
  Compass,
  KeyRound,
  Menu,
  Paperclip,
  Play,
  RotateCcw,
  Send,
  Settings,
  Sparkles,
  X,
  Zap,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation';
import { Message, MessageContent, MessageResponse } from '@/components/ai-elements/message';
import { Reasoning, ReasoningContent, ReasoningTrigger } from '@/components/ai-elements/reasoning';
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from '@/components/ai-elements/tool';

import { vscode } from './vscode';

interface UiTool {
  id: string;
  name: string;
  input: unknown;
  output?: unknown;
  ok?: boolean;
  approval?: string;
}

interface UiDiff {
  id: string;
  path: string;
  before: string;
  after: string;
}

const DEFAULT_SETTINGS: SessionSettings = {
  provider: 'anthropic',
  modelId: 'claude-sonnet-4-5',
  mode: 'agent',
  enterBehavior: 'queue',
  autoContext: true,
  reasoningEffort: 'medium',
};

export function App(): React.JSX.Element {
  const [version, setVersion] = useState<string>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [runState, setRunState] = useState<'idle' | 'running' | 'stopping' | 'awaitingApproval'>(
    'idle',
  );
  const [queue, setQueue] = useState<Array<{ id: string; text: string }>>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [tools, setTools] = useState<UiTool[]>([]);
  const [diffs, setDiffs] = useState<UiDiff[]>([]);
  const [settings, setSettings] = useState<SessionSettings>(DEFAULT_SETTINGS);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [notice, setNotice] = useState<string>();
  const [input, setInput] = useState('');
  const [tokenLabel, setTokenLabel] = useState('0 tokens');
  const [plan, setPlan] = useState<PlanState>();
  const [contextItems, setContextItems] = useState<string[]>([]);
  const draggedId = useRef<string>();
  const running = runState !== 'idle';

  useEffect(() => {
    const receive = (event: MessageEvent<HostToWebviewMessage>) => {
      const message = event.data;
      switch (message.type) {
        case 'hello':
          setVersion(message.version);
          break;
        case 'sessionRestored':
          setMessages(message.messages);
          setSettings(message.settings);
          setPlan(message.settings.plan);
          break;
        case 'messageAdded':
        case 'assistantStarted':
          setMessages((current) => [
            ...current.filter((item) => item.id !== message.message.id),
            message.message,
          ]);
          break;
        case 'assistantDelta':
          updateMessage(setMessages, message.runId, (current) => ({
            ...current,
            text: current.text + message.text,
          }));
          break;
        case 'reasoningDelta':
          updateMessage(setMessages, message.runId, (current) => ({
            ...current,
            reasoning: (current.reasoning ?? '') + message.text,
          }));
          break;
        case 'reasoningReplaced':
          updateMessage(setMessages, message.runId, (current) => ({
            ...current,
            reasoning: message.text,
          }));
          break;
        case 'assistantCompleted':
          if (message.interrupted) {
            updateMessage(setMessages, message.id, (current) => ({
              ...current,
              interrupted: true,
            }));
          }
          break;
        case 'runStateChanged':
          setRunState(message.state);
          break;
        case 'queueUpdated':
          setQueue(message.items);
          break;
        case 'suggestions':
          setSuggestions((current) => [
            ...current.filter((item) => item.startsWith('Undo') || item.startsWith('Restore turn')),
            ...message.items,
          ]);
          break;
        case 'toolCallStarted':
          setTools((current) => [
            ...current.filter((tool) => tool.id !== message.callId),
            { id: message.callId, name: message.tool, input: message.input },
          ]);
          break;
        case 'toolCallFinished':
          setTools((current) =>
            current.map((tool) =>
              tool.id === message.callId
                ? { ...tool, output: message.output, ok: message.ok }
                : tool,
            ),
          );
          break;
        case 'toolApprovalRequested':
          setTools((current) =>
            current.map((tool) =>
              tool.id === message.callId ? { ...tool, approval: message.summary } : tool,
            ),
          );
          break;
        case 'diffProposed':
          setDiffs((current) => [
            ...current.filter((diff) => diff.id !== message.diffId),
            {
              id: message.diffId,
              path: message.path,
              before: message.before,
              after: message.after,
            },
          ]);
          break;
        case 'settingsChanged':
          setSettings(message.settings);
          setPlan(message.settings.plan);
          setHasApiKey(message.hasApiKey);
          break;
        case 'modelsUpdated':
          window.dispatchEvent(new CustomEvent('helm-models', { detail: message.models }));
          break;
        case 'contextItems':
          setContextItems(
            message.items.map((item) =>
              item.includes(' ') ? `@${message.kind}:"${item}"` : `@${message.kind}:${item}`,
            ),
          );
          break;
        case 'connectionResult':
          setNotice(`${message.ok ? '✓' : 'Could not connect:'} ${message.message}`);
          break;
        case 'tokenUsage':
          setTokenLabel(
            `${(message.input + message.output).toLocaleString()} tokens · ≈$${message.estimatedCost.toFixed(4)}`,
          );
          break;
        case 'steered':
          setMessages((current) => [
            ...current,
            {
              id: `steer-${message.id}`,
              role: 'system',
              text: `⚡ Steered: ${message.text}`,
              createdAt: Date.now(),
            },
          ]);
          break;
        case 'compacted':
          setNotice(
            `Context compacted from ${message.tokensBefore.toLocaleString()} to ${message.tokensAfter.toLocaleString()} tokens.`,
          );
          break;
        case 'goalChanged':
          setSettings((current) => ({
            ...current,
            ...(message.goal ? { goal: message.goal } : {}),
          }));
          break;
        case 'planChanged':
          setPlan(message.plan);
          break;
        case 'fullAccessConfirmationRequired':
          vscode.postMessage({
            type: 'confirmFullAccess',
            confirmed: window.confirm(
              'Full Access can edit files and run commands without asking. Helm still blocks dangerous commands. Enable it for this workspace?',
            ),
          });
          break;
        case 'undoAvailable':
          setSuggestions((current) => [
            message.label,
            ...current.filter((item) => !item.startsWith('Undo')),
          ]);
          break;
        case 'checkpointAvailable':
          setSuggestions((current) => [
            message.label,
            ...current.filter((item) => !item.startsWith('Restore turn')),
          ]);
          break;
        case 'error':
          if (message.action === 'confirmClear') {
            if (window.confirm(message.message)) vscode.postMessage({ type: 'clearSession' });
          } else {
            setNotice(message.message);
            if (message.action === 'openSettings') setSettingsOpen(true);
          }
          break;
      }
    };
    window.addEventListener('message', receive);
    vscode.postMessage({ type: 'webviewReady' });
    return () => window.removeEventListener('message', receive);
  }, []);

  useEffect(() => {
    const match = /@(file|folder):([^\s]*)$/u.exec(input);
    if (!match) {
      setContextItems([]);
      return;
    }
    vscode.postMessage({
      type: 'requestContextItems',
      kind: match[1] as 'file' | 'folder',
      query: match[2] ?? '',
    });
  }, [input]);

  const slashMatches = useMemo(
    () =>
      input.startsWith('/') && !input.includes(' ') ? filterSlashCommands(input).slice(0, 7) : [],
    [input],
  );
  const mentionMatches = useMemo(() => {
    if (/@(?:file|folder):[^\s]*$/u.test(input)) {
      return contextItems.map((name) => ({ name, hint: 'Workspace match' }));
    }
    return input.endsWith('@') || /@(f|fo|p|t)$/u.test(input)
      ? [
          { name: '@file:', hint: 'Attach a workspace file' },
          { name: '@folder:', hint: 'Attach a folder listing' },
          { name: '@problems', hint: 'Attach VS Code diagnostics' },
          { name: '@terminal', hint: 'Attach the last command output' },
        ]
      : [];
  }, [contextItems, input]);

  const send = (
    kind: 'userMessage' | 'queueMessage' | 'steerMessage' = 'userMessage',
    text = input,
  ) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (trimmed === '/model') setSettingsOpen(true);
    vscode.postMessage({ type: kind, id: crypto.randomUUID(), text: trimmed });
    setInput('');
    setSuggestions([]);
  };

  const chooseSlash = (name: string) => setInput(`/${name}${name === 'goal' ? ' ' : ''}`);
  const chooseMention = (name: string) => {
    setInput((current) => current.replace(/@[^\s]*$/u, name));
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <Compass size={18} />
          <span>Helm</span>
          {version && <small>v{version}</small>}
        </div>
        <div className="top-actions">
          <span className={`mode-dot ${running ? 'active' : ''}`} />
          <span className="model-label" title={`${settings.provider}/${settings.modelId}`}>
            {settings.modelId}
          </span>
          <button
            className="icon-button"
            onClick={() => setSettingsOpen(true)}
            aria-label="Open settings"
          >
            <Settings size={16} />
          </button>
        </div>
      </header>

      {settings.goal && (
        <div className="goal-banner">
          <Sparkles size={14} />
          <span>{settings.goal}</span>
        </div>
      )}

      {notice && (
        <div className="notice" role="status">
          <span>{notice}</span>
          <button onClick={() => setNotice(undefined)} aria-label="Dismiss">
            <X size={14} />
          </button>
        </div>
      )}

      <Conversation className="conversation">
        <ConversationContent className="conversation-content">
          {messages.length === 0 ? (
            <ConversationEmptyState
              icon={<Compass size={38} />}
              title="Your code, under your control"
              description="Bring your own model key. Helm reads the project, explains each action, and asks before changing anything."
            >
              <div className="welcome-actions">
                <button className="primary" onClick={() => setSettingsOpen(true)}>
                  <KeyRound size={15} /> Set up a provider
                </button>
                <button onClick={() => send('userMessage', 'Explain this project')}>
                  Explain this project
                </button>
                <button onClick={() => send('userMessage', '/plan improve the current code')}>
                  Plan an improvement
                </button>
                <button onClick={() => send('userMessage', 'Find important TODOs in this project')}>
                  Find important TODOs
                </button>
              </div>
            </ConversationEmptyState>
          ) : (
            messages.map((message) => (
              <TranscriptMessage
                key={message.id}
                message={message}
                streaming={running && message === messages.at(-1)}
              />
            ))
          )}

          {tools.map((tool) => (
            <ToolCard
              key={tool.id}
              tool={tool}
              approve={(always) => {
                vscode.postMessage({
                  type: 'approveTool',
                  callId: tool.id,
                  ...(always && tool.approval
                    ? { alwaysAllowPattern: commandPattern(tool.approval) }
                    : {}),
                });
                setTools((current) =>
                  current.map((item) => (item.id === tool.id ? withoutApproval(item) : item)),
                );
              }}
              reject={() => vscode.postMessage({ type: 'rejectTool', callId: tool.id })}
            />
          ))}

          {diffs.map((diff) => (
            <DiffCard
              key={diff.id}
              diff={diff}
              decide={(accepted) => {
                vscode.postMessage({
                  type: accepted ? 'applyDiff' : 'rejectDiff',
                  diffId: diff.id,
                });
                setDiffs((current) => current.filter((item) => item.id !== diff.id));
              }}
            />
          ))}

          {plan && plan.steps.length > 0 && (
            <PlanCard
              plan={plan}
              running={running}
              execute={() => vscode.postMessage({ type: 'executePlan' })}
              toggle={(index) => vscode.postMessage({ type: 'togglePlanStep', index })}
              revise={() => setInput('/plan Revise the plan: ')}
              dismiss={() => vscode.postMessage({ type: 'dismissPlan' })}
            />
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <section className="composer-zone">
        {queue.length > 0 && (
          <div className="queue-strip" aria-label="Queued messages">
            <div className="queue-heading">
              <span>Queued · {queue.length}</span>
              <button onClick={() => vscode.postMessage({ type: 'clearQueue' })}>Clear</button>
            </div>
            <div className="queue-chips">
              {queue.map((item) => (
                <div
                  className="queue-chip"
                  draggable
                  key={item.id}
                  onDragStart={() => (draggedId.current = item.id)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => {
                    const source = draggedId.current;
                    if (!source || source === item.id) return;
                    const ids = queue.map((queued) => queued.id);
                    const from = ids.indexOf(source);
                    const to = ids.indexOf(item.id);
                    ids.splice(to, 0, ...ids.splice(from, 1));
                    vscode.postMessage({ type: 'reorderQueue', ids });
                  }}
                >
                  <Menu size={12} />
                  <span>{item.text}</span>
                  <button
                    onClick={() =>
                      vscode.postMessage({ type: 'steerMessage', id: item.id, text: item.text })
                    }
                  >
                    <Zap size={11} />
                  </button>
                  <button
                    onClick={() => vscode.postMessage({ type: 'removeQueuedMessage', id: item.id })}
                  >
                    <X size={11} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {suggestions.length > 0 && (
          <div className="suggestions">
            {suggestions.slice(0, 4).map((suggestion) => (
              <button
                key={suggestion}
                onClick={() =>
                  suggestion.startsWith('Undo')
                    ? vscode.postMessage({ type: 'undoLastChange' })
                    : suggestion.startsWith('Restore turn')
                      ? vscode.postMessage({ type: 'restoreCheckpoint' })
                      : send('userMessage', suggestion)
                }
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}

        <div className="composer-wrap">
          {(slashMatches.length > 0 || mentionMatches.length > 0) && (
            <div className="command-popup">
              {slashMatches.map((command) => (
                <button key={command.name} onClick={() => chooseSlash(command.name)}>
                  <strong>/{command.name}</strong>
                  <span>{command.description}</span>
                </button>
              ))}
              {mentionMatches.map((mention) => (
                <button key={mention.name} onClick={() => chooseMention(mention.name)}>
                  <strong>{mention.name}</strong>
                  <span>{mention.hint}</span>
                </button>
              ))}
            </div>
          )}
          <textarea
            value={input}
            placeholder={
              running
                ? 'Type to queue, or steer the live run…'
                : 'Ask Helm to explain, plan, or change code…'
            }
            rows={Math.min(6, Math.max(2, input.split('\n').length))}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                send();
              } else if (event.key === 'Tab' && running && input.trim()) {
                event.preventDefault();
                send(settings.enterBehavior === 'queue' ? 'steerMessage' : 'queueMessage');
              }
            }}
          />
          <div className="composer-toolbar">
            <div className="composer-left">
              <button
                className="icon-button"
                title="Attach context"
                onClick={() => setInput((current) => `${current}@`)}
              >
                <Paperclip size={15} />
              </button>
              <button
                className={`context-toggle ${settings.autoContext ? 'active' : ''}`}
                title="Include the active file and selection automatically"
                onClick={() =>
                  vscode.postMessage({
                    type: 'setAutoContext',
                    enabled: !settings.autoContext,
                  })
                }
              >
                Context {settings.autoContext ? 'on' : 'off'}
              </button>
              <select
                value={settings.mode}
                onChange={(event) =>
                  vscode.postMessage({ type: 'setMode', mode: event.target.value as ApprovalMode })
                }
                aria-label="Approval mode"
              >
                <option value="chat">Chat</option>
                <option value="agent">Agent</option>
                <option value="fullAccess">Full Access</option>
              </select>
              <span>{tokenLabel}</span>
            </div>
            <div className="composer-actions">
              {running && (
                <button
                  className="steer-button"
                  disabled={!input.trim()}
                  onClick={() => send('steerMessage')}
                >
                  <Zap size={14} /> Steer
                </button>
              )}
              {running ? (
                <button
                  className="stop-button"
                  onClick={() => vscode.postMessage({ type: 'stopRun' })}
                >
                  <CircleStop size={15} /> Stop
                </button>
              ) : queue.length > 0 ? (
                <button
                  className="primary compact"
                  onClick={() => vscode.postMessage({ type: 'resumeQueue' })}
                >
                  <Play size={14} /> Resume
                </button>
              ) : (
                <button
                  className="send-button"
                  disabled={!input.trim()}
                  onClick={() => send()}
                  aria-label="Send"
                >
                  <Send size={15} />
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="composer-hint">
          Enter {running ? settings.enterBehavior : 'sends'} · Shift+Enter newline
          {running ? ' · Tab does the inverse' : ''}
        </div>
      </section>

      {settingsOpen && (
        <SettingsPanel
          settings={settings}
          hasApiKey={hasApiKey}
          close={() => setSettingsOpen(false)}
        />
      )}
    </main>
  );
}

function TranscriptMessage({
  message,
  streaming,
}: {
  message: ChatMessage;
  streaming: boolean;
}): React.JSX.Element {
  if (message.role === 'system') return <div className="steer-marker">{message.text}</div>;
  return (
    <Message from={message.role} className={message.interrupted ? 'interrupted' : undefined}>
      <MessageContent>
        {message.reasoning && (
          <Reasoning isStreaming={streaming}>
            <ReasoningTrigger />
            <ReasoningContent>{message.reasoning}</ReasoningContent>
          </Reasoning>
        )}
        <MessageResponse isAnimating={streaming}>{message.text}</MessageResponse>
        {message.interrupted && <span className="interrupted-label">Stopped</span>}
      </MessageContent>
    </Message>
  );
}

function ToolCard({
  tool,
  approve,
  reject,
}: {
  tool: UiTool;
  approve: (always: boolean) => void;
  reject: () => void;
}): React.JSX.Element {
  const state = tool.approval
    ? 'approval-requested'
    : tool.ok === true
      ? 'output-available'
      : tool.ok === false
        ? 'output-error'
        : 'input-available';
  return (
    <Tool defaultOpen={Boolean(tool.approval)}>
      <ToolHeader
        title={friendlyToolName(tool.name, tool.input)}
        type="dynamic-tool"
        toolName={tool.name}
        state={state}
      />
      <ToolContent>
        <ToolInput input={tool.input} />
        <ToolOutput
          output={tool.ok ? tool.output : undefined}
          errorText={tool.ok === false ? String(tool.output) : undefined}
        />
        {tool.approval && (
          <div className="approval-actions">
            <button className="primary compact" onClick={() => approve(false)}>
              <Check size={13} /> Allow once
            </button>
            <button onClick={() => approve(true)}>Always this pattern</button>
            <button className="danger-text" onClick={reject}>
              Reject
            </button>
          </div>
        )}
      </ToolContent>
    </Tool>
  );
}

function DiffCard({
  diff,
  decide,
}: {
  diff: UiDiff;
  decide: (accepted: boolean) => void;
}): React.JSX.Element {
  const changed = lineDelta(diff.before, diff.after);
  return (
    <section className="diff-card">
      <div>
        <strong>Proposed edit</strong>
        <span>{diff.path}</span>
      </div>
      <small>{changed}</small>
      <div className="approval-actions">
        <button className="primary compact" onClick={() => decide(true)}>
          <Check size={13} /> Accept
        </button>
        <button className="danger-text" onClick={() => decide(false)}>
          Reject
        </button>
      </div>
    </section>
  );
}

function PlanCard({
  plan,
  running,
  execute,
  toggle,
  revise,
  dismiss,
}: {
  plan: PlanState;
  running: boolean;
  execute: () => void;
  toggle: (index: number) => void;
  revise: () => void;
  dismiss: () => void;
}): React.JSX.Element {
  return (
    <section className="plan-card">
      <div className="card-title">
        <Sparkles size={15} /> Plan ready
      </div>
      <ol>
        {plan.steps.map((step, index) => (
          <li key={`${index}-${step.text}`} className={step.completed ? 'complete' : undefined}>
            <label>
              <input
                type="checkbox"
                checked={step.completed}
                disabled={running}
                onChange={() => toggle(index)}
              />
              {step.text}
            </label>
          </li>
        ))}
      </ol>
      <div className="approval-actions">
        <button className="primary compact" disabled={running} onClick={execute}>
          <Play size={13} />{' '}
          {running && plan.executing
            ? 'Executing…'
            : plan.executing
              ? 'Resume plan'
              : plan.steps.every((step) => step.completed)
                ? 'Run again'
                : 'Execute plan'}
        </button>
        <button onClick={revise}>
          <RotateCcw size={13} /> Revise
        </button>
        <button onClick={dismiss}>Done</button>
      </div>
    </section>
  );
}

function SettingsPanel({
  settings,
  hasApiKey,
  close,
}: {
  settings: SessionSettings;
  hasApiKey: boolean;
  close: () => void;
}): React.JSX.Element {
  const [provider, setProvider] = useState(settings.provider);
  const [modelId, setModelId] = useState(settings.modelId);
  const [apiKey, setApiKey] = useState('');
  const [baseURL, setBaseURL] = useState(settings.baseURL ?? defaultBaseURL(settings.provider));
  const [reasoningEffort, setReasoningEffort] = useState(settings.reasoningEffort);
  const [models, setModels] = useState<Array<{ id: string; label: string }>>([]);

  useEffect(() => {
    const receive = (event: Event) => {
      const items = (event as CustomEvent<Array<{ id: string; label: string }>>).detail;
      setModels(items);
      setModelId((current) =>
        items.some((model) => model.id === current) ? current : (items[0]?.id ?? current),
      );
    };
    window.addEventListener('helm-models', receive);
    return () => window.removeEventListener('helm-models', receive);
  }, []);

  useEffect(() => {
    const staticModels = STATIC_MODELS[provider as keyof typeof STATIC_MODELS] ?? [];
    setModels([...staticModels]);
    if (staticModels.length > 0 && !staticModels.some((model) => model.id === modelId)) {
      setModelId(staticModels[0]!.id);
    }
    const nextBaseURL = defaultBaseURL(provider);
    setBaseURL(nextBaseURL);
    vscode.postMessage({
      type: 'requestModels',
      provider,
      ...(nextBaseURL ? { baseURL: nextBaseURL } : {}),
    });
  }, [provider]);

  const profile = resolveModelProfile(modelId);
  const save = () => {
    if (apiKey) vscode.postMessage({ type: 'saveApiKey', provider, key: apiKey });
    vscode.postMessage({
      type: 'saveProviderSettings',
      provider,
      modelId,
      reasoningEffort,
      ...(baseURL ? { baseURL } : {}),
    });
  };
  return (
    <div
      className="settings-backdrop"
      onMouseDown={(event) => event.target === event.currentTarget && close()}
    >
      <section
        className="settings-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Helm settings"
      >
        <header>
          <div>
            <Settings size={17} />
            <strong>Provider setup</strong>
          </div>
          <button className="icon-button" onClick={close}>
            <X size={17} />
          </button>
        </header>
        <p>
          Keys are stored only in VS Code SecretStorage and never written to settings or project
          files.
        </p>
        <label>
          Provider
          <select value={provider} onChange={(event) => setProvider(event.target.value)}>
            {Object.keys(STATIC_MODELS).map((id) => (
              <option key={id} value={id}>
                {providerLabel(id)}
              </option>
            ))}
          </select>
        </label>
        <label>
          API key {provider === 'ollama' && <small>optional</small>}
          <input
            type="password"
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            placeholder={
              hasApiKey && provider === settings.provider ? '•••••••• saved' : 'Paste key'
            }
            autoComplete="off"
          />
        </label>
        {(provider === 'ollama' ||
          ['moonshot', 'zai', 'deepseek', 'dashscope'].includes(provider)) && (
          <label>
            Base URL
            <input value={baseURL} onChange={(event) => setBaseURL(event.target.value)} />
          </label>
        )}
        <label>
          Model
          <div className="model-input-wrap">
            <input
              list="helm-models"
              value={modelId}
              onChange={(event) => setModelId(event.target.value)}
            />
            <ChevronDown size={14} />
          </div>
          <datalist id="helm-models">
            {models.map((model) => (
              <option key={model.id} value={model.id}>
                {model.label}
              </option>
            ))}
          </datalist>
          {(provider === 'openrouter' || provider === 'ollama') && (
            <button
              type="button"
              onClick={() =>
                vscode.postMessage({
                  type: 'requestModels',
                  provider,
                  ...(baseURL ? { baseURL } : {}),
                  ...(apiKey ? { key: apiKey } : {}),
                })
              }
            >
              Refresh model list
            </button>
          )}
        </label>
        <div className="model-meta">
          <span>{profile.contextWindow.toLocaleString()} context</span>
          <span>
            ${profile.costPerMTok.in}/M in · ${profile.costPerMTok.out}/M out
          </span>
          {profile.family !== 'generic' && <span>{profile.family}</span>}
          {profile.costPerMTok.out > 0 && profile.costPerMTok.out < 15 && (
            <span>≈{Math.round(15 / profile.costPerMTok.out)}× cheaper than Claude</span>
          )}
        </div>
        <label>
          Reasoning effort
          <select
            value={reasoningEffort}
            onChange={(event) =>
              setReasoningEffort(event.target.value as 'low' | 'medium' | 'high')
            }
          >
            <option value="low">low</option>
            <option value="medium">medium</option>
            <option value="high">high</option>
          </select>
        </label>
        <footer>
          <button
            onClick={() => {
              save();
              vscode.postMessage({
                type: 'testConnection',
                provider,
                modelId,
                ...(apiKey ? { key: apiKey } : {}),
                ...(baseURL ? { baseURL } : {}),
              });
            }}
          >
            Test connection
          </button>
          <button
            className="primary"
            onClick={() => {
              save();
              close();
            }}
          >
            <Check size={14} /> Save
          </button>
        </footer>
      </section>
    </div>
  );
}

function updateMessage(
  setter: React.Dispatch<React.SetStateAction<ChatMessage[]>>,
  id: string,
  update: (message: ChatMessage) => ChatMessage,
): void {
  setter((current) => current.map((message) => (message.id === id ? update(message) : message)));
}

function withoutApproval(tool: UiTool): UiTool {
  const next = { ...tool };
  delete next.approval;
  return next;
}

function friendlyToolName(name: string, input: unknown): string {
  const record = typeof input === 'object' && input !== null ? input : {};
  const pathValue = Reflect.get(record, 'path');
  const commandValue = Reflect.get(record, 'command');
  const detail =
    typeof pathValue === 'string'
      ? ` · ${pathValue}`
      : typeof commandValue === 'string'
        ? ` · ${commandValue}`
        : '';
  const labels: Record<string, string> = {
    read_file: '📖 Read file',
    list_dir: '📂 Listed folder',
    glob: '🔎 Found files',
    grep: '🔍 Searched code',
    write_file: '✍️ Proposed file',
    edit_file: '🛠️ Proposed edit',
    run_command: '▶️ Ran command',
    fetch_url: '🌐 Fetched URL',
    use_skill: '🧭 Loaded skill',
  };
  return `${labels[name] ?? name}${detail}`;
}

function commandPattern(command: string): string {
  return command.trim().split(/\s+/u).slice(0, 2).join(' ');
}

function lineDelta(before: string, after: string): string {
  const beforeLines = before ? before.split(/\r?\n/u).length : 0;
  const afterLines = after ? after.split(/\r?\n/u).length : 0;
  const delta = afterLines - beforeLines;
  return `${afterLines} lines · ${delta >= 0 ? '+' : ''}${delta}`;
}

function providerLabel(provider: string): string {
  const labels: Record<string, string> = {
    anthropic: 'Anthropic',
    openai: 'OpenAI',
    google: 'Google',
    openrouter: 'OpenRouter',
    ollama: 'Ollama (local)',
    moonshot: 'Moonshot · Kimi',
    zai: 'Z.ai · GLM',
    deepseek: 'DeepSeek',
    dashscope: 'DashScope · Qwen',
  };
  return labels[provider] ?? provider;
}

function defaultBaseURL(provider: string): string {
  const urls: Record<string, string> = {
    ollama: 'http://localhost:11434',
    moonshot: 'https://api.moonshot.ai/v1',
    zai: 'https://api.z.ai/api/paas/v4',
    deepseek: 'https://api.deepseek.com',
    dashscope: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
  };
  return urls[provider] ?? '';
}
