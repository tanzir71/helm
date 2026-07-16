import type { WebSearchProviderId, WebSettingsState } from '@helm/core/browser';
import { useEffect, useState } from 'react';

import { Icon } from '../Icon';

export interface WebSectionProps {
  connectionResults: Record<string, { message: string; ok: boolean }>;
  onRemoveAllowedDomain: (domain: string) => void;
  onRemoveApiKey: (provider: WebSearchProviderId) => void;
  onSave: (settings: { enabled: boolean; provider: WebSearchProviderId; key?: string }) => void;
  onTest: (provider: WebSearchProviderId, key?: string) => void;
  settings: WebSettingsState;
}

const fieldClass =
  'mt-1 w-full rounded-[var(--helm-radius-control)] border border-[var(--helm-border)] bg-[var(--helm-input-background)] px-2 py-1.5 text-[var(--helm-input-foreground)] focus:border-[var(--helm-focus-border)]';

const providerNames: Record<WebSearchProviderId, string> = {
  tavily: 'Tavily',
  brave: 'Brave',
  exa: 'Exa',
  duckduckgo: 'DuckDuckGo (free)',
};

export function WebSection({
  connectionResults,
  onRemoveAllowedDomain,
  onRemoveApiKey,
  onSave,
  onTest,
  settings,
}: WebSectionProps): React.JSX.Element {
  const [enabled, setEnabled] = useState(settings.enabled);
  const [provider, setProvider] = useState(settings.provider);
  const [apiKey, setApiKey] = useState('');
  const [testing, setTesting] = useState(false);
  const keyState = settings.providerKeys[provider];
  const result = connectionResults[`web:${provider}`];

  useEffect(() => {
    setEnabled(settings.enabled);
    setProvider(settings.provider);
  }, [settings.enabled, settings.provider]);

  useEffect(() => {
    if (testing && result) setTesting(false);
  }, [result, testing]);

  return (
    <section
      className="grid gap-3 border-b border-[var(--helm-border)] py-4"
      data-helm-theme-audit="web"
    >
      <div>
        <h2 className="m-0 flex items-center gap-2 font-semibold">
          <Icon name="globe" /> Web
        </h2>
        <p className="mt-1 mb-0 text-[length:var(--helm-font-size-meta)] text-[var(--helm-description-foreground)]">
          Search is read-only. Page fetches require approval in Agent mode.
        </p>
      </div>
      <label className="flex items-start gap-2">
        <input
          checked={enabled}
          onChange={(event) => setEnabled(event.target.checked)}
          type="checkbox"
        />
        <span>
          Enable built-in web tools
          <span className="block text-[length:var(--helm-font-size-meta)] text-[var(--helm-description-foreground)]">
            Adds web_search and guarded web_fetch to agent runs.
          </span>
        </span>
      </label>
      <label>
        Search provider
        <select
          className={fieldClass}
          onChange={(event) => {
            setProvider(event.target.value as WebSearchProviderId);
            setApiKey('');
          }}
          value={provider}
        >
          {Object.entries(providerNames).map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
      </label>
      {provider !== 'duckduckgo' && (
        <label>
          API key
          <input
            autoComplete="off"
            className={fieldClass}
            onChange={(event) => setApiKey(event.target.value)}
            placeholder={keyState?.configured ? keyState.masked : 'Paste key'}
            type="password"
            value={apiKey}
          />
        </label>
      )}
      <div className="flex flex-wrap gap-2">
        <button
          className="rounded-[var(--helm-radius-control)] border border-[var(--helm-border)] bg-transparent px-2 py-1 hover:bg-[var(--helm-list-hover)]"
          onClick={() => {
            setTesting(true);
            onTest(provider, apiKey || undefined);
          }}
          type="button"
        >
          {testing ? 'Testing…' : 'Test'}
        </button>
        <button
          className="rounded-[var(--helm-radius-control)] border-0 bg-[var(--helm-button-background)] px-2 py-1 text-[var(--helm-button-foreground)] hover:bg-[var(--helm-button-hover)]"
          onClick={() => onSave({ enabled, provider, ...(apiKey ? { key: apiKey } : {}) })}
          type="button"
        >
          Save web settings
        </button>
        {provider !== 'duckduckgo' && keyState?.configured && (
          <button
            className="border-0 bg-transparent p-1 text-[var(--helm-error)] hover:underline"
            onClick={() => onRemoveApiKey(provider)}
            type="button"
          >
            Remove key
          </button>
        )}
      </div>
      {result && (
        <p
          className={`m-0 flex items-start gap-1 text-[length:var(--helm-font-size-meta)] ${result.ok ? 'text-[var(--helm-success)]' : 'text-[var(--helm-error)]'}`}
          role="status"
        >
          <Icon name={result.ok ? 'check' : 'error'} />
          <span className="min-w-0 break-words">{result.message}</span>
        </p>
      )}
      <div className="grid gap-1">
        <strong className="font-semibold">Allowed fetch domains</strong>
        {settings.allowedDomains.length === 0 ? (
          <span className="text-[length:var(--helm-font-size-meta)] text-[var(--helm-description-foreground)]">
            None. You can allow a domain from a fetch approval card.
          </span>
        ) : (
          settings.allowedDomains.map((domain) => (
            <div className="flex min-w-0 items-center gap-2" key={domain}>
              <code className="min-w-0 flex-1 break-all">{domain}</code>
              <button
                aria-label={`Remove allowed domain ${domain}`}
                className="border-0 bg-transparent p-1 hover:bg-[var(--helm-toolbar-hover)]"
                onClick={() => onRemoveAllowedDomain(domain)}
                type="button"
              >
                <Icon name="close" />
              </button>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
