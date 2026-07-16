import type { ApprovalMode, SessionSettings } from '@helm/core/browser';

import { Icon } from '../Icon';
import { ModePill } from './ModePill';
import { ModelPill } from './ModelPill';

export interface ComposerToolbarProps {
  canSend: boolean;
  models: ReadonlyArray<{ id: string; label: string }>;
  onAddContext: () => void;
  onAttachFiles: () => void;
  onModelChange: (modelId: string, effort: SessionSettings['reasoningEffort']) => void;
  onModeChange: (mode: ApprovalMode) => void;
  onSend: () => void;
  onStop: () => void;
  running: boolean;
  settings: SessionSettings;
}

export function ComposerToolbar({
  canSend,
  models,
  onAddContext,
  onAttachFiles,
  onModelChange,
  onModeChange,
  onSend,
  onStop,
  running,
  settings,
}: ComposerToolbarProps): React.JSX.Element {
  return (
    <div className="flex min-w-0 items-center gap-1 px-1 pb-1" data-helm-composer-toolbar="true">
      <div className="flex shrink-0 items-center gap-0.5">
        <button
          aria-label="Attach files"
          className="flex size-6 items-center justify-center rounded-[var(--helm-radius-control)] border-0 bg-transparent p-0 hover:bg-[var(--helm-toolbar-hover)]"
          onClick={onAttachFiles}
          title="Attach workspace files"
          type="button"
        >
          <Icon name="files" />
        </button>
        <button
          aria-label="Add context reference"
          className="flex size-6 items-center justify-center rounded-[var(--helm-radius-control)] border-0 bg-transparent p-0 hover:bg-[var(--helm-toolbar-hover)]"
          onClick={onAddContext}
          title="Add @ context reference"
          type="button"
        >
          <Icon name="mention" />
        </button>
      </div>
      <div className="flex min-w-0 flex-1 items-center justify-end gap-0.5">
        <ModelPill
          effort={settings.reasoningEffort}
          modelId={settings.modelId}
          models={models}
          onChange={onModelChange}
        />
        {settings.workflow === 'assist' && (
          <ModePill mode={settings.mode} onChange={onModeChange} />
        )}
        <button
          aria-label={running ? 'Stop run' : 'Send message'}
          className={`flex size-6 shrink-0 items-center justify-center rounded-full border-0 p-0 ${running || canSend ? 'bg-[var(--helm-button-background)] text-[var(--helm-button-foreground)] hover:bg-[var(--helm-button-hover)]' : 'bg-[var(--helm-button-secondary-background)] text-[var(--helm-description-foreground)]'}`}
          disabled={!running && !canSend}
          onClick={running ? onStop : onSend}
          type="button"
        >
          <Icon name={running ? 'stop-circle' : 'send'} size={16} />
        </button>
      </div>
    </div>
  );
}
