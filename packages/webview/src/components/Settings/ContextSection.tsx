import { Icon } from '../Icon';

export interface ContextSectionProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
}

export function ContextSection({ enabled, onToggle }: ContextSectionProps): React.JSX.Element {
  return (
    <section className="grid gap-3 border-b border-[var(--helm-border)] py-4">
      <div>
        <h2 className="m-0 flex items-center gap-2 font-semibold">
          <Icon name="mention" /> Context
        </h2>
        <p className="mt-1 mb-0 text-[length:var(--helm-font-size-meta)] text-[var(--helm-description-foreground)]">
          Control what Helm includes automatically with each message.
        </p>
      </div>
      <label className="flex min-w-0 items-start gap-2">
        <input
          checked={enabled}
          onChange={(event) => onToggle(event.target.checked)}
          type="checkbox"
        />
        <span className="min-w-0">
          Include active editor context
          <span className="block break-words text-[length:var(--helm-font-size-meta)] text-[var(--helm-description-foreground)]">
            Adds the active file path and selected text to each prompt. Files can still be attached
            or referenced with @ when this is off.
          </span>
        </span>
      </label>
    </section>
  );
}
