import { describe, expect, it } from 'vitest';

import { fallbackSuggestions } from '../src/suggestions.js';

describe('suggestion fallbacks', () => {
  it('adapts to errors, diffs, commands, plans, and ordinary responses', () => {
    expect(fallbackSuggestions({ text: '', error: true })).toContain('Explain the error');
    expect(fallbackSuggestions({ text: '', diffApplied: true })).toContain('Undo change');
    expect(fallbackSuggestions({ text: '', tools: ['run_command'] })).toContain(
      'Run related tests',
    );
    expect(fallbackSuggestions({ text: 'Plan steps' })).toContain('Execute the plan');
    expect(fallbackSuggestions({ text: 'Done' })).toContain('What should I do next?');
  });
});
