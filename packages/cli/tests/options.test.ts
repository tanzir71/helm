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
      command: 'run',
      help: false,
      modelId: 'qwen3-coder',
      prompt: 'explain this',
      provider: 'ollama',
      reasoningEffort: 'medium',
      version: false,
      yes: false,
    });
  });

  it('parses the minimal plan, goal, and solo commands', () => {
    expect(parseCliArguments(['plan', 'add', 'auth'])).toMatchObject({
      command: 'plan',
      prompt: 'add auth',
    });
    expect(parseCliArguments(['goal', 'ship', 'v1'])).toMatchObject({
      command: 'goal',
      prompt: 'ship v1',
    });
    expect(parseCliArguments(['solo', '--yes', 'fix', 'the', 'tests'])).toMatchObject({
      command: 'solo',
      prompt: 'fix the tests',
      yes: true,
    });
  });

  it('supports workflow flag aliases and one-run goal overrides', () => {
    expect(parseCliArguments(['--plan', '--goal', 'Ship v1', 'check status'])).toMatchObject({
      command: 'plan',
      goal: 'Ship v1',
      prompt: 'check status',
    });
    expect(parseCliArguments(['--solo', '-y', 'implement it'])).toMatchObject({
      command: 'solo',
      prompt: 'implement it',
      yes: true,
    });
  });

  it('allows command words in a literal prompt after --', () => {
    expect(parseCliArguments(['--', 'plan', 'this'])).toMatchObject({
      command: 'run',
      prompt: 'plan this',
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
    expect(() => parseCliArguments(['--plan', '--solo', 'do this'])).toThrow('Choose only one');
    expect(() => parseCliArguments(['solo'])).toThrow('solo requires a task prompt');
    expect(() =>
      resolveRuntimeModelConfig(parseCliArguments(['--model', 'custom-model']), {}),
    ).toThrow('Could not infer a provider');
  });
});
