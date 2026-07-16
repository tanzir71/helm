import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import type { LanguageModel } from 'ai';

import { resolveModelProfile, type ModelProfile } from './model-profiles.js';

export type ProviderId =
  | 'anthropic'
  | 'openai'
  | 'google'
  | 'openrouter'
  | 'ollama'
  | 'moonshot'
  | 'zai'
  | 'deepseek'
  | 'dashscope';

export interface ProviderConfig {
  provider: ProviderId;
  modelId: string;
  apiKey?: string;
  baseURL?: string;
}

export interface ResolvedModel {
  provider: ProviderId;
  modelId: string;
  model: LanguageModel;
  profile: ModelProfile;
}

const DEFAULT_BASE_URLS: Readonly<Partial<Record<ProviderId, string>>> = {
  ollama: 'http://localhost:11434/v1',
  moonshot: 'https://api.moonshot.ai/v1',
  zai: 'https://api.z.ai/api/paas/v4',
  deepseek: 'https://api.deepseek.com',
  dashscope: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
};

export class ProviderRegistry {
  resolve(config: ProviderConfig): ResolvedModel {
    const profile = resolveModelProfile(config.modelId);
    const key = config.apiKey;
    if (config.provider !== 'ollama' && !key) {
      throw new Error(`Missing API key for ${config.provider}.`);
    }
    const providerKey = key ?? 'ollama';

    let model: LanguageModel;
    switch (config.provider) {
      case 'anthropic':
        model = createAnthropic({ apiKey: providerKey })(config.modelId);
        break;
      case 'openai':
        model = createOpenAI({ apiKey: providerKey })(config.modelId);
        break;
      case 'google':
        model = createGoogleGenerativeAI({ apiKey: providerKey })(config.modelId);
        break;
      case 'openrouter':
        model = createOpenRouter({ apiKey: providerKey, compatibility: 'strict' })(config.modelId);
        break;
      default: {
        const configuredBaseURL = config.baseURL ?? DEFAULT_BASE_URLS[config.provider];
        const baseURL =
          config.provider === 'ollama' && configuredBaseURL
            ? ollamaCompatibleBaseURL(configuredBaseURL)
            : configuredBaseURL;
        if (!baseURL) throw new Error(`Missing base URL for ${config.provider}.`);
        const compatible = createOpenAICompatible({
          name: config.provider,
          apiKey: providerKey,
          baseURL: trimSlash(baseURL),
          includeUsage: true,
        });
        model = compatible(config.modelId);
      }
    }
    return { provider: config.provider, modelId: config.modelId, model, profile };
  }

  async listModels(
    provider: 'openrouter' | 'ollama',
    options: { apiKey?: string; baseURL?: string; signal?: AbortSignal } = {},
  ): Promise<Array<{ id: string; label: string }>> {
    const url =
      provider === 'openrouter'
        ? 'https://openrouter.ai/api/v1/models'
        : `${ollamaServerBaseURL(options.baseURL ?? 'http://localhost:11434')}/api/tags`;
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (provider === 'openrouter' && options.apiKey) {
      headers.Authorization = `Bearer ${options.apiKey}`;
    }
    const response = await fetch(url, {
      headers,
      ...(options.signal ? { signal: options.signal } : {}),
    });
    if (!response.ok) throw new Error(friendlyProviderError(provider, response.status));
    const data: unknown = await response.json();
    return parseModelList(provider, data);
  }
}

export function ollamaCompatibleBaseURL(value: string): string {
  const base = trimSlash(value);
  return base.endsWith('/v1') ? base : `${base}/v1`;
}

export function ollamaServerBaseURL(value: string): string {
  return trimSlash(value).replace(/\/v1$/u, '');
}

function trimSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

function parseModelList(
  provider: 'openrouter' | 'ollama',
  value: unknown,
): Array<{ id: string; label: string }> {
  if (typeof value !== 'object' || value === null) return [];
  const records =
    provider === 'openrouter' ? Reflect.get(value, 'data') : Reflect.get(value, 'models');
  if (!Array.isArray(records)) return [];
  return records.flatMap((record): Array<{ id: string; label: string }> => {
    if (typeof record !== 'object' || record === null) return [];
    const id = provider === 'openrouter' ? Reflect.get(record, 'id') : Reflect.get(record, 'name');
    if (typeof id !== 'string') return [];
    const name = Reflect.get(record, 'name');
    return [{ id, label: typeof name === 'string' ? name : id }];
  });
}

export function friendlyProviderError(provider: string, status: number, detail?: string): string {
  if (status === 401 || status === 403) {
    return `Your ${provider} key was rejected (${status}). Update it in Helm → API Keys.`;
  }
  if (status === 429)
    return `${provider} is rate-limiting requests. Wait a moment or choose another model.`;
  if (status >= 500)
    return `${provider} is temporarily unavailable (${status}). Try again shortly.`;
  return `${provider} request failed (${status})${detail ? `: ${detail}` : '.'}`;
}
