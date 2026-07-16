import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { findSkillFiles, parseSkill } from '../src/skill-loader.js';
import { TOOL_SCHEMAS } from '../src/tools.js';

const skillsRoot = new URL('../../extension/assets/skills/', import.meta.url).pathname;

describe('built-in skills pack', () => {
  it('keeps all eleven skills valid, compact, and grounded in real tools and skills', async () => {
    const files = await findSkillFiles(skillsRoot);
    const skills = await Promise.all(files.map((file) => parseSkill(file, 'builtin')));
    const names = new Set(skills.map((skill) => skill.name));
    const toolNames = new Set(Object.keys(TOOL_SCHEMAS));

    expect(skills).toHaveLength(11);
    for (const skill of skills) {
      expect(skill.name).toBe(path.basename(path.dirname(skill.path)));
      const triggerText = /trigger words:\s*([^\n]+)/iu.exec(skill.description)?.[1] ?? '';
      expect(triggerText.split(',').filter((word) => word.trim()).length).toBeGreaterThanOrEqual(4);
      expect(skill.body.length).toBeLessThanOrEqual(2_200);

      const codeTokens = [...skill.body.matchAll(/`([a-z][a-z_]*)`/gu)].map((match) => match[1]!);
      const referencedTools = codeTokens.filter(
        (token) => token.includes('_') && token !== 'api_key',
      );
      for (const tool of referencedTools) expect(toolNames.has(tool)).toBe(true);

      const crossReferences = [...skill.body.matchAll(/\b([a-z][a-z-]+) skill\b/gu)].map(
        (match) => match[1]!,
      );
      for (const crossReference of crossReferences) expect(names.has(crossReference)).toBe(true);
    }
  });
});
