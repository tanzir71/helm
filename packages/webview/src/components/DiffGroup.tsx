import type { UiDiff } from '@/state/store';

import { Card } from './Card';
import { DiffCard, summarizeDiff } from './DiffCard';

export interface DiffGroupProps {
  diffs: UiDiff[];
  onDecide: (id: string, accepted: boolean) => void;
  onOpen: (id: string) => void;
}

export function DiffGroup({ diffs, onDecide, onOpen }: DiffGroupProps): React.JSX.Element | null {
  if (diffs.length === 0) return null;
  if (diffs.length === 1) {
    const diff = diffs[0]!;
    return (
      <DiffCard
        diff={diff}
        onDecide={(accepted) => onDecide(diff.id, accepted)}
        onOpen={() => onOpen(diff.id)}
      />
    );
  }
  const totals = diffs.reduce(
    (result, diff) => {
      const summary = summarizeDiff(diff.before, diff.after);
      return { added: result.added + summary.added, removed: result.removed + summary.removed };
    },
    { added: 0, removed: 0 },
  );
  return (
    <Card className="grid gap-2">
      <header className="flex min-w-0 items-center gap-2">
        <strong className="min-w-0 flex-1 font-semibold">{diffs.length} proposed files</strong>
        <span className="text-[var(--helm-git-added)]">+{totals.added}</span>
        <span className="text-[var(--helm-git-deleted)]">−{totals.removed}</span>
      </header>
      <div className="grid gap-2">
        {diffs.map((diff) => (
          <DiffCard
            diff={diff}
            key={diff.id}
            onDecide={(accepted) => onDecide(diff.id, accepted)}
            onOpen={() => onOpen(diff.id)}
          />
        ))}
      </div>
      <footer className="flex flex-wrap gap-2">
        <button
          className="rounded-[var(--helm-radius-control)] border-0 bg-[var(--helm-button-background)] px-2 py-1 text-[var(--helm-button-foreground)] hover:bg-[var(--helm-button-hover)]"
          onClick={() => diffs.forEach((diff) => onDecide(diff.id, true))}
          type="button"
        >
          Accept all
        </button>
        <button
          className="rounded-[var(--helm-radius-control)] border border-[var(--helm-border)] bg-transparent px-2 py-1 hover:bg-[var(--helm-list-hover)]"
          onClick={() => diffs.forEach((diff) => onDecide(diff.id, false))}
          type="button"
        >
          Reject all
        </button>
      </footer>
    </Card>
  );
}
