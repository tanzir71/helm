import { useEffect, useRef } from 'react';

import { Card } from './Card';
import { Icon } from './Icon';

export interface ApprovalCardProps {
  alwaysLabel?: string;
  detail: string;
  onAllow: (always: boolean) => void;
  onDeny: () => void;
}

export function resolveApprovalShortcut(event: {
  altKey: boolean;
  key: string;
}): 'allow' | 'deny' | undefined {
  if (event.key === 'Escape') return 'deny';
  if (event.key === 'Enter' && event.altKey) return 'allow';
  return undefined;
}

export function ApprovalCard({
  alwaysLabel = 'Always allow this pattern',
  detail,
  onAllow,
  onDeny,
}: ApprovalCardProps): React.JSX.Element {
  const cardRef = useRef<HTMLElement>(null);

  useEffect(() => cardRef.current?.focus(), []);

  return (
    <Card
      aria-label="Tool approval required"
      aria-live="assertive"
      className="border-[var(--helm-warning)]"
      onKeyDown={(event) => {
        const action = resolveApprovalShortcut(event);
        if (action === 'deny') {
          event.preventDefault();
          onDeny();
        } else if (action === 'allow') {
          event.preventDefault();
          onAllow(false);
        }
      }}
      ref={cardRef}
      role="alert"
      tabIndex={0}
    >
      <div className="flex items-start gap-2">
        <Icon className="text-[var(--helm-warning)]" name="warning" />
        <code className="min-w-0 flex-1 whitespace-pre-wrap break-words font-[family-name:var(--helm-editor-font-family)] text-[length:var(--helm-font-size-code)]">
          {detail}
        </code>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          className="rounded-[var(--helm-radius-control)] border-0 bg-[var(--helm-button-background)] px-2 py-1 text-[var(--helm-button-foreground)] hover:bg-[var(--helm-button-hover)]"
          onClick={() => onAllow(false)}
          type="button"
        >
          Allow
        </button>
        <button
          className="rounded-[var(--helm-radius-control)] border border-[var(--helm-border)] bg-transparent px-2 py-1 hover:bg-[var(--helm-list-hover)]"
          onClick={onDeny}
          type="button"
        >
          Deny
        </button>
        <button
          className="border-0 bg-transparent p-1 text-[var(--helm-link)] hover:text-[var(--helm-link-active)]"
          onClick={() => onAllow(true)}
          type="button"
        >
          {alwaysLabel}
        </button>
        <span className="ml-auto text-[var(--helm-description-foreground)]">Alt+Enter · Esc</span>
      </div>
    </Card>
  );
}
