import { describe, expect, it } from 'vitest';

import { resolveClientCommand } from './client-command';

describe('resolveClientCommand', () => {
  it('opens the requested settings section for terminal commands', () => {
    expect(resolveClientCommand('  /model  ')).toBe('openSettings');
    expect(resolveClientCommand(' /skills ')).toBe('openSkills');
  });

  it('leaves incomplete and unrelated commands for the host', () => {
    expect(resolveClientCommand('/mod')).toBeUndefined();
    expect(resolveClientCommand('/model gpt-5')).toBeUndefined();
  });
});
