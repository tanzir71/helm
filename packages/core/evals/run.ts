import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { repairJson, RepeatCallGuard } from '../src/index.js';

interface FixtureTask {
  name: string;
  toolCall: string;
  expectedTool: string;
}

const requested = argument('--model') ?? 'deepseek-v4-flash';
const family = familyFor(requested);
const fixturePath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures',
  `${family}.json`,
);
const tasks = JSON.parse(await readFile(fixturePath, 'utf8')) as FixtureTask[];
let success = 0;
let repaired = 0;
let loopIncidents = 0;
const guard = new RepeatCallGuard();

for (const task of tasks) {
  const parsed = repairJson(task.toolCall);
  if (parsed.repaired) repaired += 1;
  const tool = extractTool(parsed.value);
  if (tool === task.expectedTool) success += 1;
  if (guard.record(tool ?? 'invalid', parsed.value).warning) loopIncidents += 1;
}

const rate = Math.round((success / tasks.length) * 100);
process.stdout.write(
  `Helm reliability eval · ${requested}\nTasks: ${tasks.length}\nTool-call success: ${rate}%\nRepairs: ${repaired}\nLoop incidents: ${loopIncidents}\n`,
);
if (success !== tasks.length) process.exitCode = 1;

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function familyFor(model: string): 'kimi' | 'glm' | 'qwen' | 'deepseek' {
  const lower = model.toLowerCase();
  if (lower.includes('kimi')) return 'kimi';
  if (lower.includes('glm')) return 'glm';
  if (lower.includes('qwen')) return 'qwen';
  return 'deepseek';
}

function extractTool(value: unknown): string | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  const tool = Reflect.get(value, 'tool');
  return typeof tool === 'string' ? tool : undefined;
}
