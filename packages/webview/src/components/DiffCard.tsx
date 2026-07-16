import type { UiDiff } from '@/state/store';

import { Card } from './Card';

export interface DiffCardProps {
  diff: UiDiff;
  onDecide: (accepted: boolean) => void;
  onOpen: () => void;
}

export interface DiffSummary {
  added: number;
  preview: Array<{ kind: 'added' | 'removed'; text: string }>;
  removed: number;
}

export function summarizeDiff(before: string, after: string): DiffSummary {
  const beforeLines = before ? before.split(/\r?\n/u) : [];
  const afterLines = after ? after.split(/\r?\n/u) : [];
  let prefix = 0;
  while (
    prefix < beforeLines.length &&
    prefix < afterLines.length &&
    beforeLines[prefix] === afterLines[prefix]
  ) {
    prefix += 1;
  }
  let suffix = 0;
  while (
    suffix < beforeLines.length - prefix &&
    suffix < afterLines.length - prefix &&
    beforeLines[beforeLines.length - 1 - suffix] === afterLines[afterLines.length - 1 - suffix]
  ) {
    suffix += 1;
  }
  const removedLines = beforeLines.slice(prefix, beforeLines.length - suffix);
  const addedLines = afterLines.slice(prefix, afterLines.length - suffix);
  return {
    added: addedLines.length,
    removed: removedLines.length,
    preview: [
      ...removedLines.map((text) => ({ kind: 'removed' as const, text })),
      ...addedLines.map((text) => ({ kind: 'added' as const, text })),
    ].slice(0, 8),
  };
}

export function DiffCard({ diff, onDecide, onOpen }: DiffCardProps): React.JSX.Element {
  const summary = summarizeDiff(diff.before, diff.after);
  return (
    <Card>
      <header className="flex min-w-0 items-center gap-2">
        <strong className="min-w-0 flex-1 truncate font-semibold" title={diff.path}>
          {diff.path}
        </strong>
        <span className="text-[var(--helm-git-added)]">+{summary.added}</span>
        <span className="text-[var(--helm-git-deleted)]">−{summary.removed}</span>
      </header>
      {summary.preview.length > 0 && (
        <pre className="my-2 max-h-[160px] min-w-0 overflow-auto rounded-[var(--helm-radius-control)] bg-[var(--helm-code-background)] p-2 font-[family-name:var(--helm-editor-font-family)] text-[length:var(--helm-font-size-code)]">
          {summary.preview.map((line, index) => (
            <span
              className={`block ${line.kind === 'added' ? 'bg-[var(--helm-diff-inserted)]' : 'bg-[var(--helm-diff-removed)]'}`}
              key={`${index}:${line.kind}:${line.text}`}
            >
              {line.kind === 'added' ? '+' : '−'} {line.text}
            </span>
          ))}
        </pre>
      )}
      <footer className="flex flex-wrap gap-2">
        <button
          className="rounded-[var(--helm-radius-control)] border border-[var(--helm-border)] bg-transparent px-2 py-1 hover:bg-[var(--helm-list-hover)]"
          onClick={onOpen}
          type="button"
        >
          Open diff
        </button>
        <button
          className="rounded-[var(--helm-radius-control)] border-0 bg-[var(--helm-button-background)] px-2 py-1 text-[var(--helm-button-foreground)] hover:bg-[var(--helm-button-hover)]"
          onClick={() => onDecide(true)}
          type="button"
        >
          Accept
        </button>
        <button
          className="rounded-[var(--helm-radius-control)] border border-[var(--helm-border)] bg-transparent px-2 py-1 hover:bg-[var(--helm-list-hover)]"
          onClick={() => onDecide(false)}
          type="button"
        >
          Reject
        </button>
      </footer>
    </Card>
  );
}
