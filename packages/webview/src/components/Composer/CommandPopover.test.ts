import { describe, expect, it } from 'vitest';

import { getCommandOptions } from './CommandPopover';

describe('getCommandOptions', () => {
  it('returns slash commands with typed insertion values', () => {
    expect(getCommandOptions('/pla', [])[0]).toMatchObject({
      kind: 'slash',
      label: '/plan',
      value: 'plan',
    });
  });

  it('returns workspace context matches for a file mention', () => {
    expect(getCommandOptions('@file:sto', ['@file:src/store.ts'])).toEqual([
      {
        description: 'Workspace match',
        id: 'mention-@file:src/store.ts',
        kind: 'mention',
        label: '@file:src/store.ts',
        value: '@file:src/store.ts',
      },
    ]);
  });
});
