import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { WorkflowTabs } from './WorkflowTabs';
import { PlanCard } from './PlanCard';

describe('WorkflowTabs', () => {
  it('renders an accessible persisted Solo workflow choice', () => {
    const markup = renderToStaticMarkup(
      <WorkflowTabs disabled={false} onChange={() => undefined} workflow="solo" />,
    );

    expect(markup).toContain('role="tablist"');
    expect(markup).toContain('aria-label="Helm workflow"');
    expect(markup).toContain('Solo');
    expect(markup).toContain('aria-selected="true"');
    expect(markup).toContain('Plan first, approve once, then run toward the goal');
  });

  it('explains the single Solo plan approval handoff', () => {
    const markup = renderToStaticMarkup(
      <PlanCard
        onDismiss={() => undefined}
        onExecute={() => undefined}
        onRevise={() => undefined}
        onToggle={() => undefined}
        plan={{
          executing: false,
          goal: 'Ship onboarding',
          origin: 'solo',
          steps: [{ text: 'Implement onboarding', completed: false }],
        }}
        running={false}
      />,
    );

    expect(markup).toContain('Solo plan ready');
    expect(markup).toContain('Approve &amp; run');
    expect(markup).toContain('make the task your goal');
  });
});
