import type { SessionSettings } from '@helm/core/browser';
import { useEffect, useRef, useState } from 'react';

import { Icon } from '../Icon';

export interface ModelPillProps {
  effort: SessionSettings['reasoningEffort'];
  modelId: string;
  models: ReadonlyArray<{ id: string; label: string }>;
  onChange: (modelId: string, effort: SessionSettings['reasoningEffort']) => void;
}

export function ModelPill({
  effort,
  modelId,
  models,
  onChange,
}: ModelPillProps): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const selectRef = useRef<HTMLSelectElement>(null);
  const shortModel = modelId.includes('/') ? (modelId.split('/').at(-1) ?? modelId) : modelId;

  useEffect(() => {
    if (open) selectRef.current?.focus();
  }, [open]);

  return (
    <div className="relative min-w-0">
      {open && (
        <div
          className="absolute right-0 bottom-[calc(100%+4px)] z-20 grid w-[min(240px,calc(100vw-16px))] gap-2 rounded-[var(--helm-radius-container)] border border-[var(--helm-border)] bg-[var(--helm-widget-background)] p-2 shadow-[var(--helm-popover-shadow)]"
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault();
              setOpen(false);
            }
          }}
          role="dialog"
        >
          <label className="text-[length:var(--helm-font-size-meta)]">
            Model
            <select
              className="mt-1 w-full rounded-[var(--helm-radius-control)] border border-[var(--helm-border)] bg-[var(--helm-input-background)] px-2 py-1 text-[var(--helm-input-foreground)]"
              onChange={(event) => onChange(event.target.value, effort)}
              ref={selectRef}
              value={modelId}
            >
              {!models.some((model) => model.id === modelId) && (
                <option value={modelId}>{modelId}</option>
              )}
              {models.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-[length:var(--helm-font-size-meta)]">
            Reasoning effort
            <select
              className="mt-1 w-full rounded-[var(--helm-radius-control)] border border-[var(--helm-border)] bg-[var(--helm-input-background)] px-2 py-1 text-[var(--helm-input-foreground)]"
              onChange={(event) =>
                onChange(modelId, event.target.value as SessionSettings['reasoningEffort'])
              }
              value={effort}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </label>
        </div>
      )}
      <button
        aria-expanded={open}
        className="flex max-w-[160px] items-center gap-1 rounded-[var(--helm-radius-control)] border-0 bg-transparent px-1.5 py-1 text-[length:var(--helm-font-size-meta)] text-[var(--helm-description-foreground)] hover:bg-[var(--helm-toolbar-hover)] hover:text-[var(--helm-panel-foreground)]"
        onClick={() => setOpen((current) => !current)}
        title={`${modelId} · ${effort}`}
        type="button"
      >
        <span className="min-w-0 truncate">{shortModel}</span>
        <span>· {effort}</span>
        <Icon name="chevron-down" />
      </button>
    </div>
  );
}
