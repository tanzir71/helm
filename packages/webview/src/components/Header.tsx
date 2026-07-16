import { Icon } from './Icon';

export interface HeaderProps {
  onNewSession: () => void;
  onOpenSettings: () => void;
}

export function Header({ onNewSession, onOpenSettings }: HeaderProps): React.JSX.Element {
  return (
    <header className="flex h-8 shrink-0 items-center justify-between border-b border-[var(--helm-border)] px-3">
      <span className="text-[length:var(--helm-font-size-meta)] font-semibold uppercase tracking-[0.04em] text-[var(--helm-description-foreground)]">
        Helm
      </span>
      <div className="flex items-center gap-1">
        <button
          aria-label="Start new session"
          className="flex size-6 items-center justify-center rounded-[var(--helm-radius-control)] border-0 bg-transparent p-0 hover:bg-[var(--helm-toolbar-hover)]"
          onClick={onNewSession}
          title="New session"
          type="button"
        >
          <Icon name="add" size={16} />
        </button>
        <button
          aria-label="Open settings"
          className="flex size-6 items-center justify-center rounded-[var(--helm-radius-control)] border-0 bg-transparent p-0 hover:bg-[var(--helm-toolbar-hover)]"
          onClick={onOpenSettings}
          title="Settings"
          type="button"
        >
          <Icon name="settings-gear" size={16} />
        </button>
      </div>
    </header>
  );
}
