import { STATIC_MODELS, type ApprovalMode, type SessionSettings } from '@helm/core/browser';
import { useState } from 'react';

import { Icon } from '../Icon';

export interface DefaultsSectionProps {
  onSave: (defaults: {
    enterBehavior: SessionSettings['enterBehavior'];
    mode: ApprovalMode;
    utilityModel: string;
    modelId: string;
    reasoningEffort: SessionSettings['reasoningEffort'];
  }) => void;
  settings: SessionSettings;
}

const fieldClass =
  'mt-1 w-full rounded-[var(--helm-radius-control)] border border-[var(--helm-border)] bg-[var(--helm-input-background)] px-2 py-1.5 text-[var(--helm-input-foreground)] outline-none focus:border-[var(--helm-focus-border)]';

export function DefaultsSection({ onSave, settings }: DefaultsSectionProps): React.JSX.Element {
  const [mode, setMode] = useState(settings.mode);
  const [enterBehavior, setEnterBehavior] = useState(settings.enterBehavior);
  const [utilityModel, setUtilityModel] = useState(settings.utilityModel ?? '');
  const [modelId, setModelId] = useState(settings.modelId);
  const [reasoningEffort, setReasoningEffort] = useState(settings.reasoningEffort);
  const models = STATIC_MODELS[settings.provider as keyof typeof STATIC_MODELS] ?? [];

  return (
    <section className="grid gap-3 border-b border-[var(--helm-border)] py-4">
      <h2 className="m-0 font-semibold">Defaults</h2>
      <label>
        Model
        <select
          className={fieldClass}
          onChange={(event) => setModelId(event.target.value)}
          value={modelId}
        >
          {models.map((model) => (
            <option key={model.id} value={model.id}>
              {model.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Reasoning effort
        <select
          className={fieldClass}
          onChange={(event) =>
            setReasoningEffort(event.target.value as SessionSettings['reasoningEffort'])
          }
          value={reasoningEffort}
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      </label>
      <label>
        Approval mode
        <select
          className={fieldClass}
          onChange={(event) => setMode(event.target.value as ApprovalMode)}
          value={mode}
        >
          <option value="chat">Chat</option>
          <option value="agent">Agent</option>
          <option value="fullAccess">Full Access</option>
        </select>
      </label>
      {mode === 'fullAccess' && (
        <p className="m-0 flex items-start gap-2 text-[length:var(--helm-font-size-meta)] text-[var(--helm-warning)]">
          <Icon name="warning" /> Full Access skips routine approvals for this workspace.
        </p>
      )}
      <fieldset className="grid gap-1 border-0 p-0">
        <legend className="mb-1">Enter behavior</legend>
        <label className="flex items-start gap-2">
          <input
            checked={enterBehavior === 'queue'}
            name="enter-behavior"
            onChange={() => setEnterBehavior('queue')}
            type="radio"
          />
          <span>
            Enter queues
            <span className="block text-[length:var(--helm-font-size-meta)] text-[var(--helm-description-foreground)]">
              Recommended while an agent is running.
            </span>
          </span>
        </label>
        <label className="flex items-start gap-2">
          <input
            checked={enterBehavior === 'steer'}
            name="enter-behavior"
            onChange={() => setEnterBehavior('steer')}
            type="radio"
          />
          <span>
            Enter steers
            <span className="block text-[length:var(--helm-font-size-meta)] text-[var(--helm-description-foreground)]">
              Codex-style live direction changes.
            </span>
          </span>
        </label>
      </fieldset>
      <label>
        Utility model
        <input
          className={fieldClass}
          onChange={(event) => setUtilityModel(event.target.value)}
          placeholder="provider/model-id (optional)"
          value={utilityModel}
        />
      </label>
      <button
        className="justify-self-start rounded-[var(--helm-radius-control)] border-0 bg-[var(--helm-button-background)] px-2 py-1 text-[var(--helm-button-foreground)] hover:bg-[var(--helm-button-hover)]"
        onClick={() =>
          onSave({
            enterBehavior,
            mode,
            utilityModel: utilityModel.trim(),
            modelId,
            reasoningEffort,
          })
        }
        type="button"
      >
        Save defaults
      </button>
    </section>
  );
}
