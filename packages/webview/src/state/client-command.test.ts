import { describe, expect, it } from 'vitest';

import { resolveClientCommand } from './client-command';

describe('resolveClientCommand', () => {
  it('opens settings for the terminal /model command', () => {
    expect(resolveClientCommand('  /model  ')).toBe('openSettings');
  });

  it('leaves incomplete and unrelated commands for the host', () => {
    expect(resolveClientCommand('/mod')).toBeUndefined();
    expect(resolveClientCommand('/model gpt-5')).toBeUndefined();
  });
});
