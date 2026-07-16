import { describe, expect, it } from 'vitest';

import { friendlyToolName, toolIcon } from './ToolCard';

describe('skill tool presentation', () => {
  it('uses the tools Codicon and includes the loaded skill name', () => {
    expect(toolIcon('use_skill')).toBe('tools');
    expect(friendlyToolName('use_skill', { name: 'refactor' })).toBe('Using skill: `refactor`');
  });
});
