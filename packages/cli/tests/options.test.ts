import { describe, expect, it } from 'vitest';

import { CliUsageError, parseCliArguments, resolveRuntimeModelConfig } from '../src/options.js';

describe('Helm CLI options', () => {
  it('parses flags and joins the remaining prompt', () => {
    expect(
      parseCliArguments([
        '--provider',
        'ollama',
        '--model',
        'qwen3-coder',
        '--reasoning',
        'medium',
        'explain',
        'this',
      ]),
    ).toEqual({
      help: false,
      modelId: 'qwen3-coder',
      prompt: 'explain this',
      provider: 'ollama',
      reasoningEffort: 'medium',
      version: false,
    });
  });

  it('runs a no-configuration command against the safe demo model', () => {
    const options = parseCliArguments(['hello']);
    expect(resolveRuntimeModelConfig(options, {})).toEqual({ demo: true });
  });

  it('infers common providers and their standard key variables', () => {
    const options = parseCliArguments(['--model', 'deepseek-v4-flash', 'review this']);
    expect(resolveRuntimeModelConfig(options, { DEEPSEEK_API_KEY: 'secret' })).toEqual({
      apiKey: 'secret',
      demo: false,
      modelId: 'deepseek-v4-flash',
      provider: 'deepseek',
    });
  });

  it('uses a default model for providers with a curated default', () => {
    const options = parseCliArguments(['--provider', 'openai', 'say hi']);
    expect(resolveRuntimeModelConfig(options, { OPENAI_API_KEY: 'secret' })).toMatchObject({
      apiKey: 'secret',
      demo: false,
      modelId: 'gpt-5',
      provider: 'openai',
    });
  });

  it('reports unknown options and ambiguous models as usage errors', () => {
    expect(() => parseCliArguments(['--wat'])).toThrow(CliUsageError);
    expect(() =>
      resolveRuntimeModelConfig(parseCliArguments(['--model', 'custom-model']), {}),
    ).toThrow('Could not infer a provider');
  });
});
