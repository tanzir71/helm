import { resolveModelProfile, STATIC_MODELS, type SessionSettings } from '@helm/core/browser';
import { useEffect, useState } from 'react';

import { Icon } from '../Icon';

export interface ProviderSectionProps {
  hasApiKey: boolean;
  modelsByProvider: Record<string, Array<{ id: string; label: string }>>;
  onRequestModels: (provider: string, baseURL: string, key?: string) => void;
  onSaveApiKey: (provider: string, key: string) => void;
  onSaveSettings: (
    provider: string,
    modelId: string,
    baseURL: string,
    reasoningEffort: SessionSettings['reasoningEffort'],
  ) => void;
  onTestConnection: (provider: string, modelId: string, baseURL: string, key?: string) => void;
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
  'mt-1 w-full rounded-[var(--helm-radius-control)] border border-[var(--helm-border)] bg-[var(--helm-input-background)] px-2 py-1.5 text-[var(--helm-input-foreground)] outline-none focus:border-[var(--helm-focus-border)]';

export function ProviderSection({
  hasApiKey,
  modelsByProvider,
  onRequestModels,
  onSaveApiKey,
  onSaveSettings,
  onTestConnection,
  settings,
}: ProviderSectionProps): React.JSX.Element {
  const [provider, setProvider] = useState(settings.provider);
  const [modelId, setModelId] = useState(settings.modelId);
  const [apiKey, setApiKey] = useState('');
  const [baseURL, setBaseURL] = useState(settings.baseURL ?? providerURLs[settings.provider] ?? '');
  const [reasoningEffort, setReasoningEffort] = useState(settings.reasoningEffort);

  const staticModels = STATIC_MODELS[provider as keyof typeof STATIC_MODELS] ?? [];
  const models = modelsByProvider[provider] ?? staticModels;
  const profile = resolveModelProfile(modelId);

  useEffect(() => {
    const nextURL = providerURLs[provider] ?? '';
    setBaseURL(nextURL);
    const providerModels = STATIC_MODELS[provider as keyof typeof STATIC_MODELS] ?? [];
    setModelId((current) =>
      providerModels.some((model) => model.id === current)
        ? current
        : (providerModels[0]?.id ?? current),
    );
    onRequestModels(provider, nextURL);
  }, [onRequestModels, provider]);

  const save = () => {
    if (apiKey) onSaveApiKey(provider, apiKey);
    onSaveSettings(provider, modelId, baseURL, reasoningEffort);
  };

  return (
    <section className="grid gap-3 border-b border-[var(--helm-border)] pb-4">
      <div>
        <h2 className="m-0 font-semibold">Provider</h2>
        <p className="mt-1 mb-0 text-[length:var(--helm-font-size-meta)] text-[var(--helm-description-foreground)]">
          Keys stay in VS Code SecretStorage and are never written into this project.
        </p>
      </div>
      <label>
        Provider
        <select
          className={fieldClass}
          onChange={(event) => setProvider(event.target.value)}
          value={provider}
        >
          {Object.keys(STATIC_MODELS).map((id) => (
            <option key={id} value={id}>
              {providerNames[id] ?? id}
            </option>
          ))}
        </select>
      </label>
      <label>
        API key
        <input
          autoComplete="off"
          className={fieldClass}
          onChange={(event) => setApiKey(event.target.value)}
          placeholder={hasApiKey && provider === settings.provider ? 'Saved securely' : 'Paste key'}
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
          list="helm-models"
          onChange={(event) => setModelId(event.target.value)}
          value={modelId}
        />
        <datalist id="helm-models">
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
            onTestConnection(provider, modelId, baseURL, apiKey || undefined);
          }}
          type="button"
        >
          Test connection
        </button>
        <button
          className="flex items-center gap-1 rounded-[var(--helm-radius-control)] border-0 bg-[var(--helm-button-background)] px-2 py-1 text-[var(--helm-button-foreground)] hover:bg-[var(--helm-button-hover)]"
          onClick={save}
          type="button"
        >
          <Icon name="check" /> Save
        </button>
      </div>
    </section>
  );
}
