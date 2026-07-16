import type { UiTool } from '@/state/store';
import { useState } from 'react';

import { ApprovalCard } from './ApprovalCard';
import { Card } from './Card';
import { CodeGraphCard } from './CodeGraphCard';
import { Icon, type IconName } from './Icon';
import { WebCard } from './WebCard';

export interface ToolCardProps {
  onApprove: (always: boolean) => void;
  onReject: () => void;
  onOpenUrl: (url: string) => void;
  tool: UiTool;
}

export function toolIcon(name: string): IconName {
  if (name === 'run_command') return 'terminal';
  if (name === 'grep' || name === 'glob') return 'search';
  if (name === 'list_dir') return 'folder';
  if (name === 'web_search' || name === 'web_fetch' || name === 'fetch_url') return 'globe';
  if (name === 'explore_code') return 'type-hierarchy';
  if (name === 'use_skill') return 'tools';
  return 'file';
}

export function friendlyToolName(name: string, input: unknown): string {
  const record = typeof input === 'object' && input !== null ? input : {};
  const pathValue = Reflect.get(record, 'path');
  const commandValue = Reflect.get(record, 'command');
  const queryValue = Reflect.get(record, 'query');
  const detail =
    typeof pathValue === 'string'
      ? ` \`${pathValue}\``
      : typeof commandValue === 'string'
        ? ` \`${commandValue}\``
        : typeof queryValue === 'string'
          ? ` “${queryValue}”`
          : '';
  const labels: Record<string, string> = {
    read_file: 'Read',
    list_dir: 'Listed folder',
    glob: 'Found files',
    grep: 'Searched code for',
    write_file: 'Proposed file',
    edit_file: 'Proposed edit',
    run_command: 'Ran',
    fetch_url: 'Fetched',
    use_skill: 'Using skill:',
    web_search: 'Searched the web for',
    web_fetch: 'Read',
    explore_code: 'Explored code graph:',
  };
  return `${labels[name] ?? name}${detail}`;
}

export function ToolCard({
  onApprove,
  onOpenUrl,
  onReject,
  tool,
}: ToolCardProps): React.JSX.Element {
  const [expanded, setExpanded] = useState(false);
  if (tool.approval) {
    return (
      <ApprovalCard
        {...(tool.name === 'web_fetch' ? { alwaysLabel: 'Always allow this domain' } : {})}
        detail={tool.approval}
        onAllow={onApprove}
        onDeny={onReject}
      />
    );
  }
  if (tool.name === 'web_search' || tool.name === 'web_fetch') {
    return <WebCard onOpenUrl={onOpenUrl} tool={tool} />;
  }
  if (tool.name === 'explore_code') return <CodeGraphCard tool={tool} />;

  const failed = tool.ok === false;
  return (
    <Card>
      <button
        aria-expanded={expanded}
        className="flex w-full min-w-0 items-center gap-2 border-0 bg-transparent p-0 text-left"
        onClick={() => setExpanded((current) => !current)}
        type="button"
      >
        <Icon
          className={failed ? 'text-[var(--helm-warning)]' : ''}
          name={failed ? 'warning' : toolIcon(tool.name)}
        />
        <span className="min-w-0 flex-1 break-words">
          {friendlyToolName(tool.name, tool.input)}
        </span>
        {tool.ok === undefined && (
          <span className="size-1.5 animate-pulse rounded-full bg-[var(--helm-description-foreground)]" />
        )}
        <Icon name={expanded ? 'chevron-down' : 'chevron-right'} />
      </button>
      {expanded && (
        <div className="mt-2 grid min-w-0 gap-2">
          <pre className="m-0 max-h-[240px] min-w-0 overflow-auto rounded-[var(--helm-radius-control)] bg-[var(--helm-code-background)] p-2 whitespace-pre-wrap break-words font-[family-name:var(--helm-editor-font-family)] text-[length:var(--helm-font-size-code)]">
            {JSON.stringify(tool.input, null, 2)}
          </pre>
          {tool.output !== undefined && (
            <pre className="m-0 max-h-[240px] min-w-0 overflow-auto rounded-[var(--helm-radius-control)] bg-[var(--helm-code-background)] p-2 whitespace-pre-wrap break-words font-[family-name:var(--helm-editor-font-family)] text-[length:var(--helm-font-size-code)]">
              {typeof tool.output === 'string' ? tool.output : JSON.stringify(tool.output, null, 2)}
            </pre>
          )}
        </div>
      )}
    </Card>
  );
}
