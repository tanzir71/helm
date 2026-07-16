import type { SessionSettings } from '@helm/core/browser';
import { useEffect, useRef, useState } from 'react';

import { Icon } from '../Icon';
import { useAnchoredPopover } from './use-anchored-popover';

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
  const { popoverStyle, triggerRef } = useAnchoredPopover(open);
  const shortModel = modelId.includes('/') ? (modelId.split('/').at(-1) ?? modelId) : modelId;

  useEffect(() => {
    if (open) selectRef.current?.focus();
  }, [open]);

  return (
    <div className="relative min-w-0 flex-1">
      {open && (
        <div
          aria-label="Model and reasoning effort"
          className="fixed z-20 grid max-h-[calc(100vh-16px)] gap-2 overflow-auto rounded-[var(--helm-radius-container)] border border-[var(--helm-border)] bg-[var(--helm-widget-background)] p-2 shadow-[var(--helm-popover-shadow)]"
          data-helm-popover="model"
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault();
              setOpen(false);
            }
          }}
          role="dialog"
          style={popoverStyle}
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
        aria-haspopup="dialog"
        aria-label="Choose model and reasoning effort"
        className="ml-auto flex h-6 w-full min-w-0 max-w-[160px] items-center gap-1 rounded-[var(--helm-radius-control)] border-0 bg-transparent px-1.5 py-0 text-[length:var(--helm-font-size-meta)] text-[var(--helm-description-foreground)] hover:bg-[var(--helm-toolbar-hover)] hover:text-[var(--helm-panel-foreground)]"
        onClick={() => setOpen((current) => !current)}
        title={`${modelId} · ${effort}`}
        ref={triggerRef}
        type="button"
      >
        <span className="min-w-0 flex-1 truncate">{shortModel}</span>
        <span className="helm-model-effort shrink-0 whitespace-nowrap">· {effort}</span>
        <Icon name="chevron-down" />
      </button>
    </div>
  );
}
