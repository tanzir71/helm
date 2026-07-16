import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';

export type SkillSource = 'builtin' | 'global' | 'workspace';

export interface SkillRoot {
  path: string;
  source: SkillSource;
}

export interface SkillSummary {
  id: string;
  name: string;
  description: string;
  compatibility?: string;
  path: string;
  source: SkillSource;
  enabled: boolean;
  active: boolean;
}

export interface LoadedSkill extends SkillSummary {
  body: string;
}

export interface SkillDiscoveryError {
  file: string;
  message: string;
}

const sourceRank: Record<SkillSource, number> = {
  builtin: 0,
  global: 1,
  workspace: 2,
};

export class SkillLoader {
  private readonly skills = new Map<string, SkillSummary>();
  private readonly activeSkills = new Map<string, SkillSummary>();
  private errors: SkillDiscoveryError[] = [];

  async discover(
    roots: readonly SkillRoot[],
    disabledIds: ReadonlySet<string> = new Set(),
  ): Promise<SkillSummary[]> {
    this.skills.clear();
    this.activeSkills.clear();
    this.errors = [];
    for (const root of roots) {
      for (const file of await findSkillFiles(root.path)) {
        try {
          const skill = await parseSkill(file, root.source);
          skill.enabled = !disabledIds.has(skill.id);
          this.skills.set(skill.id, skill);
        } catch (error) {
          this.errors.push({
            file,
            message: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }
    this.resolveActiveSkills();
    return this.list();
  }

  list(): SkillSummary[] {
    return [...this.skills.values()].sort(
      (left, right) =>
        sourceRank[right.source] - sourceRank[left.source] || left.name.localeCompare(right.name),
    );
  }

  listActive(): SkillSummary[] {
    return [...this.activeSkills.values()].sort((left, right) =>
      left.name.localeCompare(right.name),
    );
  }

  discoveryErrors(): SkillDiscoveryError[] {
    return [...this.errors];
  }

  setEnabled(id: string, enabled: boolean): void {
    const skill = this.skills.get(id);
    if (!skill) throw new Error(`Unknown skill: ${id}`);
    skill.enabled = enabled;
    this.resolveActiveSkills();
  }

  async load(name: string): Promise<LoadedSkill> {
    const summary = this.activeSkills.get(name);
    if (!summary) {
      const known = [...this.skills.values()].some((skill) => skill.name === name);
      throw new Error(`${known ? 'Disabled' : 'Unknown'} skill: ${name}`);
    }
    const parsed = await parseSkill(summary.path, summary.source);
    return { ...parsed, enabled: summary.enabled, active: summary.active };
  }

  promptIndex(): string {
    if (this.activeSkills.size === 0) return 'No skills are active.';
    return this.listActive()
      .map(
        (skill) =>
          `- ${skill.name}: ${skill.description}${skill.compatibility ? ` (Compatibility: ${skill.compatibility})` : ''}`,
      )
      .join('\n');
  }

  private resolveActiveSkills(): void {
    this.activeSkills.clear();
    for (const skill of this.skills.values()) skill.active = false;
    const candidates = [...this.skills.values()]
      .filter((skill) => skill.enabled)
      .sort(
        (left, right) =>
          sourceRank[right.source] - sourceRank[left.source] || left.path.localeCompare(right.path),
      );
    for (const skill of candidates) {
      if (this.activeSkills.has(skill.name)) continue;
      skill.active = true;
      this.activeSkills.set(skill.name, skill);
    }
  }
}

export async function findSkillFiles(root: string): Promise<string[]> {
  const found: string[] = [];
  async function walk(directory: string): Promise<void> {
    let entries;
    try {
      entries = await readdir(directory, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory() && entry.name !== '.git' && entry.name !== 'node_modules') {
        await walk(fullPath);
      }
      if (entry.isFile() && entry.name === 'SKILL.md') found.push(fullPath);
    }
  }
  await walk(root);
  return found;
}

export async function parseSkill(
  file: string,
  source: SkillSource = 'workspace',
): Promise<LoadedSkill> {
  const content = await readFile(file, 'utf8');
  const match = /^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/u.exec(content);
  if (!match) throw new Error(`Skill has no YAML frontmatter: ${file}`);
  const metadata: unknown = parseYaml(match[1] ?? '');
  if (typeof metadata !== 'object' || metadata === null)
    throw new Error(`Invalid skill metadata: ${file}`);
  const name = Reflect.get(metadata, 'name');
  const description = Reflect.get(metadata, 'description');
  const compatibility = Reflect.get(metadata, 'compatibility');
  if (typeof name !== 'string' || typeof description !== 'string') {
    throw new Error(`Skill requires string name and description: ${file}`);
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(name)) {
    throw new Error(`Skill name must be lowercase kebab-case: ${file}`);
  }
  return {
    id: `${source}:${name}`,
    name,
    description,
    ...(typeof compatibility === 'string' ? { compatibility } : {}),
    path: file,
    source,
    enabled: true,
    active: false,
    body: (match[2] ?? '').trim(),
  };
}
