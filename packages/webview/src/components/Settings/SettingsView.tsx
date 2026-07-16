import type {
  ApprovalMode,
  CodeGraphSettingsState,
  ProviderKeyState,
  SessionSettings,
  WebSearchProviderId,
  WebSettingsState,
} from '@helm/core/browser';

import { Icon } from '../Icon';
import { CodeGraphSection } from './CodeGraphSection';
import { DefaultsSection } from './DefaultsSection';
import { ProviderSection } from './ProviderSection';
import { SkillsSection } from './SkillsSection';
import { WebSection } from './WebSection';

export interface SettingsViewProps {
  codeGraphSettings: CodeGraphSettingsState;
  connectionResults: Record<string, { message: string; ok: boolean }>;
  modelsByProvider: Record<string, Array<{ id: string; label: string }>>;
  onBack: () => void;
  onDeleteCodeGraph: () => void;
  onIndexCodeGraph: (addToGitignore: boolean) => void;
  onOpenExternal: (url: string) => void;
  onReindexCodeGraph: () => void;
  onSaveCodeGraphSettings: (enabled: boolean) => void;
  onRemoveApiKey: (provider: string) => void;
  onRemoveAllowedDomain: (domain: string) => void;
  onRemoveWebApiKey: (provider: WebSearchProviderId) => void;
  onRequestModels: (provider: string, baseURL: string, key?: string) => void;
  onSaveApiKey: (provider: string, key: string) => void;
  onSaveProviderSettings: (
    provider: string,
    modelId: string,
    baseURL: string,
    reasoningEffort: SessionSettings['reasoningEffort'],
  ) => void;
  onSaveDefaults: (defaults: {
    enterBehavior: SessionSettings['enterBehavior'];
    mode: ApprovalMode;
    utilityModel: string;
    modelId: string;
    reasoningEffort: SessionSettings['reasoningEffort'];
  }) => void;
  onTestConnection: (provider: string, modelId: string, baseURL: string, key?: string) => void;
  onSaveWebSettings: (settings: {
    enabled: boolean;
    provider: WebSearchProviderId;
    key?: string;
  }) => void;
  onTestWebSearch: (provider: WebSearchProviderId, key?: string) => void;
  providerKeyStates: Record<string, ProviderKeyState>;
  settings: SessionSettings;
  webSettings: WebSettingsState;
}

export function SettingsView({
  codeGraphSettings,
  connectionResults,
  modelsByProvider,
  onBack,
  onDeleteCodeGraph,
  onIndexCodeGraph,
  onOpenExternal,
  onReindexCodeGraph,
  onSaveCodeGraphSettings,
  onRemoveApiKey,
  onRemoveAllowedDomain,
  onRemoveWebApiKey,
  onRequestModels,
  onSaveApiKey,
  onSaveDefaults,
  onSaveProviderSettings,
  onSaveWebSettings,
  onTestConnection,
  onTestWebSearch,
  providerKeyStates,
  settings,
  webSettings,
}: SettingsViewProps): React.JSX.Element {
  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col bg-[var(--helm-panel-background)]">
      <header className="flex h-8 shrink-0 items-center border-b border-[var(--helm-border)] px-2">
        <button
          className="flex items-center gap-1 rounded-[var(--helm-radius-control)] border-0 bg-transparent px-1.5 py-1 hover:bg-[var(--helm-toolbar-hover)]"
          onClick={onBack}
          type="button"
        >
          <Icon name="arrow-left" /> Back
        </button>
        <strong className="ml-2 font-semibold">Settings</strong>
      </header>
      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto p-3">
        <ProviderSection
          connectionResults={connectionResults}
          modelsByProvider={modelsByProvider}
          onRemoveApiKey={onRemoveApiKey}
          onRequestModels={onRequestModels}
          onSaveApiKey={onSaveApiKey}
          onSaveSettings={onSaveProviderSettings}
          onTestConnection={onTestConnection}
          providerKeyStates={providerKeyStates}
          settings={settings}
        />
        <DefaultsSection onSave={onSaveDefaults} settings={settings} />
        <WebSection
          connectionResults={connectionResults}
          onRemoveAllowedDomain={onRemoveAllowedDomain}
          onRemoveApiKey={onRemoveWebApiKey}
          onSave={onSaveWebSettings}
          onTest={onTestWebSearch}
          settings={webSettings}
        />
        <SkillsSection />
        <CodeGraphSection
          onDelete={onDeleteCodeGraph}
          onIndex={onIndexCodeGraph}
          onOpenExternal={onOpenExternal}
          onReindex={onReindexCodeGraph}
          onToggle={onSaveCodeGraphSettings}
          settings={codeGraphSettings}
        />
      </div>
    </section>
  );
}
