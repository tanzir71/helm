import { describe, expect, it } from 'vitest';

import { ContextManager } from '../src/context-manager.js';
import { resolveModelProfile } from '../src/model-profiles.js';

describe('ContextManager', () => {
  it('compacts open models at 70% and frontier models at 80%', () => {
    expect(new ContextManager(resolveModelProfile('qwen3-coder')).threshold()).toBe(0.7);
    expect(new ContextManager(resolveModelProfile('claude-sonnet-4-5')).threshold()).toBe(0.8);
  });

  it('summarizes old turns while preserving recent context', async () => {
    const manager = new ContextManager(resolveModelProfile('claude-sonnet-4-5'));
    const turns = Array.from({ length: 10 }, (_, index) => ({
      role: index % 2 === 0 ? ('user' as const) : ('assistant' as const),
      content: `turn ${index} ${'x'.repeat(100)}`,
    }));
    const result = await manager.compact(turns, async (old) => `${old.length} old turns`);
    expect(result.turns[0]?.content).toContain('old turns');
    expect(result.turns.at(-1)?.content).toContain('turn 9');
    expect(result.tokensAfter).toBeLessThan(result.tokensBefore);
  });
});
