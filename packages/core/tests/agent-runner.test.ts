import { simulateReadableStream, type LanguageModel } from 'ai';
import { describe, expect, it, vi } from 'vitest';

import { AgentRunner } from '../src/agent-runner.js';
import { resolveModelProfile } from '../src/model-profiles.js';
import type { ToolHost } from '../src/tools.js';

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

  it('returns zod validation feedback to the model as a tool result', async () => {
    let step = 0;
    let secondPrompt = '';
    const model: LanguageModel = {
      specificationVersion: 'v2',
      provider: 'mock',
      modelId: 'validation-feedback',
      supportedUrls: {},
      doGenerate: async () => ({
        content: [{ type: 'text', text: 'unused' }],
        finishReason: 'stop',
        usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
        warnings: [],
      }),
      doStream: async (options) => {
        step += 1;
        if (step === 1) {
          return {
            stream: simulateReadableStream({
              chunks: [
                { type: 'stream-start' as const, warnings: [] },
                {
                  type: 'tool-call' as const,
                  toolCallId: 'invalid-read',
                  toolName: 'read_file',
                  input: '{}',
                },
                {
                  type: 'finish' as const,
                  finishReason: 'tool-calls' as const,
                  usage: { inputTokens: 2, outputTokens: 1, totalTokens: 3 },
                },
              ],
            }),
          };
        }
        secondPrompt = JSON.stringify(options.prompt);
        return {
          stream: simulateReadableStream({
            chunks: [
              { type: 'stream-start' as const, warnings: [] },
              { type: 'text-start' as const, id: 'corrected' },
              { type: 'text-delta' as const, id: 'corrected', delta: 'self-corrected' },
              { type: 'text-end' as const, id: 'corrected' },
              {
                type: 'finish' as const,
                finishReason: 'stop' as const,
                usage: { inputTokens: 3, outputTokens: 2, totalTokens: 5 },
              },
            ],
          }),
        };
      },
    };
    const host: ToolHost = {
      execute: vi.fn(async () => 'should not execute'),
    };
    const result = await new AgentRunner().run({
      resolvedModel: {
        provider: 'ollama',
        modelId: 'validation-feedback',
        model,
        profile: resolveModelProfile('generic'),
      },
      prompt: 'Read a file',
      host,
    });
    expect(result.text).toBe('self-corrected');
    expect(secondPrompt).toContain('Invalid tool arguments');
    expect(host.execute).not.toHaveBeenCalled();
  });

  it('preserves Kimi reasoning but strips DeepSeek reasoning between tool steps', async () => {
    const kimiPrompts: string[] = [];
    const deepSeekPrompts: string[] = [];
    const host: ToolHost = { execute: vi.fn(async () => 'file contents') };
    await new AgentRunner().run({
      resolvedModel: {
        provider: 'ollama',
        modelId: 'kimi-k2.6',
        model: reasoningToolModel(kimiPrompts),
        profile: resolveModelProfile('kimi-k2.6'),
      },
      prompt: 'Inspect',
      host,
    });
    await new AgentRunner().run({
      resolvedModel: {
        provider: 'ollama',
        modelId: 'deepseek-v4-pro',
        model: reasoningToolModel(deepSeekPrompts),
        profile: resolveModelProfile('deepseek-v4-pro'),
      },
      prompt: 'Inspect',
      host,
    });
    expect(kimiPrompts[1]).toContain('private chain');
    expect(deepSeekPrompts[1]).not.toContain('private chain');
  });
});

function reasoningToolModel(prompts: string[]): LanguageModel {
  let step = 0;
  return {
    specificationVersion: 'v2',
    provider: 'mock',
    modelId: 'reasoning-tool-model',
    supportedUrls: {},
    doGenerate: async () => ({
      content: [{ type: 'text', text: 'unused' }],
      finishReason: 'stop',
      usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
      warnings: [],
    }),
    doStream: async (options) => {
      prompts.push(JSON.stringify(options.prompt));
      step += 1;
      return step === 1
        ? {
            stream: simulateReadableStream({
              chunks: [
                { type: 'stream-start' as const, warnings: [] },
                { type: 'reasoning-start' as const, id: 'reasoning' },
                {
                  type: 'reasoning-delta' as const,
                  id: 'reasoning',
                  delta: 'private chain',
                },
                { type: 'reasoning-end' as const, id: 'reasoning' },
                {
                  type: 'tool-call' as const,
                  toolCallId: 'read',
                  toolName: 'read_file',
                  input: '{"path":"package.json"}',
                },
                {
                  type: 'finish' as const,
                  finishReason: 'tool-calls' as const,
                  usage: { inputTokens: 2, outputTokens: 2, totalTokens: 4 },
                },
              ],
            }),
          }
        : {
            stream: simulateReadableStream({
              chunks: [
                { type: 'stream-start' as const, warnings: [] },
                { type: 'text-start' as const, id: 'answer' },
                { type: 'text-delta' as const, id: 'answer', delta: 'done' },
                { type: 'text-end' as const, id: 'answer' },
                {
                  type: 'finish' as const,
                  finishReason: 'stop' as const,
                  usage: { inputTokens: 3, outputTokens: 1, totalTokens: 4 },
                },
              ],
            }),
          };
    },
  };
}
