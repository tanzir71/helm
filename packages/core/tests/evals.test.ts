import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

import { repairJson } from '../src/tool-robustness.js';

interface EvalTask {
  toolCall: string;
  expectedTool: string;
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
});

function toolName(value: unknown): string | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  const tool = Reflect.get(value, 'tool');
  return typeof tool === 'string' ? tool : undefined;
}
