import { describe, expect, it } from 'vitest';

import { createPlanPrompt, createPlanStepPrompt, extractPlan } from '../src/workflow.js';

describe('CLI workflows', () => {
  it('turns a task into a read-only planning request', () => {
    expect(createPlanPrompt('Add authentication')).toContain(
      'Produce a numbered implementation plan only',
    );
    expect(createPlanPrompt('Add authentication')).toContain('Do not edit files or run commands');
  });

  it('extracts numbered plan steps and ignores surrounding prose', () => {
    expect(extractPlan('Plan:\n1. Inspect the code\n2) Make the change\nDone.')).toEqual([
      { number: 1, text: 'Inspect the code' },
      { number: 2, text: 'Make the change' },
    ]);
  });

  it('anchors execution to the approved step', () => {
    expect(createPlanStepPrompt(1, 3, { number: 2, text: 'Make the change' })).toBe(
      'Execute approved plan step 2/3: Make the change',
    );
  });
});
