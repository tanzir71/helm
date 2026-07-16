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

interface DiffOperation {
  kind: 'added' | 'equal' | 'removed';
  text: string;
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
  const operations = diffLines(
    beforeLines.slice(prefix, beforeLines.length - suffix),
    afterLines.slice(prefix, afterLines.length - suffix),
  );
  const preview: DiffSummary['preview'] = [];
  let added = 0;
  let removed = 0;
  let hunk: DiffSummary['preview'] = [];
  const flushHunk = () => {
    if (hunk.length === 0) return;
    const changed = [
      ...hunk.filter((operation) => operation.kind === 'removed'),
      ...hunk.filter((operation) => operation.kind === 'added'),
    ];
    for (const operation of changed) {
      if (preview.length < 8) preview.push({ kind: operation.kind, text: operation.text });
    }
    hunk = [];
  };
  for (const operation of operations) {
    if (operation.kind === 'equal') {
      flushHunk();
      continue;
    }
    if (operation.kind === 'added') added += 1;
    else removed += 1;
    hunk.push({ kind: operation.kind, text: operation.text });
  }
  flushHunk();
  return {
    added,
    removed,
    preview,
  };
}

function diffLines(before: string[], after: string[]): DiffOperation[] {
  if (before.length === 0) return after.map((text) => ({ kind: 'added' as const, text }));
  if (after.length === 0) return before.map((text) => ({ kind: 'removed' as const, text }));

  const maxDistance = before.length + after.length;
  const frontier = new Map<number, number>([[1, 0]]);
  const trace: Array<Map<number, number>> = [];

  for (let distance = 0; distance <= maxDistance; distance += 1) {
    trace.push(new Map(frontier));
    for (let diagonal = -distance; diagonal <= distance; diagonal += 2) {
      const down = frontier.get(diagonal + 1) ?? Number.NEGATIVE_INFINITY;
      const right = frontier.get(diagonal - 1) ?? Number.NEGATIVE_INFINITY;
      let x = diagonal === -distance || (diagonal !== distance && right < down) ? down : right + 1;
      let y = x - diagonal;
      while (x < before.length && y < after.length && before[x] === after[y]) {
        x += 1;
        y += 1;
      }
      frontier.set(diagonal, x);
      if (x >= before.length && y >= after.length) return backtrackDiff(trace, before, after);
    }
  }
  return [];
}

function backtrackDiff(
  trace: Array<Map<number, number>>,
  before: string[],
  after: string[],
): DiffOperation[] {
  const operations: DiffOperation[] = [];
  let x = before.length;
  let y = after.length;

  for (let distance = trace.length - 1; distance >= 0; distance -= 1) {
    const frontier = trace[distance]!;
    const diagonal = x - y;
    const down = frontier.get(diagonal + 1) ?? Number.NEGATIVE_INFINITY;
    const right = frontier.get(diagonal - 1) ?? Number.NEGATIVE_INFINITY;
    const previousDiagonal =
      diagonal === -distance || (diagonal !== distance && right < down)
        ? diagonal + 1
        : diagonal - 1;
    const previousX = frontier.get(previousDiagonal) ?? 0;
    const previousY = previousX - previousDiagonal;

    while (x > previousX && y > previousY) {
      operations.push({ kind: 'equal', text: before[x - 1]! });
      x -= 1;
      y -= 1;
    }
    if (distance === 0) break;
    if (x === previousX) {
      operations.push({ kind: 'added', text: after[y - 1]! });
      y -= 1;
    } else {
      operations.push({ kind: 'removed', text: before[x - 1]! });
      x -= 1;
    }
  }
  return operations.reverse();
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
