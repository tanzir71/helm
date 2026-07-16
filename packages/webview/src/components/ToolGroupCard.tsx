import type { UiTool } from '@/state/store';
import { useState } from 'react';

import { Card } from './Card';
import { Icon } from './Icon';
import { friendlyToolName, toolIcon } from './ToolCard';

export interface ToolGroupCardProps {
  tools: UiTool[];
}

export function ToolGroupCard({ tools }: ToolGroupCardProps): React.JSX.Element {
  const [expanded, setExpanded] = useState(false);
  const fileCount = tools.filter((tool) => tool.name === 'read_file').length;
  const label =
    fileCount === tools.length
      ? `Explored ${tools.length} files`
      : `Explored ${tools.length} resources`;

  return (
    <Card>
      <button
        aria-expanded={expanded}
        className="flex w-full min-w-0 items-center gap-2 border-0 bg-transparent p-0 text-left"
        onClick={() => setExpanded((current) => !current)}
        type="button"
      >
        <Icon name="files" />
        <span className="min-w-0 flex-1">{label}</span>
        <Icon name={expanded ? 'chevron-down' : 'chevron-right'} />
      </button>
      {expanded && (
        <div className="mt-2 grid min-w-0 gap-2 border-t border-[var(--helm-border)] pt-2">
          {tools.map((tool) => (
            <details className="min-w-0" key={tool.id}>
              <summary className="flex min-w-0 cursor-pointer items-start gap-2">
                <Icon name={toolIcon(tool.name)} />
                <span className="min-w-0 break-words">
                  {friendlyToolName(tool.name, tool.input)}
                </span>
              </summary>
              <pre className="mt-1 mb-0 max-h-[240px] min-w-0 overflow-auto rounded-[var(--helm-radius-control)] bg-[var(--helm-code-background)] p-2 whitespace-pre-wrap break-words font-[family-name:var(--helm-editor-font-family)] text-[length:var(--helm-font-size-code)]">
                {typeof tool.output === 'string'
                  ? tool.output
                  : JSON.stringify(tool.output, null, 2)}
              </pre>
            </details>
          ))}
        </div>
      )}
    </Card>
  );
}
