import type { SessionSettings } from '@helm/core/browser';

import { Icon } from '../Icon';
import { CodeGraphSection } from './CodeGraphSection';
import { ProviderSection } from './ProviderSection';
import { SkillsSection } from './SkillsSection';
import { WebSection } from './WebSection';

export interface SettingsViewProps {
  hasApiKey: boolean;
  modelsByProvider: Record<string, Array<{ id: string; label: string }>>;
  onBack: () => void;
  onRequestModels: (provider: string, baseURL: string, key?: string) => void;
  onSaveApiKey: (provider: string, key: string) => void;
  onSaveProviderSettings: (
    provider: string,
    modelId: string,
    baseURL: string,
    reasoningEffort: SessionSettings['reasoningEffort'],
  ) => void;
  onTestConnection: (provider: string, modelId: string, baseURL: string, key?: string) => void;
  settings: SessionSettings;
}

export function SettingsView({
  hasApiKey,
  modelsByProvider,
  onBack,
  onRequestModels,
  onSaveApiKey,
  onSaveProviderSettings,
  onTestConnection,
  settings,
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
          hasApiKey={hasApiKey}
          modelsByProvider={modelsByProvider}
          onRequestModels={onRequestModels}
          onSaveApiKey={onSaveApiKey}
          onSaveSettings={onSaveProviderSettings}
          onTestConnection={onTestConnection}
          settings={settings}
        />
        <WebSection />
        <SkillsSection />
        <CodeGraphSection />
      </div>
    </section>
  );
}
