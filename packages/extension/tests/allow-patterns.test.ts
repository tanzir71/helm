import { describe, expect, it } from 'vitest';

import {
  allowedDomains,
  commandAllowPattern,
  domainAllowPattern,
  isCommandAllowed,
  isDomainAllowed,
} from '../src/allow-patterns.js';

describe('persisted tool allow patterns', () => {
  it('keeps command and domain scopes distinct', () => {
    const patterns = [commandAllowPattern('pnpm test --watch'), domainAllowPattern('example.com')];
    expect(isCommandAllowed(patterns, 'pnpm test --filter core')).toBe(true);
    expect(isCommandAllowed(patterns, 'pnpm build')).toBe(false);
    expect(isDomainAllowed(patterns, 'docs.example.com')).toBe(true);
    expect(isDomainAllowed(patterns, 'example.org')).toBe(false);
    expect(allowedDomains(patterns)).toEqual(['example.com']);
  });
});
