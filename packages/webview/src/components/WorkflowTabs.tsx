import type { WorkflowMode } from '@helm/core/browser';
import { useRef } from 'react';

export interface WorkflowTabsProps {
  disabled: boolean;
  onChange: (workflow: WorkflowMode) => void;
  workflow: WorkflowMode;
}

const workflows = [
  { id: 'assist', label: 'Assist', title: 'Direct chat and approval-controlled agent work' },
  { id: 'solo', label: 'Solo', title: 'Plan first, approve once, then run toward the goal' },
] as const satisfies ReadonlyArray<{
  id: WorkflowMode;
  label: string;
  title: string;
}>;

export function WorkflowTabs({
  disabled,
  onChange,
  workflow,
}: WorkflowTabsProps): React.JSX.Element {
  const refs = useRef<Record<WorkflowMode, HTMLButtonElement | null>>({
    assist: null,
    solo: null,
  });

  const choose = (next: WorkflowMode) => {
    onChange(next);
    refs.current[next]?.focus();
  };

  return (
    <div
      aria-label="Helm workflow"
      className="grid h-8 shrink-0 grid-cols-2 gap-1 border-b border-[var(--helm-border)] bg-[var(--helm-panel-background)] px-2 py-1"
      role="tablist"
    >
      {workflows.map((item) => (
        <button
          aria-controls="helm-workspace-panel"
          aria-selected={workflow === item.id}
          className={`min-w-0 rounded-[var(--helm-radius-control)] border-0 px-2 py-0 text-[length:var(--helm-font-size-meta)] font-medium ${workflow === item.id ? 'bg-[var(--helm-list-active)] text-[var(--helm-list-active-foreground)]' : 'bg-transparent text-[var(--helm-description-foreground)] hover:bg-[var(--helm-toolbar-hover)] hover:text-[var(--helm-panel-foreground)]'}`}
          disabled={disabled}
          key={item.id}
          onClick={() => choose(item.id)}
          onKeyDown={(event) => {
            if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
              event.preventDefault();
              choose(item.id === 'assist' ? 'solo' : 'assist');
            } else if (event.key === 'Home' || event.key === 'End') {
              event.preventDefault();
              choose(event.key === 'Home' ? 'assist' : 'solo');
            }
          }}
          ref={(element) => {
            refs.current[item.id] = element;
          }}
          role="tab"
          tabIndex={workflow === item.id ? 0 : -1}
          title={item.title}
          type="button"
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
