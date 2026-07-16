import type { ProviderId } from '@helm/core';

const PROVIDERS = [
  'anthropic',
  'openai',
  'google',
  'openrouter',
  'ollama',
  'moonshot',
  'zai',
  'deepseek',
  'dashscope',
] as const satisfies readonly ProviderId[];

const DEFAULT_MODELS: Readonly<Partial<Record<ProviderId, string>>> = {
  anthropic: 'claude-sonnet-4-5',
  openai: 'gpt-5',
  google: 'gemini-2.5-pro',
  moonshot: 'kimi-k2.6',
  zai: 'glm-5.1',
  deepseek: 'deepseek-v4-flash',
  dashscope: 'qwen3-coder',
};

const PROVIDER_KEY_VARIABLES: Readonly<Partial<Record<ProviderId, readonly string[]>>> = {
  anthropic: ['ANTHROPIC_API_KEY'],
  openai: ['OPENAI_API_KEY'],
  google: ['GOOGLE_GENERATIVE_AI_API_KEY', 'GOOGLE_API_KEY'],
  openrouter: ['OPENROUTER_API_KEY'],
  moonshot: ['MOONSHOT_API_KEY'],
  zai: ['ZAI_API_KEY'],
  deepseek: ['DEEPSEEK_API_KEY'],
  dashscope: ['DASHSCOPE_API_KEY'],
};

export interface CliArguments {
  baseURL?: string;
  command: 'run' | 'plan' | 'solo' | 'goal';
  goal?: string;
  help: boolean;
  modelId?: string;
  prompt: string;
  provider?: ProviderId;
  reasoningEffort?: 'low' | 'medium' | 'high';
  version: boolean;
  yes: boolean;
}

export interface RuntimeModelConfig {
  apiKey?: string;
  baseURL?: string;
  demo: boolean;
  modelId?: string;
  provider?: ProviderId;
  reasoningEffort?: 'low' | 'medium' | 'high';
}

export class CliUsageError extends Error {}

export function parseCliArguments(argv: string[]): CliArguments {
  const prompt: string[] = [];
  const parsed: CliArguments = {
    command: 'run',
    help: false,
    prompt: '',
    version: false,
    yes: false,
  };
  let positionalOnly = false;
  let commandSelected = false;

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]!;
    if (positionalOnly) {
      prompt.push(argument);
      continue;
    }
    if (argument === '--') {
      positionalOnly = true;
      continue;
    }
    if (argument === '-h' || argument === '--help') {
      parsed.help = true;
      continue;
    }
    if (argument === '-v' || argument === '--version') {
      parsed.version = true;
      continue;
    }
    if (argument === '--plan') {
      selectCommand(parsed, 'plan', commandSelected);
      commandSelected = true;
      continue;
    }
    if (argument === '--solo') {
      selectCommand(parsed, 'solo', commandSelected);
      commandSelected = true;
      continue;
    }
    if (argument === '-y' || argument === '--yes') {
      parsed.yes = true;
      continue;
    }
    if (argument === '--goal') {
      parsed.goal = readValue(argv, ++index, argument);
      continue;
    }
    if (argument === '-p' || argument === '--provider') {
      parsed.provider = providerId(readValue(argv, ++index, argument));
      continue;
    }
    if (argument === '-m' || argument === '--model') {
      parsed.modelId = readValue(argv, ++index, argument);
      continue;
    }
    if (argument === '--base-url') {
      parsed.baseURL = readValue(argv, ++index, argument);
      continue;
    }
    if (argument === '--reasoning') {
      parsed.reasoningEffort = reasoningEffort(readValue(argv, ++index, argument));
      continue;
    }
    if (argument.startsWith('-')) throw new CliUsageError(`Unknown option: ${argument}`);
    if (!commandSelected && prompt.length === 0 && isCommand(argument)) {
      parsed.command = argument;
      commandSelected = true;
      continue;
    }
    prompt.push(argument);
  }

  parsed.prompt = prompt.join(' ').trim();
  if (
    !parsed.help &&
    !parsed.version &&
    (parsed.command === 'plan' || parsed.command === 'solo') &&
    !parsed.prompt
  ) {
    throw new CliUsageError(`${parsed.command} requires a task prompt.`);
  }
  if (parsed.command === 'run' && !parsed.prompt) parsed.prompt = 'say hi';
  return parsed;
}

export function resolveRuntimeModelConfig(
  options: CliArguments,
  environment: NodeJS.ProcessEnv,
): RuntimeModelConfig {
  const configuredModel = options.modelId ?? environment.HELM_MODEL;
  const configuredProvider = options.provider ?? optionalProvider(environment.HELM_PROVIDER);
  const provider =
    configuredProvider ?? (configuredModel ? inferProvider(configuredModel) : undefined);
  if (!provider && !configuredModel) return { demo: true };
  if (!provider) {
    throw new CliUsageError(
      `Could not infer a provider for ${configuredModel}. Set --provider or HELM_PROVIDER.`,
    );
  }
  const modelId = configuredModel ?? DEFAULT_MODELS[provider];
  if (!modelId) {
    throw new CliUsageError(`Set --model or HELM_MODEL when using ${provider}.`);
  }
  const apiKey =
    environment.HELM_API_KEY ??
    firstEnvironmentValue(environment, PROVIDER_KEY_VARIABLES[provider]);
  const baseURL = options.baseURL ?? environment.HELM_BASE_URL;
  const effort = options.reasoningEffort ?? optionalReasoningEffort(environment.HELM_REASONING);
  return {
    demo: false,
    provider,
    modelId,
    ...(apiKey ? { apiKey } : {}),
    ...(baseURL ? { baseURL } : {}),
    ...(effort ? { reasoningEffort: effort } : {}),
  };
}

function readValue(argv: string[], index: number, option: string): string {
  const value = argv[index];
  if (!value || value.startsWith('-')) throw new CliUsageError(`${option} requires a value.`);
  return value;
}

function isCommand(value: string): value is CliArguments['command'] {
  return value === 'plan' || value === 'solo' || value === 'goal';
}

function selectCommand(
  options: CliArguments,
  command: 'plan' | 'solo',
  commandSelected: boolean,
): void {
  if (commandSelected && options.command !== command) {
    throw new CliUsageError('Choose only one of plan or solo.');
  }
  options.command = command;
}

function optionalProvider(value: string | undefined): ProviderId | undefined {
  return value ? providerId(value) : undefined;
}

function providerId(value: string): ProviderId {
  if ((PROVIDERS as readonly string[]).includes(value)) return value as ProviderId;
  throw new CliUsageError(`Unknown provider: ${value}. Choose ${PROVIDERS.join(', ')}.`);
}

function reasoningEffort(value: string): 'low' | 'medium' | 'high' {
  if (value === 'low' || value === 'medium' || value === 'high') return value;
  throw new CliUsageError('Reasoning effort must be low, medium, or high.');
}

function optionalReasoningEffort(value: string | undefined): 'low' | 'medium' | 'high' | undefined {
  return value ? reasoningEffort(value) : undefined;
}

function firstEnvironmentValue(
  environment: NodeJS.ProcessEnv,
  names: readonly string[] | undefined,
): string | undefined {
  return names?.map((name) => environment[name]).find(Boolean);
}

function inferProvider(modelId: string): ProviderId | undefined {
  const model = modelId.toLowerCase();
  if (model.includes('claude')) return 'anthropic';
  if (model.includes('gemini')) return 'google';
  if (model.includes('kimi') || model.includes('moonshot')) return 'moonshot';
  if (model.includes('glm')) return 'zai';
  if (model.includes('deepseek')) return 'deepseek';
  if (model.includes('qwen')) return 'dashscope';
  if (model.includes('gpt') || model.startsWith('o1') || model.startsWith('o3')) return 'openai';
  return undefined;
}
