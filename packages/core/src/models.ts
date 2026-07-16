import type { ProviderId } from './provider-registry.js';

export interface ModelOption {
  id: string;
  label: string;
  reasoningEffort?: boolean;
}

export const STATIC_MODELS: Readonly<Record<ProviderId, readonly ModelOption[]>> = {
  anthropic: [
    { id: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5', reasoningEffort: true },
    { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5' },
  ],
  openai: [
    { id: 'gpt-5', label: 'GPT-5', reasoningEffort: true },
    { id: 'gpt-5-mini', label: 'GPT-5 mini', reasoningEffort: true },
  ],
  google: [
    { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', reasoningEffort: true },
    { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', reasoningEffort: true },
  ],
  openrouter: [],
  ollama: [],
  moonshot: [
    { id: 'kimi-k2.6', label: 'Kimi K2.6', reasoningEffort: true },
    { id: 'kimi-k2.7-code', label: 'Kimi K2.7 Code', reasoningEffort: true },
  ],
  zai: [{ id: 'glm-5.1', label: 'GLM 5.1', reasoningEffort: true }],
  deepseek: [
    { id: 'deepseek-v4-pro', label: 'DeepSeek V4 Pro', reasoningEffort: true },
    { id: 'deepseek-v4-flash', label: 'DeepSeek V4 Flash', reasoningEffort: true },
  ],
  dashscope: [
    { id: 'qwen3-coder', label: 'Qwen3 Coder', reasoningEffort: true },
    { id: 'qwen3.6', label: 'Qwen3.6', reasoningEffort: true },
  ],
};
