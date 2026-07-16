import { useEffect, useState } from 'react';

import { Icon } from './Icon';

export interface ThinkingProps {
  content: string;
  durationMs?: number | undefined;
  messageId: string;
  startedAt?: number | undefined;
  streaming: boolean;
}

const expandedMessages = new Set<string>();

export function Thinking({
  content,
  durationMs,
  messageId,
  startedAt,
  streaming,
}: ThinkingProps): React.JSX.Element {
  const [expanded, setExpanded] = useState(expandedMessages.has(messageId));
  const [now, setNow] = useState(Date.now());
  const lastLine = content.split(/\r?\n/u).filter(Boolean).at(-1) ?? '';
  const elapsed = durationMs ?? (startedAt ? now - startedAt : 0);
  const seconds = Math.max(1, Math.round(elapsed / 1_000));

  useEffect(() => {
    if (!streaming || !startedAt) return;
    const id = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(id);
  }, [startedAt, streaming]);

  const toggle = () => {
    setExpanded((current) => {
      if (current) expandedMessages.delete(messageId);
      else expandedMessages.add(messageId);
      return !current;
    });
  };

  return (
    <section className="min-w-0 text-[length:var(--helm-font-size-meta)] text-[var(--helm-description-foreground)]">
      <button
        aria-expanded={expanded}
        className="flex w-full min-w-0 items-center gap-1 border-0 bg-transparent p-0 text-left hover:text-[var(--helm-panel-foreground)]"
        onClick={toggle}
        type="button"
      >
        <Icon name="sparkle" />
        <span className={streaming ? 'animate-pulse' : ''}>
          {streaming ? 'Thinking…' : elapsed ? `Thought for ${seconds}s` : 'Thought through this'}
        </span>
        {streaming && !expanded && (
          <span className="min-w-0 flex-1 truncate text-[var(--helm-description-foreground)]">
            {lastLine}
          </span>
        )}
        <Icon className="ml-auto" name={expanded ? 'chevron-down' : 'chevron-right'} />
      </button>
      {expanded && (
        <div className="mt-2 whitespace-pre-wrap border-l-2 border-[var(--helm-border)] pl-2">
          {content}
        </div>
      )}
    </section>
  );
}
