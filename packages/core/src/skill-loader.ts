import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';

export interface SkillSummary {
  name: string;
  description: string;
  compatibility?: string;
  path: string;
}

export interface LoadedSkill extends SkillSummary {
  body: string;
}

export class SkillLoader {
  private readonly skills = new Map<string, SkillSummary>();

  async discover(roots: readonly string[]): Promise<SkillSummary[]> {
    this.skills.clear();
    for (const root of roots) {
      for (const file of await findSkillFiles(root)) {
        const skill = await parseSkill(file);
        this.skills.set(skill.name, skill);
      }
    }
    return this.list();
  }

  list(): SkillSummary[] {
    return [...this.skills.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  async load(name: string): Promise<LoadedSkill> {
    const summary = this.skills.get(name);
    if (!summary) throw new Error(`Unknown skill: ${name}`);
    const parsed = await parseSkill(summary.path);
    return parsed;
  }

  promptIndex(): string {
    if (this.skills.size === 0) return 'No skills are active.';
    return this.list()
      .map(
        (skill) =>
          `- ${skill.name}: ${skill.description}${skill.compatibility ? ` (Compatibility: ${skill.compatibility})` : ''}`,
      )
      .join('\n');
  }
}

async function findSkillFiles(root: string): Promise<string[]> {
  const found: string[] = [];
  async function walk(directory: string): Promise<void> {
    let entries;
    try {
      entries = await readdir(directory, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) await walk(fullPath);
      if (entry.isFile() && entry.name === 'SKILL.md') found.push(fullPath);
    }
  }
  await walk(root);
  return found;
}

async function parseSkill(file: string): Promise<LoadedSkill> {
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
  return {
    name,
    description,
    ...(typeof compatibility === 'string' ? { compatibility } : {}),
    path: file,
    body: (match[2] ?? '').trim(),
  };
}
