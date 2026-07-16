import { describe, expect, it } from 'vitest';

import { filterSlashCommands, parseSlashCommand } from '../src/slash-commands.js';

describe('slash commands', () => {
  it('parses goals and rejects unknown commands', () => {
    expect(parseSlashCommand('/goal ship safely')).toEqual({
      command: 'goal',
      argument: 'ship safely',
    });
    expect(parseSlashCommand('/nope')).toBeUndefined();
  });

  it('fuzzy-filters by command descriptions', () => {
    expect(filterSlashCommands('provider').map((item) => item.name)).toContain('model');
  });
});
