import { useState } from 'react';

import { Icon } from './Icon';

export interface CodeGraphNoticeProps {
  gitRepository: boolean;
  indexing: boolean;
  onDismiss: () => void;
  onIndex: (addToGitignore: boolean) => void;
}

export function CodeGraphNotice({
  gitRepository,
  indexing,
  onDismiss,
  onIndex,
}: CodeGraphNoticeProps): React.JSX.Element {
  const [addToGitignore, setAddToGitignore] = useState(gitRepository);

  return (
    <section className="mx-2 mt-2 grid min-w-0 gap-2 rounded-[var(--helm-radius-control)] border border-[var(--helm-border)] p-2 text-[length:var(--helm-font-size-meta)]">
      <div className="flex min-w-0 items-start gap-2">
        <Icon className="mt-0.5 shrink-0" name="type-hierarchy" />
        <p className="m-0 min-w-0 flex-1 break-words">
          Helm can index this workspace into a local code graph for faster, cheaper exploration.
        </p>
      </div>
      {gitRepository && (
        <label className="flex min-w-0 items-start gap-2 pl-6">
          <input
            checked={addToGitignore}
            onChange={(event) => setAddToGitignore(event.target.checked)}
            type="checkbox"
          />
          <span className="min-w-0 break-words">Add .codegraph/ to .gitignore</span>
        </label>
      )}
      <div className="flex flex-wrap gap-2 pl-6">
        <button
          className="rounded-[var(--helm-radius-control)] border-0 bg-[var(--helm-button-background)] px-2 py-1 text-[var(--helm-button-foreground)] hover:bg-[var(--helm-button-hover)] disabled:opacity-60"
          disabled={indexing}
          onClick={() => onIndex(addToGitignore)}
          type="button"
        >
          {indexing ? 'Indexing…' : 'Index'}
        </button>
        <button
          className="rounded-[var(--helm-radius-control)] border border-[var(--helm-border)] bg-transparent px-2 py-1 hover:bg-[var(--helm-list-hover)]"
          onClick={onDismiss}
          type="button"
        >
          Not now
        </button>
      </div>
    </section>
  );
}
