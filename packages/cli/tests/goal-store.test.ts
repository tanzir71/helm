import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { WorkspaceGoalStore } from '../src/goal-store.js';

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, {
        force: true,
        recursive: true,
      }),
    ),
  );
});

describe('workspace goal store', () => {
  it('stores goals independently for each working directory', async () => {
    const home = await temporaryHome();
    const store = new WorkspaceGoalStore(home);

    await store.set('/workspace/one', 'Ship version one');
    await store.set('/workspace/two', 'Fix the release');

    expect(await store.get('/workspace/one')).toBe('Ship version one');
    expect(await store.get('/workspace/two')).toBe('Fix the release');
    expect(await store.get('/workspace/three')).toBeUndefined();
  });

  it('persists goals across instances and clears only the current workspace', async () => {
    const home = await temporaryHome();
    await new WorkspaceGoalStore(home).set('/workspace/one', 'Keep this goal');

    const reloaded = new WorkspaceGoalStore(home);
    expect(await reloaded.clear('/workspace/one')).toBe(true);
    expect(await reloaded.clear('/workspace/one')).toBe(false);
    expect(await reloaded.get('/workspace/one')).toBeUndefined();
    expect(JSON.parse(await readFile(path.join(home, 'goals.json'), 'utf8'))).toMatchObject({
      version: 1,
    });
  });
});

async function temporaryHome(): Promise<string> {
  const directory = await mkdtemp(path.join(tmpdir(), 'helm-cli-goals-'));
  temporaryDirectories.push(directory);
  return directory;
}
