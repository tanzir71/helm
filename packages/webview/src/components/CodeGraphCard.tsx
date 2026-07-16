import type { UiTool } from '@/state/store';
import { useState } from 'react';

import { MessageResponse } from './ai-elements/message';
import { Card } from './Card';
import { Icon } from './Icon';

export interface CodeGraphCardProps {
  tool: UiTool;
}

const stopWords = new Set([
  'what',
  'where',
  'which',
  'when',
  'does',
  'calls',
  'call',
  'work',
  'breaks',
  'change',
  'find',
  'show',
  'the',
  'and',
  'for',
]);

export function CodeGraphCard({ tool }: CodeGraphCardProps): React.JSX.Element {
  const [expanded, setExpanded] = useState(false);
  const input = typeof tool.input === 'object' && tool.input !== null ? tool.input : {};
  const query = Reflect.get(input, 'query');
  const output = typeof tool.output === 'string' ? tool.output : '';
  const symbol = typeof query === 'string' ? primarySymbol(query) : undefined;
  const related = output ? relatedSymbolCount(output, symbol) : 0;

  return (
    <Card>
      <button
        aria-expanded={expanded}
        className="flex w-full min-w-0 items-start gap-2 border-0 bg-transparent p-0 text-left"
        onClick={() => setExpanded((current) => !current)}
        type="button"
      >
        <Icon name="type-hierarchy" />
        <span className="min-w-0 flex-1 break-words">
          Explored code graph
          {symbol ? (
            <>
              : <code>{symbol}</code>
            </>
          ) : null}
          {related > 0 ? ` + ${related} related symbols` : ''}
        </span>
        {tool.ok === undefined && (
          <span className="mt-1 size-1.5 animate-pulse rounded-full bg-[var(--helm-description-foreground)]" />
        )}
        <Icon name={expanded ? 'chevron-down' : 'chevron-right'} />
      </button>
      {expanded && output && (
        <div className="mt-2 min-w-0 max-h-[420px] overflow-auto border-t border-[var(--helm-border)] pt-2">
          <MessageResponse>{output}</MessageResponse>
        </div>
      )}
    </Card>
  );
}

export function primarySymbol(query: string): string | undefined {
  const tokens = query.match(/[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*/gu) ?? [];
  return [...tokens]
    .reverse()
    .find((token) => !stopWords.has(token.toLowerCase()) && token.length > 2);
}

export function relatedSymbolCount(output: string, primary?: string): number {
  const symbols = new Set<string>();
  for (const match of output.matchAll(/`([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)`/gu)) {
    const symbol = match[1];
    if (symbol && symbol !== primary && !symbol.includes('/')) symbols.add(symbol);
  }
  return symbols.size;
}
