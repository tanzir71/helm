import type { CodeGraphSettingsState } from '@helm/core/browser';
import { useEffect, useState } from 'react';

import { Icon } from '../Icon';

export interface CodeGraphSectionProps {
  onDelete: () => void;
  onIndex: (addToGitignore: boolean) => void;
  onOpenExternal: (url: string) => void;
  onReindex: () => void;
  onToggle: (enabled: boolean) => void;
  settings: CodeGraphSettingsState;
}

const CODEGRAPH_DOCS = 'https://github.com/colbymchenry/codegraph#language-support';

export function CodeGraphSection({
  onDelete,
  onIndex,
  onOpenExternal,
  onReindex,
  onToggle,
  settings,
}: CodeGraphSectionProps): React.JSX.Element {
  const [addToGitignore, setAddToGitignore] = useState(true);
  const [enabled, setEnabled] = useState(settings.enabled);

  useEffect(() => setEnabled(settings.enabled), [settings.enabled]);

  return (
    <section className="grid gap-3 py-4">
      <div>
        <h2 className="m-0 flex items-center gap-2 font-semibold">
          <Icon name="type-hierarchy" /> Code graph
        </h2>
        <p className="mt-1 mb-0 text-[length:var(--helm-font-size-meta)] text-[var(--helm-description-foreground)]">
          Local tree-sitter index for source, call paths, and change impact.
        </p>
      </div>
      <label className="flex min-w-0 items-start gap-2">
        <input
          checked={enabled}
          onChange={(event) => {
            const next = event.target.checked;
            setEnabled(next);
            onToggle(next);
          }}
          type="checkbox"
        />
        <span className="min-w-0">
          Enable code-graph exploration
          <span className="block break-words text-[length:var(--helm-font-size-meta)] text-[var(--helm-description-foreground)]">
            Adds explore_code in Agent and Full Access modes when an index exists.
          </span>
        </span>
      </label>
      {settings.indexed ? (
        <>
          <dl className="m-0 grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 text-[length:var(--helm-font-size-meta)]">
            <dt className="text-[var(--helm-description-foreground)]">Status</dt>
            <dd className="m-0 text-right">{settings.indexing ? 'Indexing…' : 'Ready'}</dd>
            <dt className="text-[var(--helm-description-foreground)]">Files</dt>
            <dd className="m-0 text-right tabular-nums">{settings.fileCount.toLocaleString()}</dd>
            <dt className="text-[var(--helm-description-foreground)]">Symbols</dt>
            <dd className="m-0 text-right tabular-nums">{settings.symbolCount.toLocaleString()}</dd>
            <dt className="text-[var(--helm-description-foreground)]">Edges</dt>
            <dd className="m-0 text-right tabular-nums">{settings.edgeCount.toLocaleString()}</dd>
            <dt className="text-[var(--helm-description-foreground)]">Last sync</dt>
            <dd className="m-0 text-right">
              {settings.lastSync ? new Date(settings.lastSync).toLocaleString() : 'Unknown'}
            </dd>
            <dt className="text-[var(--helm-description-foreground)]">Runtime</dt>
            <dd className="m-0 text-right">
              {settings.runtime === 'in-process' ? 'Extension host' : 'Bundled CLI'}
            </dd>
          </dl>
          {settings.progress && settings.progress.total > 0 && (
            <p className="m-0 min-w-0 break-words text-[length:var(--helm-font-size-meta)] text-[var(--helm-description-foreground)]">
              {settings.progress.phase}: {settings.progress.current.toLocaleString()}/
              {settings.progress.total.toLocaleString()}
              {settings.progress.currentFile ? ` · ${settings.progress.currentFile}` : ''}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              className="rounded-[var(--helm-radius-control)] border border-[var(--helm-border)] bg-transparent px-2 py-1 hover:bg-[var(--helm-list-hover)] disabled:opacity-60"
              disabled={settings.indexing}
              onClick={onReindex}
              type="button"
            >
              Re-index
            </button>
            <button
              className="border-0 bg-transparent p-1 text-[var(--helm-error)] hover:underline disabled:opacity-60"
              disabled={settings.indexing}
              onClick={onDelete}
              type="button"
            >
              Delete index
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="m-0 text-[length:var(--helm-font-size-meta)] text-[var(--helm-description-foreground)]">
            No index exists. Helm will never create one without your consent.
          </p>
          <label className="flex min-w-0 items-start gap-2">
            <input
              checked={addToGitignore}
              onChange={(event) => setAddToGitignore(event.target.checked)}
              type="checkbox"
            />
            <span className="min-w-0 break-words">
              Add .codegraph/ to .gitignore if this is a Git repository
            </span>
          </label>
          <div>
            <button
              className="rounded-[var(--helm-radius-control)] border-0 bg-[var(--helm-button-background)] px-2 py-1 text-[var(--helm-button-foreground)] hover:bg-[var(--helm-button-hover)] disabled:opacity-60"
              disabled={settings.indexing}
              onClick={() => onIndex(addToGitignore)}
              type="button"
            >
              {settings.indexing ? 'Indexing workspace…' : 'Index workspace'}
            </button>
          </div>
        </>
      )}
      {settings.error && (
        <p
          className="m-0 flex min-w-0 items-start gap-1 break-words text-[length:var(--helm-font-size-meta)] text-[var(--helm-error)]"
          role="alert"
        >
          <Icon className="shrink-0" name="error" /> <span>{settings.error}</span>
        </p>
      )}
      <p className="m-0 text-[length:var(--helm-font-size-meta)] text-[var(--helm-description-foreground)]">
        Supports 20+ languages.{' '}
        <button
          className="border-0 bg-transparent p-0 text-[var(--helm-link)] hover:underline"
          onClick={() => onOpenExternal(CODEGRAPH_DOCS)}
          type="button"
        >
          Language coverage
        </button>
      </p>
    </section>
  );
}
