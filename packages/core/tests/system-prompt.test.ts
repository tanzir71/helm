import { describe, expect, it } from 'vitest';

import { resolveModelProfile } from '../src/model-profiles.js';
import { buildSystemPrompt } from '../src/system-prompt.js';

describe('system prompt', () => {
  it('uses explicit MUST rules for open coding profiles and appends dynamic context', () => {
    const prompt = buildSystemPrompt({
      profile: resolveModelProfile('kimi-k2.7-code'),
      mode: 'agent',
      agentsInstructions: 'Use pnpm.',
      skillsIndex: '- write-tests',
      context: 'src/index.ts',
      goal: 'Ship Helm',
    });
    expect(prompt).toContain('MUST');
    expect(prompt.indexOf('Project instructions')).toBeLessThan(
      prompt.indexOf('Persistent session goal'),
    );
  });
});
