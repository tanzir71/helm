import process from 'node:process';

import { AgentRunner, createMockResolvedModel, ProviderRegistry } from '@helm/core';

import { CliUsageError, parseCliArguments, resolveRuntimeModelConfig } from './options.js';

declare const __HELM_VERSION__: string;

const HELP = `Helm CLI

Usage:
  helm-ai [options] [prompt]

Options:
  -p, --provider <id>      Model provider
  -m, --model <id>         Model ID; known model names infer their provider
      --base-url <url>     Override the provider's OpenAI-compatible endpoint
      --reasoning <level>  low, medium, or high
  -h, --help               Show help
  -v, --version            Show version

Environment:
  HELM_PROVIDER, HELM_MODEL, HELM_API_KEY, HELM_BASE_URL, HELM_REASONING
  Provider keys such as ANTHROPIC_API_KEY, OPENAI_API_KEY, OPENROUTER_API_KEY,
  GOOGLE_GENERATIVE_AI_API_KEY, MOONSHOT_API_KEY, ZAI_API_KEY,
  DEEPSEEK_API_KEY, and DASHSCOPE_API_KEY are also detected.

Examples:
  helm-ai "Explain this project"
  helm-ai --provider ollama --model qwen3-coder "Review this function"
  OPENAI_API_KEY=... helm-ai --model gpt-5 "Suggest a refactor"
`;

async function main(): Promise<void> {
  const options = parseCliArguments(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(HELP);
    return;
  }
  if (options.version) {
    process.stdout.write(`${__HELM_VERSION__}\n`);
    return;
  }

  const runtime = resolveRuntimeModelConfig(options, process.env);
  const resolvedModel = runtime.demo
    ? createMockResolvedModel(`Hi — Helm received: ${options.prompt}`, '')
    : new ProviderRegistry().resolve({
        provider: runtime.provider!,
        modelId: runtime.modelId!,
        ...(runtime.apiKey ? { apiKey: runtime.apiKey } : {}),
        ...(runtime.baseURL ? { baseURL: runtime.baseURL } : {}),
      });

  const result = await new AgentRunner().run({
    resolvedModel,
    prompt: options.prompt,
    mode: 'chat',
    ...(runtime.reasoningEffort ? { reasoningEffort: runtime.reasoningEffort } : {}),
    callbacks: { onText: (text) => process.stdout.write(text) },
  });
  process.stdout.write(`\n[${result.usage.inputTokens + result.usage.outputTokens} tokens]\n`);
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`helm-ai: ${message}\n`);
  if (error instanceof CliUsageError) process.stderr.write('Run helm-ai --help for usage.\n');
  process.exitCode = 1;
});
