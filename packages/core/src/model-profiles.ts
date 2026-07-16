export type ModelFamily =
  'kimi' | 'glm' | 'qwen' | 'deepseek' | 'claude' | 'gpt' | 'gemini' | 'generic';

export interface ModelProfile {
  id: string;
  family: ModelFamily;
  contextWindow: number;
  temperature: { default: number; note?: string };
  reasoning: {
    field: 'reasoning_content' | 'anthropic-thinking' | 'none';
    stripFromHistory: boolean;
    preserveBetweenToolCalls: boolean;
  };
  toolCalling: {
    parallel: boolean;
    maxToolsAdvised: number;
    repairStrategy: 'reask' | 'json-fix' | 'none';
    xmlLeakage: boolean;
  };
  caching: 'automatic' | 'anthropic-explicit' | 'none';
  promptStyle: 'explicit-directive' | 'standard';
  costPerMTok: { in: number; out: number; cachedIn?: number };
}

const standardTools = {
  parallel: true,
  maxToolsAdvised: 12,
  repairStrategy: 'json-fix' as const,
  xmlLeakage: false,
};

const noReasoning = {
  field: 'none' as const,
  stripFromHistory: false,
  preserveBetweenToolCalls: false,
};

export const MODEL_PROFILES: Readonly<Record<string, ModelProfile>> = {
  // https://platform.moonshot.ai/docs and https://github.com/MoonshotAI/Kimi-K2/blob/main/docs/tool_call_guidance.md
  'kimi-k2.6': {
    id: 'kimi-k2.6',
    family: 'kimi',
    contextWindow: 262_144,
    temperature: { default: 0.6, note: 'Moonshot recommends 0.6 for Kimi tool use.' },
    reasoning: {
      field: 'reasoning_content',
      stripFromHistory: false,
      preserveBetweenToolCalls: true,
    },
    toolCalling: { ...standardTools, maxToolsAdvised: 10 },
    caching: 'automatic',
    promptStyle: 'standard',
    costPerMTok: { in: 0.6, out: 2.5, cachedIn: 0.15 },
  },
  // https://platform.moonshot.ai/docs
  'kimi-k2.7-code': {
    id: 'kimi-k2.7-code',
    family: 'kimi',
    contextWindow: 262_144,
    temperature: { default: 0.6, note: 'Explicit coding profile.' },
    reasoning: {
      field: 'reasoning_content',
      stripFromHistory: false,
      preserveBetweenToolCalls: true,
    },
    toolCalling: { ...standardTools, maxToolsAdvised: 10 },
    caching: 'automatic',
    promptStyle: 'explicit-directive',
    costPerMTok: { in: 0.8, out: 3.2, cachedIn: 0.2 },
  },
  // https://docs.z.ai/guides/develop/http/introduction
  'glm-5.x': {
    id: 'glm-5.x',
    family: 'glm',
    contextWindow: 202_752,
    temperature: { default: 0.6 },
    reasoning: noReasoning,
    toolCalling: { ...standardTools, maxToolsAdvised: 10 },
    caching: 'none',
    promptStyle: 'standard',
    costPerMTok: { in: 1, out: 3.2 },
  },
  // https://api-docs.deepseek.com/quick_start/pricing
  'deepseek-v4-pro': {
    id: 'deepseek-v4-pro',
    family: 'deepseek',
    contextWindow: 1_000_000,
    temperature: { default: 0.6, note: 'Ignored when DeepSeek thinking mode is enabled.' },
    reasoning: {
      field: 'reasoning_content',
      stripFromHistory: true,
      preserveBetweenToolCalls: false,
    },
    toolCalling: { ...standardTools, maxToolsAdvised: 10 },
    caching: 'automatic',
    promptStyle: 'standard',
    costPerMTok: { in: 0.28, out: 0.42, cachedIn: 0.028 },
  },
  // https://api-docs.deepseek.com/quick_start/pricing
  'deepseek-v4-flash': {
    id: 'deepseek-v4-flash',
    family: 'deepseek',
    contextWindow: 1_000_000,
    temperature: { default: 0.6 },
    reasoning: {
      field: 'reasoning_content',
      stripFromHistory: true,
      preserveBetweenToolCalls: false,
    },
    toolCalling: { ...standardTools, maxToolsAdvised: 9 },
    caching: 'automatic',
    promptStyle: 'standard',
    costPerMTok: { in: 0.14, out: 0.28, cachedIn: 0.014 },
  },
  // https://help.aliyun.com/en/model-studio/getting-started/models
  'qwen3-coder': {
    id: 'qwen3-coder',
    family: 'qwen',
    contextWindow: 262_144,
    temperature: { default: 0.6 },
    reasoning: {
      field: 'reasoning_content',
      stripFromHistory: false,
      preserveBetweenToolCalls: false,
    },
    toolCalling: { ...standardTools, maxToolsAdvised: 9, xmlLeakage: true },
    caching: 'automatic',
    promptStyle: 'explicit-directive',
    costPerMTok: { in: 0.3, out: 1.2, cachedIn: 0.06 },
  },
  // https://help.aliyun.com/en/model-studio/getting-started/models
  'qwen3.6': {
    id: 'qwen3.6',
    family: 'qwen',
    contextWindow: 262_144,
    temperature: { default: 0.6 },
    reasoning: noReasoning,
    toolCalling: { ...standardTools, maxToolsAdvised: 10, xmlLeakage: true },
    caching: 'automatic',
    promptStyle: 'standard',
    costPerMTok: { in: 0.4, out: 1.6, cachedIn: 0.08 },
  },
  // https://docs.anthropic.com/en/docs/about-claude/models
  claude: {
    id: 'claude',
    family: 'claude',
    contextWindow: 200_000,
    temperature: { default: 0.2 },
    reasoning: {
      field: 'anthropic-thinking',
      stripFromHistory: false,
      preserveBetweenToolCalls: true,
    },
    toolCalling: standardTools,
    caching: 'anthropic-explicit',
    promptStyle: 'standard',
    costPerMTok: { in: 3, out: 15, cachedIn: 0.3 },
  },
  // https://platform.openai.com/docs/models
  gpt: {
    id: 'gpt',
    family: 'gpt',
    contextWindow: 400_000,
    temperature: { default: 0.2 },
    reasoning: noReasoning,
    toolCalling: standardTools,
    caching: 'automatic',
    promptStyle: 'standard',
    costPerMTok: { in: 1.25, out: 10, cachedIn: 0.125 },
  },
  // https://ai.google.dev/gemini-api/docs/models
  gemini: {
    id: 'gemini',
    family: 'gemini',
    contextWindow: 1_048_576,
    temperature: { default: 0.2 },
    reasoning: noReasoning,
    toolCalling: standardTools,
    caching: 'automatic',
    promptStyle: 'standard',
    costPerMTok: { in: 1.25, out: 10, cachedIn: 0.31 },
  },
  generic: {
    id: 'generic',
    family: 'generic',
    contextWindow: 128_000,
    temperature: { default: 0.2 },
    reasoning: noReasoning,
    toolCalling: { ...standardTools, parallel: false, maxToolsAdvised: 8 },
    caching: 'none',
    promptStyle: 'standard',
    costPerMTok: { in: 0, out: 0 },
  },
};

export function resolveModelProfile(modelId: string): ModelProfile {
  const id = modelId.toLowerCase();
  const exact = MODEL_PROFILES[id];
  if (exact) return exact;
  if (id.includes('kimi') || id.includes('moonshot')) {
    return id.includes('code') ? MODEL_PROFILES['kimi-k2.7-code']! : MODEL_PROFILES['kimi-k2.6']!;
  }
  if (id.includes('glm')) return MODEL_PROFILES['glm-5.x']!;
  if (id.includes('deepseek')) {
    return id.includes('flash')
      ? MODEL_PROFILES['deepseek-v4-flash']!
      : MODEL_PROFILES['deepseek-v4-pro']!;
  }
  if (id.includes('qwen')) {
    return id.includes('coder') ? MODEL_PROFILES['qwen3-coder']! : MODEL_PROFILES['qwen3.6']!;
  }
  if (id.includes('claude')) return MODEL_PROFILES.claude!;
  if (id.includes('gpt') || id.startsWith('o1') || id.startsWith('o3')) return MODEL_PROFILES.gpt!;
  if (id.includes('gemini')) return MODEL_PROFILES.gemini!;
  return MODEL_PROFILES.generic!;
}

export function isOpenWeightFamily(family: ModelFamily): boolean {
  return family === 'kimi' || family === 'glm' || family === 'qwen' || family === 'deepseek';
}

/**
 * Provider reasoning is displayed separately from assistant text. Only profiles that permit
 * reasoning in subsequent request history receive it again between distinct runs; the AI SDK
 * preserves provider-native reasoning inside an individual multi-step tool loop.
 */
export function reasoningForNextRun(
  profile: ModelProfile,
  reasoning: string | undefined,
): string | undefined {
  if (!reasoning || profile.reasoning.stripFromHistory) return undefined;
  return profile.reasoning.preserveBetweenToolCalls ? reasoning : undefined;
}

export function estimateCost(
  profile: ModelProfile,
  usage: { inputTokens: number; outputTokens: number; cachedInputTokens?: number },
): number {
  const cached = usage.cachedInputTokens ?? 0;
  const regularInput = Math.max(0, usage.inputTokens - cached);
  return (
    (regularInput / 1_000_000) * profile.costPerMTok.in +
    (cached / 1_000_000) * (profile.costPerMTok.cachedIn ?? profile.costPerMTok.in) +
    (usage.outputTokens / 1_000_000) * profile.costPerMTok.out
  );
}
