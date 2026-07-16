import { simulateReadableStream, type LanguageModel } from 'ai';

import { AgentRunner, ProviderRegistry, resolveModelProfile } from '@helm/core';

const prompt = process.argv.slice(2).join(' ') || 'say hi';
const provider = process.env.HELM_PROVIDER;
const modelId = process.env.HELM_MODEL;

const mockModel: LanguageModel = {
  specificationVersion: 'v2',
  provider: 'helm-mock',
  modelId: 'helm-mock',
  supportedUrls: {},
  doGenerate: async () => ({
    content: [{ type: 'text', text: `Hi — Helm received: ${prompt}` }],
    finishReason: 'stop',
    usage: { inputTokens: 5, outputTokens: 8, totalTokens: 13 },
    warnings: [],
  }),
  doStream: async () => ({
    stream: simulateReadableStream({
      chunks: [
        { type: 'stream-start' as const, warnings: [] },
        { type: 'text-start' as const, id: 'text-1' },
        { type: 'text-delta' as const, id: 'text-1', delta: `Hi — Helm received: ${prompt}` },
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

const resolvedModel =
  provider && modelId
    ? new ProviderRegistry().resolve({
        provider: provider as Parameters<ProviderRegistry['resolve']>[0]['provider'],
        modelId,
        ...(process.env.HELM_API_KEY ? { apiKey: process.env.HELM_API_KEY } : {}),
        ...(process.env.HELM_BASE_URL ? { baseURL: process.env.HELM_BASE_URL } : {}),
      })
    : {
        provider: 'ollama' as const,
        modelId: 'helm-mock',
        profile: resolveModelProfile('generic'),
        model: mockModel,
      };

const runner = new AgentRunner();
const result = await runner.run({
  resolvedModel,
  prompt,
  mode: 'chat',
  callbacks: { onText: (text) => process.stdout.write(text) },
});
process.stdout.write(`\n[${result.usage.inputTokens + result.usage.outputTokens} tokens]\n`);
