import { jsonSchema, tool, zodSchema } from 'ai';
import { z } from 'zod';

import type { ApprovalMode } from './protocol.js';
import { RepeatCallGuard, validateToolInput } from './tool-robustness.js';

export const TOOL_SCHEMAS = {
  read_file: z.object({
    path: z.string(),
    start_line: z.number().int().positive().optional(),
    end_line: z.number().int().positive().optional(),
  }),
  list_dir: z.object({ path: z.string() }),
  glob: z.object({ pattern: z.string(), path: z.string().optional() }),
  grep: z.object({ query: z.string(), path: z.string().optional(), glob: z.string().optional() }),
  write_file: z.object({ path: z.string(), content: z.string() }),
  edit_file: z.object({ path: z.string(), old_text: z.string(), new_text: z.string() }),
  run_command: z.object({ command: z.string(), cwd: z.string().optional() }),
  fetch_url: z.object({ url: z.string().url() }),
  web_search: z.object({
    query: z.string(),
    max_results: z.number().int().min(1).max(8).optional(),
  }),
  web_fetch: z.object({ url: z.string().url() }),
  explore_code: z.object({ query: z.string().min(1) }),
  use_skill: z.object({ name: z.string() }),
} as const;

export type ToolName = keyof typeof TOOL_SCHEMAS;

export interface ToolHost {
  execute(
    toolName: Exclude<ToolName, 'use_skill'>,
    input: Record<string, unknown>,
    context: { mode: ApprovalMode; callId: string; signal?: AbortSignal },
  ): Promise<unknown>;
  loadSkill?(name: string): Promise<string>;
}

export interface ToolEventCallbacks {
  onStarted?(event: { callId: string; tool: ToolName; input: unknown }): void;
  onFinished?(event: { callId: string; tool: ToolName; output: unknown; ok: boolean }): void;
  onLoopWarning?(warning: string, pause: boolean): void;
}

export function allowedToolNames(
  mode: ApprovalMode,
  webEnabled = false,
  codeGraphEnabled = false,
): ToolName[] {
  const webTools: ToolName[] = webEnabled ? ['web_search', 'web_fetch'] : [];
  if (mode === 'chat') return ['read_file', 'list_dir', 'glob', 'grep', ...webTools, 'use_skill'];
  return (Object.keys(TOOL_SCHEMAS) as ToolName[]).filter(
    (name) =>
      (webEnabled || (name !== 'web_search' && name !== 'web_fetch')) &&
      (codeGraphEnabled || name !== 'explore_code'),
  );
}

export function createAgentTools(
  host: ToolHost,
  mode: ApprovalMode,
  callbacks: ToolEventCallbacks = {},
  options: { webEnabled?: boolean; codeGraphEnabled?: boolean } = {},
) {
  const webEnabled = options.webEnabled === true;
  const codeGraphEnabled = options.codeGraphEnabled === true;
  const guard = new RepeatCallGuard();
  const execute = async (
    name: ToolName,
    input: unknown,
    callId: string,
    signal?: AbortSignal,
  ): Promise<unknown> => {
    if (!allowedToolNames(mode, webEnabled, codeGraphEnabled).includes(name))
      throw new Error(`${name} is unavailable in the current mode or workspace.`);
    const repeat = guard.record(name, input);
    if (repeat.warning) callbacks.onLoopWarning?.(repeat.warning, repeat.pause);
    if (repeat.pause) throw new Error('Run paused after five identical consecutive tool calls.');
    callbacks.onStarted?.({ callId, tool: name, input });
    const validation = validateToolInput(TOOL_SCHEMAS[name] as z.ZodType<unknown>, input);
    if (!validation.ok) {
      const output = {
        error: validation.feedback,
        instruction: 'Fix your tool call and retry once.',
      };
      callbacks.onFinished?.({ callId, tool: name, output, ok: false });
      return output;
    }
    const validatedInput = validation.value as Record<string, unknown>;
    try {
      const output =
        name === 'use_skill'
          ? await host.loadSkill?.(String(validatedInput.name))
          : await host.execute(name, validatedInput, {
              mode,
              callId,
              ...(signal ? { signal } : {}),
            });
      callbacks.onFinished?.({ callId, tool: name, output, ok: true });
      return output ?? 'Done.';
    } catch (error) {
      const output = error instanceof Error ? error.message : String(error);
      callbacks.onFinished?.({ callId, tool: name, output, ok: false });
      return {
        error: output,
        instruction: 'Fix your tool call or change approach and retry once.',
      };
    }
  };
  const commonTools = {
    read_file: tool({
      description: 'Read numbered lines from a workspace file.',
      inputSchema: feedbackSchema(TOOL_SCHEMAS.read_file),
      execute: (input, options) =>
        execute('read_file', input, options.toolCallId, options.abortSignal),
    }),
    list_dir: tool({
      description: 'List files and directories at a workspace path.',
      inputSchema: feedbackSchema(TOOL_SCHEMAS.list_dir),
      execute: (input, options) =>
        execute('list_dir', input, options.toolCallId, options.abortSignal),
    }),
    glob: tool({
      description: 'Find workspace paths matching a glob pattern.',
      inputSchema: feedbackSchema(TOOL_SCHEMAS.glob),
      execute: (input, options) => execute('glob', input, options.toolCallId, options.abortSignal),
    }),
    grep: tool({
      description: 'Search workspace text for a query.',
      inputSchema: feedbackSchema(TOOL_SCHEMAS.grep),
      execute: (input, options) => execute('grep', input, options.toolCallId, options.abortSignal),
    }),
    write_file: tool({
      description: 'Propose or write a complete workspace file.',
      inputSchema: feedbackSchema(TOOL_SCHEMAS.write_file),
      execute: (input, options) =>
        execute('write_file', input, options.toolCallId, options.abortSignal),
    }),
    edit_file: tool({
      description: 'Replace exact text in a workspace file.',
      inputSchema: feedbackSchema(TOOL_SCHEMAS.edit_file),
      execute: (input, options) =>
        execute('edit_file', input, options.toolCallId, options.abortSignal),
    }),
    run_command: tool({
      description: 'Run one workspace-scoped shell command.',
      inputSchema: feedbackSchema(TOOL_SCHEMAS.run_command),
      execute: (input, options) =>
        execute('run_command', input, options.toolCallId, options.abortSignal),
    }),
    fetch_url: tool({
      description: 'Fetch a public HTTP or HTTPS URL as capped text.',
      inputSchema: feedbackSchema(TOOL_SCHEMAS.fetch_url),
      execute: (input, options) =>
        execute('fetch_url', input, options.toolCallId, options.abortSignal),
    }),
    web_search: tool({
      description: 'Search the live public web for current information and source URLs.',
      inputSchema: feedbackSchema(TOOL_SCHEMAS.web_search),
      execute: (input, options) =>
        execute('web_search', input, options.toolCallId, options.abortSignal),
    }),
    web_fetch: tool({
      description: 'Fetch one public web page as safe readable markdown.',
      inputSchema: feedbackSchema(TOOL_SCHEMAS.web_fetch),
      execute: (input, options) =>
        execute('web_fetch', input, options.toolCallId, options.abortSignal),
    }),
    explore_code: tool({
      description:
        'Explore the indexed code graph for relevant source, call paths, and change impact.',
      inputSchema: feedbackSchema(TOOL_SCHEMAS.explore_code),
      execute: (input, options) =>
        execute('explore_code', input, options.toolCallId, options.abortSignal),
    }),
    use_skill: tool({
      description: 'Load the full instructions for one discovered skill.',
      inputSchema: feedbackSchema(TOOL_SCHEMAS.use_skill),
      execute: (input, options) =>
        execute('use_skill', input, options.toolCallId, options.abortSignal),
    }),
  };
  if (!webEnabled) {
    Reflect.deleteProperty(commonTools, 'web_search');
    Reflect.deleteProperty(commonTools, 'web_fetch');
  }
  if (!codeGraphEnabled || mode === 'chat') Reflect.deleteProperty(commonTools, 'explore_code');
  return commonTools;
}

function feedbackSchema(schema: z.ZodType) {
  return jsonSchema<unknown>(zodSchema(schema).jsonSchema, {
    validate: (value) => ({ success: true, value }),
  });
}
