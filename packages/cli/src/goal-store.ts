import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';

interface GoalEntry {
  goal: string;
  workspace: string;
}

interface GoalDocument {
  goals: Record<string, GoalEntry>;
  version: 1;
}

export class WorkspaceGoalStore {
  readonly filePath: string;

  constructor(home = defaultHelmHome(process.env)) {
    this.filePath = path.join(home, 'goals.json');
  }

  async get(workspace: string): Promise<string | undefined> {
    const document = await this.read();
    return document.goals[workspaceKey(workspace)]?.goal;
  }

  async set(workspace: string, goal: string): Promise<void> {
    const normalizedGoal = goal.trim();
    if (!normalizedGoal) throw new Error('Goal cannot be empty.');
    const document = await this.read();
    const resolvedWorkspace = path.resolve(workspace);
    document.goals[workspaceKey(resolvedWorkspace)] = {
      goal: normalizedGoal,
      workspace: resolvedWorkspace,
    };
    await this.write(document);
  }

  async clear(workspace: string): Promise<boolean> {
    const document = await this.read();
    const key = workspaceKey(workspace);
    if (!document.goals[key]) return false;
    delete document.goals[key];
    await this.write(document);
    return true;
  }

  private async read(): Promise<GoalDocument> {
    try {
      const parsed = JSON.parse(await readFile(this.filePath, 'utf8')) as Partial<GoalDocument>;
      if (parsed.version !== 1 || !parsed.goals || typeof parsed.goals !== 'object') {
        throw new Error('unsupported format');
      }
      return { version: 1, goals: parsed.goals };
    } catch (error: unknown) {
      if (isNodeError(error) && error.code === 'ENOENT') return emptyDocument();
      throw new Error(`Could not read Helm goals from ${this.filePath}.`, { cause: error });
    }
  }

  private async write(document: GoalDocument): Promise<void> {
    const directory = path.dirname(this.filePath);
    const temporary = `${this.filePath}.${process.pid}.${randomUUID()}.tmp`;
    await mkdir(directory, { mode: 0o700, recursive: true });
    try {
      await writeFile(temporary, `${JSON.stringify(document, null, 2)}\n`, { mode: 0o600 });
      await rename(temporary, this.filePath);
    } catch (error) {
      await unlink(temporary).catch(() => undefined);
      throw error;
    }
  }
}

export function defaultHelmHome(environment: NodeJS.ProcessEnv): string {
  return environment.HELM_HOME
    ? path.resolve(environment.HELM_HOME)
    : path.join(homedir(), '.helm');
}

function workspaceKey(workspace: string): string {
  return createHash('sha256').update(path.resolve(workspace)).digest('hex');
}

function emptyDocument(): GoalDocument {
  return { goals: {}, version: 1 };
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error;
}
