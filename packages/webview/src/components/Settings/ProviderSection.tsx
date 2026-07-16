import {
  resolveModelProfile,
  STATIC_MODELS,
  type ProviderKeyState,
  type SessionSettings,
} from '@helm/core/browser';
import { useEffect, useState } from 'react';

import { Icon } from '../Icon';

export interface ProviderSectionProps {
  connectionResults: Record<string, { message: string; ok: boolean }>;
  modelsByProvider: Record<string, Array<{ id: string; label: string }>>;
  onRemoveApiKey: (provider: string) => void;
  onRequestModels: (provider: string, baseURL: string, key?: string) => void;
  onSaveApiKey: (provider: string, key: string) => void;
  onSaveSettings: (
    provider: string,
    modelId: string,
    baseURL: string,
    reasoningEffort: SessionSettings['reasoningEffort'],
  ) => void;
  onTestConnection: (provider: string, modelId: string, baseURL: string, key?: string) => void;
  providerKeyStates: Record<string, ProviderKeyState>;
  settings: SessionSettings;
}

const providerNames: Record<string, string> = {
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

const providerURLs: Record<string, string> = {
  ollama: 'http://localhost:11434',
  moonshot: 'https://api.moonshot.ai/v1',
  zai: 'https://api.z.ai/api/paas/v4',
  deepseek: 'https://api.deepseek.com',
  dashscope: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
};

const fieldClass =
  'mt-1 w-full rounded-[var(--helm-radius-control)] border border-[var(--helm-border)] bg-[var(--helm-input-background)] px-2 py-1.5 text-[var(--helm-input-foreground)] focus:border-[var(--helm-focus-border)]';

export function ProviderSection({
  connectionResults,
  modelsByProvider,
  onRemoveApiKey,
  onRequestModels,
  onSaveApiKey,
  onSaveSettings,
  onTestConnection,
  providerKeyStates,
  settings,
}: ProviderSectionProps): React.JSX.Element {
  const [provider, setProvider] = useState(settings.provider);
  const [modelId, setModelId] = useState(settings.modelId);
  const [apiKey, setApiKey] = useState('');
  const [baseURL, setBaseURL] = useState(settings.baseURL ?? providerURLs[settings.provider] ?? '');
  const [reasoningEffort, setReasoningEffort] = useState(settings.reasoningEffort);
  const [testingProvider, setTestingProvider] = useState<string>();
  const models =
    modelsByProvider[provider] ?? STATIC_MODELS[provider as keyof typeof STATIC_MODELS] ?? [];
  const profile = resolveModelProfile(modelId);

  useEffect(() => {
    const nextURL =
      provider === settings.provider ? (settings.baseURL ?? '') : (providerURLs[provider] ?? '');
    const providerModels = STATIC_MODELS[provider as keyof typeof STATIC_MODELS] ?? [];
    setBaseURL(nextURL);
    setApiKey('');
    setReasoningEffort(provider === settings.provider ? settings.reasoningEffort : 'medium');
    setModelId(
      provider === settings.provider
        ? settings.modelId
        : (providerModels[0]?.id ?? settings.modelId),
    );
    onRequestModels(provider, nextURL);
  }, [onRequestModels, provider, settings]);

  useEffect(() => {
    if (testingProvider && connectionResults[testingProvider]) setTestingProvider(undefined);
  }, [connectionResults, testingProvider]);

  const save = () => {
    if (apiKey) onSaveApiKey(provider, apiKey);
    onSaveSettings(provider, modelId, baseURL, reasoningEffort);
  };

  return (
    <section className="grid gap-2 border-b border-[var(--helm-border)] pb-4">
      <div>
        <h2 className="m-0 font-semibold">Providers</h2>
        <p className="mt-1 mb-0 text-[length:var(--helm-font-size-meta)] text-[var(--helm-description-foreground)]">
          Keys stay in VS Code SecretStorage and are never written into this project.
        </p>
      </div>
      <div className="grid gap-1">
        {Object.keys(STATIC_MODELS).map((id) => {
          const keyState = providerKeyStates[id];
          const connectionResult = connectionResults[id];
          const expanded = id === provider;
          return (
            <div
              className="rounded-[var(--helm-radius-control)] border border-[var(--helm-border)]"
              key={id}
            >
              <button
                aria-expanded={expanded}
                className="flex w-full min-w-0 items-center gap-2 border-0 bg-transparent px-2 py-1.5 text-left hover:bg-[var(--helm-list-hover)]"
                onClick={() => setProvider(id)}
                type="button"
              >
                <span className="min-w-0 flex-1 font-semibold">{providerNames[id] ?? id}</span>
                <span className="truncate text-[length:var(--helm-font-size-meta)] text-[var(--helm-description-foreground)]">
                  {keyState?.configured ? keyState.masked : 'Not configured'}
                </span>
                {keyState?.connected && (
                  <Icon className="text-[var(--helm-success)]" name="check" />
                )}
                <Icon name={expanded ? 'chevron-down' : 'chevron-right'} />
              </button>
              {expanded && (
                <div className="grid gap-3 border-t border-[var(--helm-border)] p-2">
                  <label>
                    API key {provider === 'ollama' && '(optional)'}
                    <input
                      autoComplete="off"
                      className={fieldClass}
                      onChange={(event) => setApiKey(event.target.value)}
                      placeholder={keyState?.configured ? keyState.masked : 'Paste key'}
                      type="password"
                      value={apiKey}
                    />
                  </label>
                  {(provider === 'ollama' || provider in providerURLs) && (
                    <label>
                      Base URL
                      <input
                        className={fieldClass}
                        onChange={(event) => setBaseURL(event.target.value)}
                        value={baseURL}
                      />
                    </label>
                  )}
                  <label>
                    Model
                    <input
                      className={fieldClass}
                      list={`helm-models-${provider}`}
                      onChange={(event) => setModelId(event.target.value)}
                      value={modelId}
                    />
                    <datalist id={`helm-models-${provider}`}>
                      {models.map((model) => (
                        <option key={model.id} value={model.id}>
                          {model.label}
                        </option>
                      ))}
                    </datalist>
                  </label>
                  <div className="flex flex-wrap gap-2 text-[length:var(--helm-font-size-meta)] text-[var(--helm-description-foreground)]">
                    <span>{profile.contextWindow.toLocaleString()} context</span>
                    <span>
                      ${profile.costPerMTok.in}/M in · ${profile.costPerMTok.out}/M out
                    </span>
                  </div>
                  <label>
                    Reasoning effort
                    <select
                      className={fieldClass}
                      onChange={(event) =>
                        setReasoningEffort(event.target.value as SessionSettings['reasoningEffort'])
                      }
                      value={reasoningEffort}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="rounded-[var(--helm-radius-control)] border border-[var(--helm-border)] bg-transparent px-2 py-1 hover:bg-[var(--helm-list-hover)]"
                      onClick={() => onRequestModels(provider, baseURL, apiKey || undefined)}
                      type="button"
                    >
                      Refresh models
                    </button>
                    <button
                      className="rounded-[var(--helm-radius-control)] border border-[var(--helm-border)] bg-transparent px-2 py-1 hover:bg-[var(--helm-list-hover)]"
                      onClick={() => {
                        save();
                        setTestingProvider(provider);
                        onTestConnection(provider, modelId, baseURL, apiKey || undefined);
                      }}
                      type="button"
                    >
                      {testingProvider === provider ? 'Testing…' : 'Test connection'}
                    </button>
                    <button
                      className="flex items-center gap-1 rounded-[var(--helm-radius-control)] border-0 bg-[var(--helm-button-background)] px-2 py-1 text-[var(--helm-button-foreground)] hover:bg-[var(--helm-button-hover)]"
                      onClick={save}
                      type="button"
                    >
                      <Icon name="check" /> Save
                    </button>
                    {keyState?.configured && provider !== 'ollama' && (
                      <button
                        className="border-0 bg-transparent p-1 text-[var(--helm-error)] hover:underline"
                        onClick={() => onRemoveApiKey(provider)}
                        type="button"
                      >
                        Remove key
                      </button>
                    )}
                  </div>
                  {connectionResult && (
                    <p
                      className={`m-0 flex items-start gap-1 text-[length:var(--helm-font-size-meta)] ${connectionResult.ok ? 'text-[var(--helm-success)]' : 'text-[var(--helm-error)]'}`}
                      role="status"
                    >
                      <Icon name={connectionResult.ok ? 'check' : 'error'} />
                      <span className="min-w-0 break-words">{connectionResult.message}</span>
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
