import { useState } from 'react';

import { Icon } from './Icon';

export interface ThinkingProps {
  content: string;
  streaming: boolean;
}

export function Thinking({ content, streaming }: ThinkingProps): React.JSX.Element {
  const [expanded, setExpanded] = useState(false);
  const lastLine = content.split(/\r?\n/u).filter(Boolean).at(-1) ?? '';

  return (
    <section className="min-w-0 text-[length:var(--helm-font-size-meta)] text-[var(--helm-description-foreground)]">
      <button
        aria-expanded={expanded}
        className="flex w-full min-w-0 items-center gap-1 border-0 bg-transparent p-0 text-left hover:text-[var(--helm-panel-foreground)]"
        onClick={() => setExpanded((current) => !current)}
        type="button"
      >
        <Icon name="sparkle" />
        <span className={streaming ? 'animate-pulse' : ''}>
          {streaming ? 'Thinking…' : 'Thought through this'}
        </span>
        {streaming && !expanded && (
          <span className="min-w-0 flex-1 truncate text-[var(--helm-description-foreground)]">
            {lastLine}
          </span>
        )}
        <Icon className="ml-auto" name={expanded ? 'chevron-down' : 'chevron-right'} />
      </button>
      {expanded && (
        <div className="mt-2 whitespace-pre-wrap border-l border-[var(--helm-border)] pl-2">
          {content}
        </div>
      )}
    </section>
  );
}
