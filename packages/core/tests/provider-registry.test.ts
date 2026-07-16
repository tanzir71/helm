import { describe, expect, it } from 'vitest';

import {
  friendlyProviderError,
  ollamaCompatibleBaseURL,
  ollamaServerBaseURL,
  ProviderRegistry,
} from '../src/provider-registry.js';

describe('ProviderRegistry', () => {
  it('requires remote keys but resolves local Ollama', () => {
    const registry = new ProviderRegistry();
    expect(() => registry.resolve({ provider: 'anthropic', modelId: 'claude-sonnet-4-5' })).toThrow(
      'Missing API key',
    );
    expect(registry.resolve({ provider: 'ollama', modelId: 'qwen3-coder' }).profile.family).toBe(
      'qwen',
    );
  });

  it('translates common provider errors', () => {
    expect(friendlyProviderError('Anthropic', 401)).toContain('API Keys');
    expect(friendlyProviderError('OpenAI', 429)).toContain('rate-limiting');
    expect(friendlyProviderError('Google', 500)).toContain('unavailable');
  });

  it('normalizes Ollama server and OpenAI-compatible URLs', () => {
    expect(ollamaCompatibleBaseURL('http://localhost:11434')).toBe('http://localhost:11434/v1');
    expect(ollamaCompatibleBaseURL('http://localhost:11434/v1/')).toBe('http://localhost:11434/v1');
    expect(ollamaServerBaseURL('http://localhost:11434/v1')).toBe('http://localhost:11434');
  });
});
