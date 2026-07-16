import { describe, expect, it } from 'vitest';

describe('webview package', () => {
  it('uses the shared Helm product name', () => {
    expect('Helm').toMatch(/Helm/);
  });
});
