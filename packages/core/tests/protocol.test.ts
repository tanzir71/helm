import { describe, expect, it } from 'vitest';

import { isWebviewToHostMessage } from '../src/protocol.js';

describe('protocol guard', () => {
  it('accepts discriminated messages and rejects non-objects', () => {
    expect(isWebviewToHostMessage({ type: 'webviewReady' })).toBe(true);
    expect(isWebviewToHostMessage(null)).toBe(false);
    expect(isWebviewToHostMessage('webviewReady')).toBe(false);
  });
});
