import type { PlanState } from '@helm/core/browser';

import { Card } from './Card';
import { Icon } from './Icon';

export interface PlanCardProps {
  onDismiss: () => void;
  onExecute: () => void;
  onRevise: () => void;
  onToggle: (index: number) => void;
  plan: PlanState;
  running: boolean;
}

export function PlanCard({
  onDismiss,
  onExecute,
  onRevise,
  onToggle,
  plan,
  running,
}: PlanCardProps): React.JSX.Element {
  return (
    <Card>
      <div className="flex items-center gap-2 font-semibold">
        <Icon name="sparkle" />
        <span>Plan ready</span>
      </div>
      <ol className="my-2 grid list-none gap-1 p-0">
        {plan.steps.map((step, index) => (
          <li className="min-w-0" key={`${index}:${step.text}`}>
            <button
              className={`flex w-full min-w-0 items-start gap-2 border-0 bg-transparent p-0 text-left ${step.completed ? 'text-[var(--helm-description-foreground)] line-through' : ''}`}
              disabled={running}
              onClick={() => onToggle(index)}
              type="button"
            >
              {plan.executing && plan.currentStep === index ? (
                <span className="mt-1 size-1.5 animate-pulse rounded-full bg-[var(--helm-description-foreground)]" />
              ) : (
                <Icon name={step.completed ? 'check' : 'chevron-right'} />
              )}
              <span className="min-w-0 break-words">{step.text}</span>
            </button>
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap gap-2">
        <button
          className="rounded-[var(--helm-radius-control)] border-0 bg-[var(--helm-button-background)] px-2 py-1 text-[var(--helm-button-foreground)] hover:bg-[var(--helm-button-hover)] disabled:opacity-50"
          disabled={running}
          onClick={onExecute}
          type="button"
        >
          Execute plan
        </button>
        <button
          className="rounded-[var(--helm-radius-control)] border border-[var(--helm-border)] bg-transparent px-2 py-1 hover:bg-[var(--helm-list-hover)]"
          onClick={onRevise}
          type="button"
        >
          Revise
        </button>
        <button
          className="border-0 bg-transparent p-1 hover:underline"
          onClick={onDismiss}
          type="button"
        >
          Dismiss
        </button>
      </div>
    </Card>
  );
}
