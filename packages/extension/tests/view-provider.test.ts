import { describe, expect, it } from 'vitest';

describe('extension package', () => {
  it('has a smoke-test placeholder until Electron integration is wired', () => {
    expect('helm.chatView').toContain('helm');
  });
});
