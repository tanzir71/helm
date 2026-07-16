import type { UiTool } from '@/state/store';
import { describe, expect, it } from 'vitest';

import { groupConsecutiveTools } from './tool-groups';

function tool(id: string, name: string, ok = true): UiTool {
  return { id, input: {}, name, ok };
}

describe('groupConsecutiveTools', () => {
  it('groups adjacent successful exploration calls but not failures or commands', () => {
    const groups = groupConsecutiveTools([
      tool('1', 'read_file'),
      tool('2', 'grep'),
      tool('3', 'run_command'),
      tool('4', 'read_file', false),
    ]);

    expect(groups.map((item) => item.kind)).toEqual(['group', 'single', 'single']);
    expect(groups[0]?.kind === 'group' && groups[0].tools.map((item) => item.id)).toEqual([
      '1',
      '2',
    ]);
  });
});
