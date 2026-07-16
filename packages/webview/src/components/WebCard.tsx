import type { UiTool } from '@/state/store';
import { useState } from 'react';

import { Card } from './Card';
import { Icon } from './Icon';

export interface WebCardProps {
  onOpenUrl: (url: string) => void;
  tool: UiTool;
}

interface DisplayResult {
  snippet: string;
  title: string;
  url: string;
}

export function parseFormattedSearchResults(output: string): DisplayResult[] {
  return output.split(/\r?\n/u).flatMap((line) => {
    const match = /^\d+\.\s+(.+?)\s+—\s+(https?:\/\/\S+?)\s+—\s+(.*)$/u.exec(line);
    return match ? [{ title: match[1]!, url: match[2]!, snippet: match[3]!.trim() }] : [];
  });
}

export function WebCard({ onOpenUrl, tool }: WebCardProps): React.JSX.Element {
  const [expanded, setExpanded] = useState(false);
  const input = typeof tool.input === 'object' && tool.input !== null ? tool.input : {};
  const query = Reflect.get(input, 'query');
  const url = Reflect.get(input, 'url');
  const output = typeof tool.output === 'string' ? tool.output : '';
  const results = tool.name === 'web_search' ? parseFormattedSearchResults(output) : [];
  const title =
    tool.name === 'web_search'
      ? `Searched the web${typeof query === 'string' ? ` for “${query}”` : ''}`
      : `Read ${typeof url === 'string' ? url : 'web page'}`;

  return (
    <Card>
      <button
        aria-expanded={expanded}
        className="flex w-full min-w-0 items-start gap-2 border-0 bg-transparent p-0 text-left"
        onClick={() => setExpanded((current) => !current)}
        type="button"
      >
        <Icon name={tool.name === 'web_search' ? 'search' : 'globe'} />
        <span className="min-w-0 flex-1 break-words">{title}</span>
        {tool.ok === undefined && (
          <span className="mt-1 size-1.5 animate-pulse rounded-full bg-[var(--helm-description-foreground)]" />
        )}
        <Icon name={expanded ? 'chevron-down' : 'chevron-right'} />
      </button>
      {expanded && (
        <div className="mt-2 grid min-w-0 gap-2 border-t border-[var(--helm-border)] pt-2">
          {results.length > 0 ? (
            results.map((result) => (
              <button
                className="grid min-w-0 gap-0.5 border-0 bg-transparent p-1 text-left hover:bg-[var(--helm-list-hover)]"
                key={result.url}
                onClick={() => onOpenUrl(result.url)}
                type="button"
              >
                <span className="flex min-w-0 items-center gap-1 text-[var(--helm-link)]">
                  <span className="min-w-0 truncate">{result.title}</span>
                  <Icon name="link-external" />
                </span>
                <span className="line-clamp-2 break-words text-[var(--helm-description-foreground)]">
                  {result.snippet}
                </span>
              </button>
            ))
          ) : (
            <>
              {typeof url === 'string' && (
                <button
                  className="flex min-w-0 items-center gap-1 justify-self-start border-0 bg-transparent p-1 text-[var(--helm-link)] hover:underline"
                  onClick={() => onOpenUrl(url)}
                  type="button"
                >
                  Open source <Icon name="link-external" />
                </button>
              )}
              {output && (
                <pre className="m-0 max-h-[240px] min-w-0 overflow-auto rounded-[var(--helm-radius-control)] bg-[var(--helm-code-background)] p-2 whitespace-pre-wrap break-words font-[family-name:var(--helm-editor-font-family)] text-[length:var(--helm-font-size-code)]">
                  {output}
                </pre>
              )}
            </>
          )}
        </div>
      )}
    </Card>
  );
}
