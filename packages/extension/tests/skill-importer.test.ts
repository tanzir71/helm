import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { importSkillsFolder, importSkillsFromGit, validateGitUrl } from '../src/skill-importer.js';

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { force: true, recursive: true })),
  );
});

async function temporaryDirectory(prefix: string): Promise<string> {
  const directory = await mkdtemp(path.join(tmpdir(), prefix));
  temporaryDirectories.push(directory);
  return directory;
}

async function writeSkill(root: string, folder: string, name = folder): Promise<void> {
  const directory = path.join(root, folder);
  await mkdir(directory, { recursive: true });
  await writeFile(
    path.join(directory, 'SKILL.md'),
    `---\nname: ${name}\ndescription: Use this skill when testing skill imports.\n---\n\nFollow the test workflow.\n`,
  );
}

describe('skill folder imports', () => {
  it('copies valid skill directories and reports invalid ones inline', async () => {
    const source = await temporaryDirectory('helm-skill-source-');
    const destination = await temporaryDirectory('helm-skill-destination-');
    await writeSkill(source, 'verify-change');
    await writeSkill(source, 'wrong-folder', 'debug');

    const result = await importSkillsFolder(source, destination);

    expect(result.imported).toEqual(['verify-change']);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('folder must be named debug');
    await expect(
      readFile(path.join(destination, 'verify-change', 'SKILL.md'), 'utf8'),
    ).resolves.toContain('name: verify-change');
  });

  it('uses a shallow-clone callback before importing a repository', async () => {
    const destination = await temporaryDirectory('helm-skill-destination-');
    const seen: string[] = [];
    const result = await importSkillsFromGit(
      'https://github.com/example/skills.git',
      destination,
      async (url, repository) => {
        seen.push(url);
        await writeSkill(repository, 'write-tests');
      },
    );

    expect(seen).toEqual(['https://github.com/example/skills.git']);
    expect(result).toEqual({ imported: ['write-tests'], errors: [] });
  });
});

describe('Git skill URLs', () => {
  it('accepts network Git URLs and rejects local or credential-bearing URLs', () => {
    expect(validateGitUrl('git@github.com:owner/skills.git')).toBe(
      'git@github.com:owner/skills.git',
    );
    expect(validateGitUrl('https://github.com/owner/skills.git')).toBe(
      'https://github.com/owner/skills.git',
    );
    expect(() => validateGitUrl('/tmp/skills')).toThrow('HTTPS or SSH');
    expect(() => validateGitUrl('https://token@github.com/owner/skills.git')).toThrow(
      'credentials',
    );
  });
});
