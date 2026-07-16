import { simulateReadableStream, type LanguageModel } from 'ai';

import { resolveModelProfile } from './model-profiles.js';
import type { ResolvedModel } from './provider-registry.js';

export function createMockResolvedModel(
  response = 'Helm mock response',
  reasoning = 'Checking the request.',
  delays: { initialDelayInMs?: number; chunkDelayInMs?: number } = {},
): ResolvedModel {
  const model: LanguageModel = {
    specificationVersion: 'v2',
    provider: 'helm-mock',
    modelId: 'helm-mock',
    supportedUrls: {},
    doGenerate: async () => ({
      content: [{ type: 'text', text: response }],
      finishReason: 'stop',
      usage: { inputTokens: 5, outputTokens: 8, totalTokens: 13 },
      warnings: [],
    }),
    doStream: async () => ({
      stream: simulateReadableStream({
        ...delays,
        chunks: [
          { type: 'stream-start' as const, warnings: [] },
          { type: 'reasoning-start' as const, id: 'reasoning-1' },
          { type: 'reasoning-delta' as const, id: 'reasoning-1', delta: reasoning },
          { type: 'reasoning-end' as const, id: 'reasoning-1' },
          { type: 'text-start' as const, id: 'text-1' },
          { type: 'text-delta' as const, id: 'text-1', delta: response },
          { type: 'text-end' as const, id: 'text-1' },
          {
            type: 'finish' as const,
            finishReason: 'stop' as const,
            usage: { inputTokens: 5, outputTokens: 8, totalTokens: 13 },
          },
        ],
      }),
    }),
  };
  return {
    provider: 'ollama',
    modelId: 'helm-mock',
    model,
    profile: resolveModelProfile('generic'),
  };
}

export function createToolLoopMockResolvedModel(): ResolvedModel {
  let step = 0;
  const model: LanguageModel = {
    specificationVersion: 'v2',
    provider: 'helm-mock',
    modelId: 'helm-tool-loop-mock',
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
            initialDelayInMs: 100,
            chunks: [
              { type: 'stream-start' as const, warnings: [] },
              {
                type: 'tool-call' as const,
                toolCallId: 'read-package',
                toolName: 'read_file',
                input: '{"path":"package.json","start_line":1,"end_line":2}',
              },
              {
                type: 'finish' as const,
                finishReason: 'tool-calls' as const,
                usage: { inputTokens: 3, outputTokens: 2, totalTokens: 5 },
              },
            ],
          }),
        };
      }
      const sawSteer = JSON.stringify(options.prompt).includes(
        '[User steering instruction — takes priority over prior instructions]',
      );
      const response = sawSteer ? 'Steer consumed at tool boundary' : 'Steer was not observed';
      return {
        stream: simulateReadableStream({
          chunks: [
            { type: 'stream-start' as const, warnings: [] },
            { type: 'text-start' as const, id: 'text-2' },
            { type: 'text-delta' as const, id: 'text-2', delta: response },
            { type: 'text-end' as const, id: 'text-2' },
            {
              type: 'finish' as const,
              finishReason: 'stop' as const,
              usage: { inputTokens: 4, outputTokens: 3, totalTokens: 7 },
            },
          ],
        }),
      };
    },
  };
  return {
    provider: 'ollama',
    modelId: 'helm-tool-loop-mock',
    model,
    profile: resolveModelProfile('generic'),
  };
}
