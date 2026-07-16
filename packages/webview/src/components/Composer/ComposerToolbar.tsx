import type { ApprovalMode, SessionSettings } from '@helm/core/browser';

import { Icon } from '../Icon';
import { ModePill } from './ModePill';
import { ModelPill } from './ModelPill';

export interface ComposerToolbarProps {
  canSend: boolean;
  onAttach: () => void;
  onModeChange: (mode: ApprovalMode) => void;
  onOpenModel: () => void;
  onSend: () => void;
  onStop: () => void;
  onToggleAutoContext: () => void;
  running: boolean;
  settings: SessionSettings;
}

export function ComposerToolbar({
  canSend,
  onAttach,
  onModeChange,
  onOpenModel,
  onSend,
  onStop,
  onToggleAutoContext,
  running,
  settings,
}: ComposerToolbarProps): React.JSX.Element {
  return (
    <div className="flex min-w-0 items-center justify-between gap-1 px-1.5 pb-1.5">
      <div className="flex min-w-0 items-center gap-1">
        <button
          aria-label="Attach context"
          className="flex size-6 items-center justify-center rounded-[var(--helm-radius-control)] border-0 bg-transparent p-0 hover:bg-[var(--helm-toolbar-hover)]"
          onClick={onAttach}
          title="Attach context"
          type="button"
        >
          <Icon name="mention" />
        </button>
        <button
          aria-label={`Automatic context ${settings.autoContext ? 'on' : 'off'}`}
          aria-pressed={settings.autoContext}
          className={`flex size-6 items-center justify-center rounded-[var(--helm-radius-control)] border-0 p-0 hover:bg-[var(--helm-toolbar-hover)] ${settings.autoContext ? 'bg-[var(--helm-input-option-active)]' : 'bg-transparent'}`}
          onClick={onToggleAutoContext}
          title="Include active editor context"
          type="button"
        >
          <Icon name="pinned" />
        </button>
      </div>
      <div className="flex min-w-0 items-center justify-end gap-1">
        <ModelPill
          effort={settings.reasoningEffort}
          modelId={settings.modelId}
          onOpen={onOpenModel}
        />
        <ModePill mode={settings.mode} onChange={onModeChange} />
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
