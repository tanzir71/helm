import { simulateReadableStream, type LanguageModel } from 'ai';

import { resolveModelProfile } from './model-profiles.js';
import type { ResolvedModel } from './provider-registry.js';

export function createMockResolvedModel(
  response = 'Helm mock response',
  reasoning = 'Checking the request.',
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
