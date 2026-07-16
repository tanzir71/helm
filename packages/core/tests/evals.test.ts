import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

import { repairJson } from '../src/tool-robustness.js';

interface EvalTask {
  toolCall: string;
  expectedTool: string;
}

interface ResearchFixture {
  transcript: Array<{ role: string; tool?: string; answer?: string }>;
}

describe('recorded open-model eval fixtures', () => {
  for (const family of ['kimi', 'glm', 'deepseek', 'qwen']) {
    it(`repairs every ${family} fixture into the expected tool call`, async () => {
      const tasks = JSON.parse(
        await readFile(new URL(`../evals/fixtures/${family}.json`, import.meta.url), 'utf8'),
      ) as EvalTask[];
      expect(tasks).toHaveLength(10);
      for (const task of tasks) {
        const repaired = repairJson(task.toolCall);
        expect(toolName(repaired.value)).toBe(task.expectedTool);
      }
    });
  }

  it('locks the grounded web_search to web_fetch to answer flow', async () => {
    const fixture = JSON.parse(
      await readFile(new URL('../evals/fixtures/web-research.json', import.meta.url), 'utf8'),
    ) as ResearchFixture;
    const assistantTurns = fixture.transcript.filter((turn) => turn.role === 'assistant');
    expect(assistantTurns.map((turn) => turn.tool).filter(Boolean)).toEqual([
      'web_search',
      'web_fetch',
    ]);
    expect(assistantTurns.at(-1)?.answer).toContain('https://example.com/docs');
  });

  it('answers an architecture question with one explore and zero file reads', async () => {
    const fixture = JSON.parse(
      await readFile(
        new URL('../evals/fixtures/codegraph-architecture.json', import.meta.url),
        'utf8',
      ),
    ) as ResearchFixture;
    const tools = fixture.transcript
      .filter((turn) => turn.role === 'assistant' && turn.tool)
      .map((turn) => turn.tool);
    expect(tools).toEqual(['explore_code']);
    expect(tools).not.toContain('read_file');
    expect(fixture.transcript.at(-1)?.answer).toContain('ExtensionToolHost');
  });
});

function toolName(value: unknown): string | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  const tool = Reflect.get(value, 'tool');
  return typeof tool === 'string' ? tool : undefined;
}
