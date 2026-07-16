import { cp, mkdir, mkdtemp, rename, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

import { findSkillFiles, parseSkill } from '@helm/core';

export interface SkillImportResult {
  imported: string[];
  errors: string[];
}

export type CloneRepository = (url: string, destination: string) => Promise<void>;

export async function importSkillsFolder(
  sourceRoot: string,
  globalRoot: string,
): Promise<SkillImportResult> {
  const skillFiles = await findSkillFiles(sourceRoot);
  if (skillFiles.length === 0) {
    return { imported: [], errors: [`No SKILL.md files found in ${sourceRoot}.`] };
  }

  await mkdir(globalRoot, { recursive: true });
  const stagingRoot = await mkdtemp(path.join(globalRoot, '.helm-skill-import-'));
  const imported: string[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();

  try {
    for (const file of skillFiles) {
      try {
        const skill = await parseSkill(file, 'global');
        const sourceDirectory = path.dirname(file);
        const folderName = path.basename(sourceDirectory);
        if (folderName !== skill.name) {
          throw new Error(`folder must be named ${skill.name}`);
        }
        if (skill.body.length > 2_200) {
          throw new Error('body exceeds 2,200 characters');
        }
        if (seen.has(skill.name)) {
          throw new Error(`duplicate skill name ${skill.name}`);
        }
        seen.add(skill.name);

        const stagedDirectory = path.join(stagingRoot, skill.name);
        const destination = path.join(globalRoot, skill.name);
        if (path.resolve(sourceDirectory) === path.resolve(destination)) {
          throw new Error('skill is already installed globally');
        }
        await cp(sourceDirectory, stagedDirectory, { recursive: true });
        await rm(destination, { force: true, recursive: true });
        await rename(stagedDirectory, destination);
        imported.push(skill.name);
      } catch (error) {
        errors.push(`${file}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  } finally {
    await rm(stagingRoot, { force: true, recursive: true });
  }

  return { imported, errors };
}

export async function importSkillsFromGit(
  rawUrl: string,
  globalRoot: string,
  cloneRepository: CloneRepository = cloneGitRepository,
): Promise<SkillImportResult> {
  const url = validateGitUrl(rawUrl);
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), 'helm-skill-git-'));
  try {
    const repository = path.join(temporaryRoot, 'repository');
    await cloneRepository(url, repository);
    return await importSkillsFolder(repository, globalRoot);
  } finally {
    await rm(temporaryRoot, { force: true, recursive: true });
  }
}

export function validateGitUrl(rawUrl: string): string {
  const value = rawUrl.trim();
  if (/^git@[a-z0-9.-]+:[a-z0-9_./-]+$/iu.test(value)) return value;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error('Enter an HTTPS or SSH Git repository URL.');
  }
  if (!['https:', 'http:', 'ssh:'].includes(url.protocol) || !url.hostname) {
    throw new Error('Enter an HTTPS or SSH Git repository URL.');
  }
  if (url.username || url.password) {
    throw new Error('Git URLs containing credentials are not accepted.');
  }
  return url.toString();
}

async function cloneGitRepository(url: string, destination: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn('git', ['clone', '--depth', '1', '--', url, destination], {
      stdio: ['ignore', 'ignore', 'pipe'],
    });
    let errorOutput = '';
    const timeout = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error('Git clone timed out after 60 seconds.'));
    }, 60_000);

    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (chunk: string) => {
      if (errorOutput.length < 8_000) errorOutput += chunk.slice(0, 8_000 - errorOutput.length);
    });
    child.once('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.once('close', (code) => {
      clearTimeout(timeout);
      if (code === 0) resolve();
      else
        reject(new Error(errorOutput.trim() || `git clone exited with code ${code ?? 'unknown'}`));
    });
  });
}
