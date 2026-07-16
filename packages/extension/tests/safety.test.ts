import { describe, expect, it } from 'vitest';

import { isDeniedCommand } from '../src/safety.js';

describe('command denylist', () => {
  it('blocks destructive system commands in every mode', () => {
    expect(isDeniedCommand('rm -rf /')).toBe(true);
    expect(isDeniedCommand(':(){ :|:& };:')).toBe(true);
    expect(isDeniedCommand('sudo shutdown now')).toBe(true);
    expect(isDeniedCommand('echo x > /dev/disk2')).toBe(true);
  });

  it('allows ordinary workspace commands', () => {
    expect(isDeniedCommand('pnpm test')).toBe(false);
    expect(isDeniedCommand('rm -rf dist')).toBe(false);
  });
});
