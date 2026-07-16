import type { ApprovalMode } from '@helm/core/browser';
import { useEffect, useRef, useState } from 'react';

import { Icon } from '../Icon';
import { useAnchoredPopover } from './use-anchored-popover';

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
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const { popoverStyle, triggerRef } = useAnchoredPopover(open);
  const label = modes.find((item) => item.id === mode)?.label ?? mode;

  useEffect(() => {
    if (!open) return;
    const index = Math.max(
      0,
      modes.findIndex((item) => item.id === mode),
    );
    optionRefs.current[index]?.focus();
  }, [mode, open]);

  return (
    <div className="relative shrink-0">
      {open && (
        <div
          aria-label="Agent mode"
          className="fixed z-20 grid max-h-[calc(100vh-16px)] gap-1 overflow-auto rounded-[var(--helm-radius-container)] border border-[var(--helm-border)] bg-[var(--helm-widget-background)] p-1 shadow-[var(--helm-popover-shadow)]"
          data-helm-popover="mode"
          onKeyDown={(event) => {
            const current = optionRefs.current.findIndex(
              (element) => element === document.activeElement,
            );
            if (event.key === 'Escape') {
              event.preventDefault();
              setOpen(false);
            } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              event.preventDefault();
              const delta = event.key === 'ArrowDown' ? 1 : -1;
              const next = (current + delta + modes.length) % modes.length;
              optionRefs.current[next]?.focus();
            } else if (event.key === 'Home' || event.key === 'End') {
              event.preventDefault();
              optionRefs.current[event.key === 'Home' ? 0 : modes.length - 1]?.focus();
            }
          }}
          role="menu"
          style={popoverStyle}
        >
          {modes.map((item, index) => (
            <button
              aria-checked={item.id === mode}
              className={`flex min-w-0 items-start gap-2 rounded-[var(--helm-radius-control)] border-0 p-2 text-left hover:bg-[var(--helm-list-hover)] ${item.id === mode ? 'bg-[var(--helm-list-active)] text-[var(--helm-list-active-foreground)]' : 'bg-transparent'}`}
              key={item.id}
              onClick={() => {
                onChange(item.id);
                setOpen(false);
              }}
              ref={(element) => {
                optionRefs.current[index] = element;
              }}
              role="menuitemradio"
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
        aria-haspopup="menu"
        aria-label="Choose agent mode"
        className="flex h-6 items-center gap-1 whitespace-nowrap rounded-[var(--helm-radius-control)] border-0 bg-transparent px-1.5 py-0 text-[length:var(--helm-font-size-meta)] text-[var(--helm-description-foreground)] hover:bg-[var(--helm-toolbar-hover)] hover:text-[var(--helm-panel-foreground)]"
        onClick={() => setOpen((current) => !current)}
        ref={triggerRef}
        type="button"
      >
        {mode === 'fullAccess' && <Icon className="text-[var(--helm-warning)]" name="warning" />}
        <span>{label}</span>
        <Icon name="chevron-down" />
      </button>
    </div>
  );
}
