import { stepCountIs, streamText, type ModelMessage } from 'ai';
import type { SharedV2ProviderOptions } from '@ai-sdk/provider';

import { estimateCost } from './model-profiles.js';
import type { ApprovalMode } from './protocol.js';
import type { ResolvedModel } from './provider-registry.js';
import { fallbackSuggestions } from './suggestions.js';
import { buildSystemPrompt, reanchor } from './system-prompt.js';
import { STEER_PREFIX, type SteerQueue } from './steer-queue.js';
import { promoteXmlToolLeakage, repairJson } from './tool-robustness.js';
import {
  allowedToolNames,
  createAgentTools,
  type ToolEventCallbacks,
  type ToolHost,
} from './tools.js';

export interface AgentMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AgentRunCallbacks extends ToolEventCallbacks {
  onText?(text: string): void;
  onReasoning?(text: string): void;
  onReasoningReplaced?(text: string): void;
  onSteered?(item: { id: string; text: string }): void;
  onUsage?(usage: AgentUsage): void;
}

export interface AgentUsage {
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens: number;
  estimatedCost: number;
}

export interface AgentRunOptions {
  resolvedModel: ResolvedModel;
  prompt: string;
  history?: readonly AgentMessage[];
  mode?: ApprovalMode;
  host?: ToolHost;
  maxSteps?: number;
  signal?: AbortSignal;
  steerQueue?: SteerQueue;
  callbacks?: AgentRunCallbacks;
  agentsInstructions?: string;
  skillsIndex?: string;
  goal?: string;
  planStep?: string;
  context?: string;
  reasoningEffort?: 'low' | 'medium' | 'high';
}

export interface AgentRunResult {
  text: string;
  reasoning: string;
  usage: AgentUsage;
  suggestions: string[];
}

export class AgentRunner {
  async run(options: AgentRunOptions): Promise<AgentRunResult> {
    const mode = options.mode ?? 'agent';
    const callbacks = options.callbacks ?? {};
    let loopReminder: string | undefined;
    const tools = options.host
      ? createAgentTools(options.host, mode, {
          ...callbacks,
          onLoopWarning: (warning, pause) => {
            loopReminder = warning;
            callbacks.onLoopWarning?.(warning, pause);
          },
        })
      : undefined;
    const system = buildSystemPrompt({
      profile: options.resolvedModel.profile,
      mode,
      ...(options.agentsInstructions ? { agentsInstructions: options.agentsInstructions } : {}),
      ...(options.skillsIndex ? { skillsIndex: options.skillsIndex } : {}),
      ...(options.goal ? { goal: options.goal } : {}),
      ...(options.planStep ? { planStep: options.planStep } : {}),
      ...(options.context ? { context: options.context } : {}),
    });
    const messages: ModelMessage[] = [
      ...(options.history ?? []).map((message): ModelMessage => ({
        role: message.role,
        content: message.content,
      })),
      { role: 'user', content: options.prompt },
    ];
    const result = streamText({
      model: options.resolvedModel.model,
      system,
      messages,
      temperature: options.resolvedModel.profile.temperature.default,
      ...(tools
        ? {
            tools,
            activeTools: advisedToolNames(
              mode,
              options.resolvedModel.profile.toolCalling.maxToolsAdvised,
            ),
            experimental_repairToolCall: async ({ toolCall }) => {
              const repaired = repairJson(toolCall.input);
              if (repaired.value === undefined) return null;
              return { ...toolCall, input: JSON.stringify(repaired.value) };
            },
          }
        : {}),
      ...(options.reasoningEffort
        ? {
            providerOptions: reasoningProviderOptions(
              options.resolvedModel,
              options.reasoningEffort,
            ),
          }
        : {}),
      stopWhen: stepCountIs(options.maxSteps ?? 50),
      onError: () => {},
      ...(options.signal ? { abortSignal: options.signal } : {}),
      prepareStep: ({ messages: stepMessages, stepNumber }) => {
        const additions: ModelMessage[] = [];
        const steer = options.steerQueue?.consumeSteer();
        if (steer) {
          additions.push({ role: 'user', content: `${STEER_PREFIX}\n${steer.text}` });
          callbacks.onSteered?.(steer);
        }
        if (stepNumber > 0 && stepNumber % 10 === 0) {
          const reminder = reanchor(options.goal, options.planStep);
          if (reminder) additions.push({ role: 'system', content: reminder });
        }
        if (loopReminder) {
          additions.push({ role: 'system', content: loopReminder });
          loopReminder = undefined;
        }
        return additions.length > 0 ? { messages: [...stepMessages, ...additions] } : {};
      },
    });
    let text = '';
    let reasoning = '';
    let streamError: Error | undefined;
    for await (const part of result.fullStream) {
      if (part.type === 'text-delta') {
        text += part.text;
        callbacks.onText?.(part.text);
      } else if (part.type === 'reasoning-delta') {
        reasoning += part.text;
        callbacks.onReasoning?.(part.text);
      } else if (part.type === 'error') {
        streamError = normalizeRunError(part.error, options.resolvedModel.provider);
      }
    }
    if (streamError) {
      await Promise.allSettled([
        result.totalUsage,
        result.finishReason,
        result.text,
        result.reasoning,
      ]);
      throw streamError;
    }
    if (options.resolvedModel.profile.toolCalling.xmlLeakage) {
      const promoted = promoteXmlToolLeakage(reasoning);
      if (promoted.toolBlocks.length > 0) {
        reasoning = promoted.reasoning;
        callbacks.onReasoningReplaced?.(reasoning);
      }
    }
    const rawUsage = await result.totalUsage;
    const usage: AgentUsage = {
      inputTokens: rawUsage.inputTokens ?? 0,
      outputTokens: rawUsage.outputTokens ?? 0,
      cachedInputTokens: rawUsage.cachedInputTokens ?? 0,
      estimatedCost: estimateCost(options.resolvedModel.profile, {
        inputTokens: rawUsage.inputTokens ?? 0,
        outputTokens: rawUsage.outputTokens ?? 0,
        cachedInputTokens: rawUsage.cachedInputTokens ?? 0,
      }),
    };
    callbacks.onUsage?.(usage);
    return {
      text,
      reasoning,
      usage,
      suggestions: fallbackSuggestions({ text }),
    };
  }
}

function advisedToolNames(mode: ApprovalMode, limit: number) {
  const allowed = allowedToolNames(mode);
  if (allowed.length <= limit) return allowed;
  return allowed.filter((name) => name !== 'fetch_url').slice(0, limit);
}

function reasoningProviderOptions(
  resolvedModel: ResolvedModel,
  effort: 'low' | 'medium' | 'high',
): SharedV2ProviderOptions {
  switch (resolvedModel.provider) {
    case 'anthropic':
      return { anthropic: { effort } };
    case 'openai':
      return { openai: { reasoningEffort: effort } };
    case 'google':
      return { google: { thinkingConfig: { thinkingLevel: effort, includeThoughts: true } } };
    case 'openrouter':
      return { openrouter: { reasoning: { effort } } };
    default:
      return {};
  }
}

function normalizeRunError(error: unknown, provider: string): Error {
  const message = error instanceof Error ? error.message : String(error);
  if (/401|unauthorized|invalid.*key/iu.test(message)) {
    return new Error(`Your ${provider} key was rejected. Fix it in Helm → API Keys.`);
  }
  if (/429|rate.?limit/iu.test(message)) {
    return new Error(`${provider} is rate-limiting this session. Wait or switch models.`);
  }
  if (/abort/iu.test(message)) return new Error('The run was stopped. Your queue is unchanged.');
  return new Error(`${provider} could not complete the run: ${message}`);
}
