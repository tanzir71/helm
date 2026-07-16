import { simulateReadableStream, type LanguageModel } from 'ai';
import { describe, expect, it, vi } from 'vitest';

import { AgentRunner } from '../src/agent-runner.js';
import { resolveModelProfile } from '../src/model-profiles.js';

function mockModel(chunks: Parameters<typeof simulateReadableStream>[0]['chunks']): LanguageModel {
  return {
    specificationVersion: 'v2',
    provider: 'mock',
    modelId: 'mock',
    supportedUrls: {},
    doGenerate: async () => ({
      content: [{ type: 'text', text: 'unused' }],
      finishReason: 'stop',
      usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
      warnings: [],
    }),
    doStream: async () => ({ stream: simulateReadableStream({ chunks }) }),
  } as LanguageModel;
}

describe('AgentRunner', () => {
  it('streams reasoning and text with usage through a resolved profile', async () => {
    const onText = vi.fn();
    const onReasoning = vi.fn();
    const model = mockModel([
      { type: 'stream-start', warnings: [] },
      { type: 'reasoning-start', id: 'r' },
      { type: 'reasoning-delta', id: 'r', delta: 'considering' },
      { type: 'reasoning-end', id: 'r' },
      { type: 'text-start', id: 't' },
      { type: 'text-delta', id: 't', delta: 'done' },
      { type: 'text-end', id: 't' },
      {
        type: 'finish',
        finishReason: 'stop',
        usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15, cachedInputTokens: 2 },
      },
    ]);
    const result = await new AgentRunner().run({
      resolvedModel: {
        provider: 'ollama',
        modelId: 'qwen3-coder',
        model,
        profile: resolveModelProfile('qwen3-coder'),
      },
      prompt: 'Work',
      callbacks: { onText, onReasoning },
    });
    expect(result.text).toBe('done');
    expect(result.reasoning).toBe('considering');
    expect(result.usage).toMatchObject({ inputTokens: 10, outputTokens: 5, cachedInputTokens: 2 });
    expect(onText).toHaveBeenCalledWith('done');
    expect(onReasoning).toHaveBeenCalledWith('considering');
  });

  it('turns provider stream errors into friendly failures', async () => {
    const model = mockModel([
      { type: 'stream-start', warnings: [] },
      { type: 'error', error: new Error('401 unauthorized') },
    ]);
    await expect(
      new AgentRunner().run({
        resolvedModel: {
          provider: 'anthropic',
          modelId: 'claude',
          model,
          profile: resolveModelProfile('claude'),
        },
        prompt: 'Hello',
      }),
    ).rejects.toThrow('API Keys');
  });

  it('removes Qwen XML tool leakage from streamed reasoning', async () => {
    const onReasoningReplaced = vi.fn();
    const model = mockModel([
      { type: 'stream-start', warnings: [] },
      { type: 'reasoning-start', id: 'r' },
      {
        type: 'reasoning-delta',
        id: 'r',
        delta: '<tool_call>{"name":"read_file"}</tool_call>Continue carefully.',
      },
      { type: 'reasoning-end', id: 'r' },
      {
        type: 'finish',
        finishReason: 'stop',
        usage: { inputTokens: 2, outputTokens: 2, totalTokens: 4 },
      },
    ]);
    const result = await new AgentRunner().run({
      resolvedModel: {
        provider: 'ollama',
        modelId: 'qwen3-coder',
        model,
        profile: resolveModelProfile('qwen3-coder'),
      },
      prompt: 'Work',
      callbacks: { onReasoningReplaced },
    });
    expect(result.reasoning).toBe('Continue carefully.');
    expect(onReasoningReplaced).toHaveBeenCalledWith('Continue carefully.');
  });
});
