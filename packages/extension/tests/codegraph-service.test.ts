import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  addCodeGraphToGitignore,
  CodeGraphService,
  selectCodeGraphRuntime,
} from '../src/codegraph-service.js';

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { force: true, recursive: true })),
  );
});

async function indexedWorkspace(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), 'helm-codegraph-'));
  temporaryDirectories.push(root);
  await mkdir(path.join(root, '.codegraph'), { recursive: true });
  await writeFile(path.join(root, '.codegraph', 'codegraph.db'), 'fixture');
  return root;
}

describe('CodeGraph runtime selection', () => {
  it('uses the embedded library only on Node 22.5 or newer', () => {
    expect(selectCodeGraphRuntime('20.18.2')).toBe('cli');
    expect(selectCodeGraphRuntime('22.4.1')).toBe('cli');
    expect(selectCodeGraphRuntime('22.5.0')).toBe('in-process');
    expect(selectCodeGraphRuntime('24.1.0')).toBe('in-process');
  });

  it('adds one stable gitignore entry', () => {
    expect(addCodeGraphToGitignore('dist/\n')).toBe('dist/\n.codegraph/\n');
    expect(addCodeGraphToGitignore('dist/')).toBe('dist/\n.codegraph/\n');
    expect(addCodeGraphToGitignore('dist/\n.codegraph/\n')).toBe('dist/\n.codegraph/\n');
    expect(addCodeGraphToGitignore('/.codegraph\n')).toBe('/.codegraph\n');
  });
});

describe('CodeGraph CLI fallback', () => {
  it('runs the exact explore command through the bundled CLI', async () => {
    const root = await indexedWorkspace();
    const runCli = vi.fn(async () => 'source and callers');
    const service = new CodeGraphService(root, {
      nodeVersion: '20.18.2',
      runCli,
    });

    await expect(service.explore('what calls formatUser')).resolves.toBe('source and callers');
    expect(runCli).toHaveBeenCalledWith(
      ['explore', '--path', root, 'what calls formatUser'],
      undefined,
    );
  });

  it('does not invoke CodeGraph when no index exists', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'helm-codegraph-'));
    temporaryDirectories.push(root);
    const runCli = vi.fn(async () => 'unused');
    const service = new CodeGraphService(root, {
      nodeVersion: '20.18.2',
      runCli,
    });

    await expect(service.explore('formatUser')).rejects.toThrow('No code graph index');
    expect(runCli).not.toHaveBeenCalled();
  });
});
