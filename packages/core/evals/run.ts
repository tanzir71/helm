import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  AgentRunner,
  ProviderRegistry,
  repairJson,
  RepeatCallGuard,
  type ProviderId,
  type ToolHost,
  type ToolName,
} from '../src/index.js';

interface FixtureTask {
  name: string;
  toolCall: string;
  expectedTool: string;
}

interface LiveTask {
  name: string;
  prompt: string;
  expectedTool: ToolName;
}

interface WebResearchFixture {
  transcript: Array<{ role: string; tool?: string; answer?: string }>;
}

const LIVE_TASKS: readonly LiveTask[] = [
  {
    name: 'read file',
    prompt: 'Call `read_file` once with path `package.json`.',
    expectedTool: 'read_file',
  },
  {
    name: 'list',
    prompt: 'Call `list_dir` once with path `.`.',
    expectedTool: 'list_dir',
  },
  {
    name: 'grep',
    prompt: 'Call `grep` once with query `TODO` and path `.`.',
    expectedTool: 'grep',
  },
  {
    name: 'glob',
    prompt: 'Call `glob` once with pattern `**/*.ts` and path `.`.',
    expectedTool: 'glob',
  },
  {
    name: 'edit',
    prompt:
      'Call `edit_file` once with path `eval-target.ts`, old_text `before`, and new_text `after`.',
    expectedTool: 'edit_file',
  },
  {
    name: 'write',
    prompt: 'Call `write_file` once with path `eval-target.ts` and content `export {};`.',
    expectedTool: 'write_file',
  },
  {
    name: 'command',
    prompt: 'Call `run_command` once with command `pwd`.',
    expectedTool: 'run_command',
  },
  {
    name: 'fetch',
    prompt: 'Call `fetch_url` once with URL `https://example.com`.',
    expectedTool: 'fetch_url',
  },
  {
    name: 'skill',
    prompt: 'Call `use_skill` once with name `write-tests`.',
    expectedTool: 'use_skill',
  },
  {
    name: 'read range',
    prompt: 'Call `read_file` once with path `package.json`, start_line 1, and end_line 5.',
    expectedTool: 'read_file',
  },
];

const evalHost: ToolHost = {
  execute: async (toolName) => `Eval stub completed ${toolName}.`,
  loadSkill: async (name) => `Eval skill loaded: ${name}.`,
};

const requested = argument('--model') ?? 'deepseek-v4-flash';
if (flag('--live')) await runLive(requested);
else await runFixtures(requested);

async function runFixtures(modelId: string): Promise<void> {
  const family = familyFor(modelId);
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
  report(modelId, 'recorded fixture', tasks.length, success, repaired, loopIncidents);
  const webFixture = JSON.parse(
    await readFile(
      path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', 'web-research.json'),
      'utf8',
    ),
  ) as WebResearchFixture;
  const assistantTurns = webFixture.transcript.filter((turn) => turn.role === 'assistant');
  const webFlowPasses =
    assistantTurns[0]?.tool === 'web_search' &&
    assistantTurns[1]?.tool === 'web_fetch' &&
    Boolean(assistantTurns[2]?.answer);
  process.stdout.write(`Web research flow: ${webFlowPasses ? 'pass' : 'fail'}\n`);
  if (!webFlowPasses) process.exitCode = 1;
}

async function runLive(modelId: string): Promise<void> {
  const provider = providerFor(modelId, argument('--provider') ?? process.env.HELM_PROVIDER);
  const apiKey = process.env.HELM_API_KEY;
  const baseURL = process.env.HELM_BASE_URL;
  const resolvedModel = new ProviderRegistry().resolve({
    provider,
    modelId,
    ...(apiKey ? { apiKey } : {}),
    ...(baseURL ? { baseURL } : {}),
  });
  const runner = new AgentRunner();
  let success = 0;
  let repaired = 0;
  let loopIncidents = 0;

  for (const task of LIVE_TASKS) {
    let correctFinishedCall = false;
    try {
      await runner.run({
        resolvedModel,
        prompt: `${task.prompt} Do not answer with prose.`,
        mode: 'fullAccess',
        host: evalHost,
        maxSteps: 1,
        callbacks: {
          onFinished: (event) => {
            if (event.tool === task.expectedTool && event.ok) correctFinishedCall = true;
          },
          onToolRepair: () => {
            repaired += 1;
          },
          onLoopWarning: () => {
            loopIncidents += 1;
          },
        },
      });
    } catch (error) {
      process.stderr.write(
        `${task.name}: ${error instanceof Error ? error.message : String(error)}\n`,
      );
    }
    if (correctFinishedCall) success += 1;
  }
  report(modelId, `live ${provider}`, LIVE_TASKS.length, success, repaired, loopIncidents);
}

function report(
  modelId: string,
  mode: string,
  tasks: number,
  success: number,
  repaired: number,
  loopIncidents: number,
): void {
  const rate = Math.round((success / tasks) * 100);
  const repairRate = Math.round((repaired / tasks) * 100);
  process.stdout.write(
    `Helm reliability eval · ${modelId} · ${mode}\nTasks: ${tasks}\nTool-call success: ${rate}%\nRepair rate: ${repairRate}% (${repaired}/${tasks})\nLoop incidents: ${loopIncidents}\n`,
  );
  if (success !== tasks) process.exitCode = 1;
}

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function flag(name: string): boolean {
  return process.argv.includes(name);
}

function providerFor(modelId: string, configured?: string): ProviderId {
  const provider = configured ?? inferredProvider(modelId);
  if (
    provider === 'anthropic' ||
    provider === 'openai' ||
    provider === 'google' ||
    provider === 'openrouter' ||
    provider === 'ollama' ||
    provider === 'moonshot' ||
    provider === 'zai' ||
    provider === 'deepseek' ||
    provider === 'dashscope'
  )
    return provider;
  throw new Error(`Unknown provider: ${provider}`);
}

function inferredProvider(modelId: string): ProviderId {
  const lower = modelId.toLowerCase();
  if (lower.includes('kimi')) return 'moonshot';
  if (lower.includes('glm')) return 'zai';
  if (lower.includes('qwen')) return 'dashscope';
  if (lower.includes('deepseek')) return 'deepseek';
  throw new Error('Set --provider or HELM_PROVIDER when --live cannot infer the provider.');
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
