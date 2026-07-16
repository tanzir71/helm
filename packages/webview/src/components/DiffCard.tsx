import type { UiDiff } from '@/state/store';

import { Card } from './Card';

export interface DiffCardProps {
  diff: UiDiff;
  onDecide: (accepted: boolean) => void;
}

function lineCounts(before: string, after: string): { added: number; removed: number } {
  const beforeLines = before ? before.split(/\r?\n/u).length : 0;
  const afterLines = after ? after.split(/\r?\n/u).length : 0;
  return {
    added: Math.max(0, afterLines - beforeLines),
    removed: Math.max(0, beforeLines - afterLines),
  };
}

export function DiffCard({ diff, onDecide }: DiffCardProps): React.JSX.Element {
  const counts = lineCounts(diff.before, diff.after);
  const preview = diff.after.split(/\r?\n/u).slice(0, 8);
  return (
    <Card>
      <header className="flex min-w-0 items-center gap-2">
        <strong className="min-w-0 flex-1 truncate font-semibold" title={diff.path}>
          {diff.path}
        </strong>
        <span className="text-[var(--helm-git-added)]">+{counts.added}</span>
        <span className="text-[var(--helm-git-deleted)]">−{counts.removed}</span>
      </header>
      {preview.length > 0 && (
        <pre className="my-2 max-h-[160px] min-w-0 overflow-auto rounded-[var(--helm-radius-control)] bg-[var(--helm-code-background)] p-2 font-[family-name:var(--helm-editor-font-family)] text-[length:var(--helm-font-size-code)]">
          {preview.map((line, index) => (
            <span className="block bg-[var(--helm-diff-inserted)]" key={`${index}:${line}`}>
              + {line}
            </span>
          ))}
        </pre>
      )}
      <footer className="flex flex-wrap gap-2">
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
