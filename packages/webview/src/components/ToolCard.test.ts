import { describe, expect, it } from 'vitest';

import { friendlyToolName, toolIcon, toolResultSummary } from './ToolCard';
import { shortToolOutput } from './tool-output';

describe('skill tool presentation', () => {
  it('uses the tools Codicon and includes the loaded skill name', () => {
    expect(toolIcon('use_skill')).toBe('tools');
    expect(friendlyToolName('use_skill', { name: 'refactor' })).toBe('Using skill: `refactor`');
  });

  it('keeps failed tool output short enough for a collapsed card', () => {
    expect(shortToolOutput('\nConnection refused\nfull stack')).toBe('Connection refused');
    expect(shortToolOutput({ error: 'Invalid tool input', instruction: 'Retry.' })).toBe(
      'Invalid tool input',
    );
    expect(shortToolOutput('x'.repeat(140))).toBe(`${'x'.repeat(119)}…`);
  });

  it('summarizes successful search output without expanding the card', () => {
    expect(toolResultSummary('grep', 'a.ts:1:hit\nb.ts:2:hit')).toBe('2 results');
    expect(friendlyToolName('glob', { pattern: '**/*.ts' })).toBe('Found files `**/*.ts`');
  });
});
