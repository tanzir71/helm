import process from 'node:process';
import { createInterface } from 'node:readline/promises';

import {
  AgentRunner,
  createMockResolvedModel,
  ProviderRegistry,
  type AgentMessage,
  type AgentRunResult,
  type ResolvedModel,
} from '@helm/core';

import { WorkspaceGoalStore } from './goal-store.js';
import {
  CliUsageError,
  parseCliArguments,
  resolveRuntimeModelConfig,
  type CliArguments,
  type RuntimeModelConfig,
} from './options.js';
import { createPlanPrompt, createPlanStepPrompt, extractPlan } from './workflow.js';

declare const __HELM_VERSION__: string;

const HELP = `Helm CLI

Usage:
  helm-ai [options] [prompt]
  helm-ai plan [options] <task>
  helm-ai goal [goal | clear]
  helm-ai solo [options] <task>

Workflows:
  plan                     Produce a read-only numbered plan
  goal                     Show, set, or clear the goal for this working directory
  solo                     Plan, ask for approval, then run each approved step

Options:
      --plan               Alias for the plan command
      --solo               Alias for the solo command
      --goal <text>        Override the saved goal for this run
  -y, --yes                Approve a Solo plan without an interactive prompt
  -p, --provider <id>      Model provider
  -m, --model <id>         Model ID; known model names infer their provider
      --base-url <url>     Override the provider's OpenAI-compatible endpoint
      --reasoning <level>  low, medium, or high
  -h, --help               Show help
  -v, --version            Show version

Environment:
  HELM_PROVIDER, HELM_MODEL, HELM_API_KEY, HELM_BASE_URL, HELM_REASONING,
  HELM_GOAL, and HELM_HOME. Provider keys such as ANTHROPIC_API_KEY,
  OPENAI_API_KEY, OPENROUTER_API_KEY, GOOGLE_GENERATIVE_AI_API_KEY,
  MOONSHOT_API_KEY, ZAI_API_KEY, DEEPSEEK_API_KEY, and DASHSCOPE_API_KEY
  are also detected.

Examples:
  helm-ai plan "Add an API endpoint"
  helm-ai goal "Ship the first public release"
  helm-ai solo "Implement the endpoint"
  helm-ai solo --yes "Run the approved migration"
  helm-ai --provider ollama --model qwen3-coder "Review this function"
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

  const goalStore = new WorkspaceGoalStore();
  const workspace = process.cwd();
  if (options.command === 'goal') {
    await handleGoalCommand(goalStore, workspace, options.prompt || options.goal);
    return;
  }

  const runtime = resolveRuntimeModelConfig(options, process.env);
  const resolvedModel = resolveModel(runtime);
  const savedGoal = await goalStore.get(workspace);
  const goalOverride = options.goal ?? process.env.HELM_GOAL;
  const effectiveGoal = goalOverride ?? savedGoal;

  if (options.command === 'plan') {
    const result = await runTurn({
      options,
      prompt: createPlanPrompt(options.prompt),
      resolvedModel: modelFor(runtime, resolvedModel, demoPlan()),
      ...(effectiveGoal ? { goal: effectiveGoal } : {}),
    });
    printUsage(totalTokens(result));
    return;
  }

  if (options.command === 'solo') {
    await runSolo({
      goalOverride,
      goalStore,
      options,
      resolvedModel,
      runtime,
      workspace,
    });
    return;
  }

  const result = await runTurn({
    options,
    prompt: options.prompt,
    resolvedModel: modelFor(runtime, resolvedModel, `Hi — Helm received: ${options.prompt}`),
    ...(effectiveGoal ? { goal: effectiveGoal } : {}),
  });
  printUsage(totalTokens(result));
}

interface SoloOptions {
  goalOverride: string | undefined;
  goalStore: WorkspaceGoalStore;
  options: CliArguments;
  resolvedModel: ResolvedModel | undefined;
  runtime: RuntimeModelConfig;
  workspace: string;
}

async function runSolo(input: SoloOptions): Promise<void> {
  process.stdout.write('Plan\n\n');
  const planPrompt = createPlanPrompt(input.options.prompt);
  const planResult = await runTurn({
    options: input.options,
    prompt: planPrompt,
    resolvedModel: modelFor(input.runtime, input.resolvedModel, demoPlan()),
    ...(input.goalOverride ? { goal: input.goalOverride } : {}),
  });
  const plan = extractPlan(planResult.text);
  if (plan.length === 0) {
    throw new Error('The model did not return a numbered plan. Refine the task and try again.');
  }

  if (!(await approveSolo(input.options.yes))) {
    process.stdout.write('\nSolo run canceled.\n');
    printUsage(totalTokens(planResult));
    return;
  }

  const goal = input.goalOverride ?? input.options.prompt;
  if (!input.goalOverride) await input.goalStore.set(input.workspace, goal);
  const history: AgentMessage[] = [
    { role: 'user', content: planPrompt },
    { role: 'assistant', content: planResult.text },
  ];
  let tokens = totalTokens(planResult);

  for (const [index, step] of plan.entries()) {
    const prompt = createPlanStepPrompt(index, plan.length, step);
    process.stdout.write(`\nStep ${index + 1}/${plan.length} — ${step.text}\n\n`);
    const result = await runTurn({
      goal,
      history,
      options: input.options,
      planStep: step.text,
      prompt,
      resolvedModel: modelFor(
        input.runtime,
        input.resolvedModel,
        `Completed plan step ${index + 1}/${plan.length}: ${step.text}`,
      ),
    });
    tokens += totalTokens(result);
    history.push({ role: 'user', content: prompt }, { role: 'assistant', content: result.text });
  }

  process.stdout.write('\nSolo run complete.\n');
  printUsage(tokens);
}

interface TurnOptions {
  goal?: string;
  history?: readonly AgentMessage[];
  options: CliArguments;
  planStep?: string;
  prompt: string;
  resolvedModel: ResolvedModel;
}

async function runTurn(input: TurnOptions): Promise<AgentRunResult> {
  return new AgentRunner().run({
    resolvedModel: input.resolvedModel,
    prompt: input.prompt,
    mode: 'chat',
    ...(input.goal ? { goal: input.goal } : {}),
    ...(input.history ? { history: input.history } : {}),
    ...(input.planStep ? { planStep: input.planStep } : {}),
    ...(input.options.reasoningEffort ? { reasoningEffort: input.options.reasoningEffort } : {}),
    callbacks: { onText: (text) => process.stdout.write(text) },
  });
}

async function handleGoalCommand(
  store: WorkspaceGoalStore,
  workspace: string,
  requestedGoal: string | undefined,
): Promise<void> {
  if (!requestedGoal) {
    const current = await store.get(workspace);
    process.stdout.write(current ? `${current}\n` : 'No goal set for this working directory.\n');
    return;
  }
  if (requestedGoal.toLowerCase() === 'clear') {
    const cleared = await store.clear(workspace);
    process.stdout.write(cleared ? 'Goal cleared.\n' : 'No goal was set.\n');
    return;
  }
  await store.set(workspace, requestedGoal);
  process.stdout.write(`Goal set: ${requestedGoal.trim()}\n`);
}

async function approveSolo(yes: boolean): Promise<boolean> {
  if (yes) return true;
  if (process.stdin.isTTY !== true) {
    throw new CliUsageError('Solo approval needs an interactive terminal. Pass --yes to approve.');
  }
  const terminal = createInterface({ input: process.stdin, output: process.stderr });
  try {
    const answer = await terminal.question('\nApprove this plan and start Solo mode? [y/N] ');
    return /^(y|yes)$/iu.test(answer.trim());
  } finally {
    terminal.close();
  }
}

function resolveModel(runtime: RuntimeModelConfig): ResolvedModel | undefined {
  if (runtime.demo) return undefined;
  return new ProviderRegistry().resolve({
    provider: runtime.provider!,
    modelId: runtime.modelId!,
    ...(runtime.apiKey ? { apiKey: runtime.apiKey } : {}),
    ...(runtime.baseURL ? { baseURL: runtime.baseURL } : {}),
  });
}

function modelFor(
  runtime: RuntimeModelConfig,
  resolvedModel: ResolvedModel | undefined,
  demoResponse: string,
): ResolvedModel {
  return runtime.demo ? createMockResolvedModel(demoResponse, '') : resolvedModel!;
}

function demoPlan(): string {
  return [
    '1. Inspect the relevant code and constraints',
    '2. Implement the requested change',
    '3. Verify the result',
  ].join('\n');
}

function totalTokens(result: AgentRunResult): number {
  return result.usage.inputTokens + result.usage.outputTokens;
}

function printUsage(tokens: number): void {
  process.stdout.write(`\n[${tokens} tokens]\n`);
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`helm-ai: ${message}\n`);
  if (error instanceof CliUsageError) process.stderr.write('Run helm-ai --help for usage.\n');
  process.exitCode = 1;
});
