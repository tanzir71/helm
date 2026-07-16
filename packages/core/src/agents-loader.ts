import { access, readFile } from 'node:fs/promises';
import path from 'node:path';

export interface AgentInstructionFile {
  path: string;
  content: string;
}

export async function loadAgentInstructions(
  workspaceRoot: string,
  targetPath = workspaceRoot,
): Promise<AgentInstructionFile[]> {
  const root = path.resolve(workspaceRoot);
  const target = path.resolve(targetPath);
  if (!isWithin(root, target)) throw new Error('Target path is outside the workspace.');
  const relative = path.relative(root, target);
  const segments = relative === '' ? [] : relative.split(path.sep);
  const directories = [root];
  let current = root;
  for (const segment of segments.slice(0, -1)) {
    current = path.join(current, segment);
    directories.push(current);
  }
  const files: AgentInstructionFile[] = [];
  for (const directory of directories) {
    const candidate = path.join(directory, 'AGENTS.md');
    try {
      await access(candidate);
      files.push({ path: candidate, content: await readFile(candidate, 'utf8') });
    } catch {
      // AGENTS.md is optional at every level.
    }
  }
  return files;
}

function isWithin(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}
