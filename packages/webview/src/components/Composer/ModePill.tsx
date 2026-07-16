import type { ApprovalMode } from '@helm/core/browser';
import { useState } from 'react';

import { Icon } from '../Icon';

export interface ModePillProps {
  mode: ApprovalMode;
  onChange: (mode: ApprovalMode) => void;
}

const modes: Array<{ id: ApprovalMode; label: string; description: string }> = [
  { id: 'chat', label: 'Chat', description: 'Read and explain without changing files.' },
  { id: 'agent', label: 'Agent', description: 'Ask before edits and commands.' },
  { id: 'fullAccess', label: 'Full Access', description: 'Run routine actions without asking.' },
];

export function ModePill({ mode, onChange }: ModePillProps): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const label = modes.find((item) => item.id === mode)?.label ?? mode;

  return (
    <div className="relative">
      {open && (
        <div className="absolute right-0 bottom-[calc(100%+4px)] z-20 grid w-[240px] gap-1 rounded-[var(--helm-radius-container)] border border-[var(--helm-border)] bg-[var(--helm-widget-background)] p-1 shadow-[var(--helm-popover-shadow)]">
          {modes.map((item) => (
            <button
              className={`flex min-w-0 items-start gap-2 rounded-[var(--helm-radius-control)] border-0 p-2 text-left hover:bg-[var(--helm-list-hover)] ${item.id === mode ? 'bg-[var(--helm-list-active)] text-[var(--helm-list-active-foreground)]' : 'bg-transparent'}`}
              key={item.id}
              onClick={() => {
                onChange(item.id);
                setOpen(false);
              }}
              type="button"
            >
              <Icon
                className={item.id === 'fullAccess' ? 'text-[var(--helm-warning)]' : ''}
                name={
                  item.id === 'fullAccess'
                    ? 'warning'
                    : item.id === mode
                      ? 'check'
                      : 'chevron-right'
                }
              />
              <span className="min-w-0">
                <strong className="block font-semibold">{item.label}</strong>
                <span className="block text-[length:var(--helm-font-size-meta)] text-[var(--helm-description-foreground)]">
                  {item.description}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
      <button
        aria-expanded={open}
        className="flex items-center gap-1 rounded-[var(--helm-radius-control)] border-0 bg-transparent px-1.5 py-1 text-[length:var(--helm-font-size-meta)] text-[var(--helm-description-foreground)] hover:bg-[var(--helm-toolbar-hover)] hover:text-[var(--helm-panel-foreground)]"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        {mode === 'fullAccess' && <Icon className="text-[var(--helm-warning)]" name="warning" />}
        <span>{label}</span>
        <Icon name="chevron-down" />
      </button>
    </div>
  );
}
