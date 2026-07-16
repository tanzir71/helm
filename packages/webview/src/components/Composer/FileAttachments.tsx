import { Icon } from '../Icon';

export interface FileAttachmentsProps {
  items: string[];
  onRemove: (reference: string) => void;
}

function attachmentLabel(reference: string): string {
  return reference.replace(/^@file:/u, '').replace(/^"|"$/gu, '');
}

export function FileAttachments({
  items,
  onRemove,
}: FileAttachmentsProps): React.JSX.Element | null {
  if (items.length === 0) return null;
  return (
    <div
      aria-label="Attached files"
      aria-live="polite"
      className="flex min-w-0 flex-wrap gap-1 px-2 pb-1"
    >
      {items.map((reference) => {
        const label = attachmentLabel(reference);
        return (
          <span
            className="flex min-w-0 max-w-full items-center gap-1 rounded-[var(--helm-radius-control)] bg-[var(--helm-input-option-active)] px-1.5 py-0.5 text-[length:var(--helm-font-size-meta)]"
            key={reference}
          >
            <Icon name="file" />
            <span className="min-w-0 truncate" title={label}>
              {label}
            </span>
            <button
              aria-label={`Remove ${label}`}
              className="flex size-4 shrink-0 items-center justify-center rounded-[var(--helm-radius-control)] border-0 bg-transparent p-0 text-[var(--helm-description-foreground)] hover:bg-[var(--helm-toolbar-hover)] hover:text-[var(--helm-panel-foreground)]"
              onClick={() => onRemove(reference)}
              title={`Remove ${label}`}
              type="button"
            >
              <Icon name="close" />
            </button>
          </span>
        );
      })}
    </div>
  );
}
