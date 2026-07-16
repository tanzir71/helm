import { describe, expect, it } from 'vitest';

import { createRestoreMessages } from '../src/restore-messages.js';

const settings = {
  provider: 'anthropic' as const,
  modelId: 'claude-sonnet-4-5',
  mode: 'agent' as const,
  enterBehavior: 'queue' as const,
  autoContext: true,
  reasoningEffort: 'medium' as const,
};

describe('createRestoreMessages', () => {
  it('always follows restored content with the authoritative run state', () => {
    const running = createRestoreMessages([], settings, true);
    const idle = createRestoreMessages([], settings, false);

    expect(running.at(-1)).toEqual({ type: 'runStateChanged', state: 'running' });
    expect(idle.at(-1)).toEqual({ type: 'runStateChanged', state: 'idle' });
  });
});
