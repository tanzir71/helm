import type { z } from 'zod';

export function repairJson(input: string): { value?: unknown; repaired: boolean; error?: string } {
  try {
    return { value: JSON.parse(input) as unknown, repaired: false };
  } catch {
    const repaired = input
      .trim()
      .replace(/([{,]\s*)([A-Za-z_$][\w$-]*)\s*:/gu, '$1"$2":')
      .replace(/'/gu, '"')
      .replace(/,\s*([}\]])/gu, '$1');
    try {
      return { value: JSON.parse(repaired) as unknown, repaired: repaired !== input };
    } catch (error) {
      return {
        repaired: repaired !== input,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

export function validateToolInput<T>(
  schema: z.ZodType<T>,
  input: unknown,
): { ok: true; value: T } | { ok: false; feedback: string } {
  const result = schema.safeParse(input);
  if (result.success) return { ok: true, value: result.data };
  const issues = result.error.issues.map(
    (issue) => `${issue.path.join('.') || 'input'}: ${issue.message}`,
  );
  return {
    ok: false,
    feedback: `Invalid tool arguments: ${issues.join('; ')}. Fix your tool call and retry.`,
  };
}

export class RepeatCallGuard {
  private signature = '';
  private count = 0;

  record(tool: string, input: unknown): { count: number; warning?: string; pause: boolean } {
    const next = `${tool}:${stableStringify(input)}`;
    this.count = next === this.signature ? this.count + 1 : 1;
    this.signature = next;
    if (this.count >= 5) {
      return { count: this.count, warning: 'Repeated tool call limit reached.', pause: true };
    }
    if (this.count >= 3) {
      return {
        count: this.count,
        warning: 'You are repeating the same call; change approach or ask the user.',
        pause: false,
      };
    }
    return { count: this.count, pause: false };
  }
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (typeof value === 'object' && value !== null) {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value) ?? 'undefined';
}

export function promoteXmlToolLeakage(reasoning: string): {
  reasoning: string;
  toolBlocks: string[];
} {
  const toolBlocks: string[] = [];
  const cleaned = reasoning.replace(/<tool_call>[\s\S]*?<\/tool_call>/giu, (block) => {
    toolBlocks.push(block);
    return '';
  });
  return { reasoning: cleaned.trim(), toolBlocks };
}
