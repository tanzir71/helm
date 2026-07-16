import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { loadAgentInstructions } from '../src/agents-loader.js';
import { SkillLoader } from '../src/skill-loader.js';

const created: string[] = [];

afterEach(async () => {
  await Promise.all(
    created.splice(0).map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe('instruction loaders', () => {
  it('loads root and nearest nested AGENTS.md files', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'helm-agents-'));
    created.push(root);
    await mkdir(path.join(root, 'src', 'feature'), { recursive: true });
    await writeFile(path.join(root, 'AGENTS.md'), 'root');
    await writeFile(path.join(root, 'src', 'AGENTS.md'), 'nested');
    const result = await loadAgentInstructions(root, path.join(root, 'src', 'feature', 'file.ts'));
    expect(result.map((item) => item.content)).toEqual(['root', 'nested']);
    await expect(loadAgentInstructions(root, tmpdir())).rejects.toThrow('outside');
  });

  it('discovers skill metadata before progressively loading the body', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'helm-skills-'));
    created.push(root);
    const skillDir = path.join(root, 'write-tests');
    await mkdir(skillDir, { recursive: true });
    await writeFile(
      path.join(skillDir, 'SKILL.md'),
      '---\nname: write-tests\ndescription: Write unit tests\ncompatibility: tool calling\n---\n1. Read the code.\n2. Add tests.\n',
    );
    const loader = new SkillLoader();
    expect(await loader.discover([root])).toMatchObject([{ name: 'write-tests' }]);
    expect(loader.promptIndex()).toContain('Compatibility');
    expect((await loader.load('write-tests')).body).toContain('Add tests');
    await expect(loader.load('missing')).rejects.toThrow('Unknown skill');
  });
});
