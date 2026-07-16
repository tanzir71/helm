import { describe, expect, it } from 'vitest';

import { estimateCost, reasoningForNextRun, resolveModelProfile } from '../src/model-profiles.js';

describe('model profiles', () => {
  it('resolves every open-weight family and applies its quirks', () => {
    expect(resolveModelProfile('moonshot/kimi-k2.7-code').promptStyle).toBe('explicit-directive');
    expect(resolveModelProfile('glm-5.1').family).toBe('glm');
    expect(resolveModelProfile('deepseek-v4-pro').reasoning.stripFromHistory).toBe(true);
    expect(resolveModelProfile('qwen3-coder').toolCalling.xmlLeakage).toBe(true);
  });

  it('falls back safely and estimates cached-input cost', () => {
    const generic = resolveModelProfile('local-mystery-model');
    expect(generic.family).toBe('generic');
    const deepseek = resolveModelProfile('deepseek-v4-flash');
    expect(
      estimateCost(deepseek, {
        inputTokens: 1_000_000,
        cachedInputTokens: 500_000,
        outputTokens: 1_000_000,
      }),
    ).toBeGreaterThan(0);
  });

  it('strips DeepSeek reasoning from history and preserves Kimi reasoning', () => {
    const fixture = { reasoning_content: 'private chain', content: 'public answer' };
    expect(
      reasoningForNextRun(resolveModelProfile('deepseek-v4-pro'), fixture.reasoning_content),
    ).toBeUndefined();
    expect(reasoningForNextRun(resolveModelProfile('kimi-k2.6'), fixture.reasoning_content)).toBe(
      'private chain',
    );
  });
});
