import { tool } from 'ai';
import { z } from 'zod';

import type { ApprovalMode } from './protocol.js';
import { RepeatCallGuard } from './tool-robustness.js';

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

export function allowedToolNames(mode: ApprovalMode): ToolName[] {
  if (mode === 'chat') return ['read_file', 'list_dir', 'glob', 'grep', 'use_skill'];
  return Object.keys(TOOL_SCHEMAS) as ToolName[];
}

export function createAgentTools(
  host: ToolHost,
  mode: ApprovalMode,
  callbacks: ToolEventCallbacks = {},
) {
  const guard = new RepeatCallGuard();
  const execute = async (
    name: ToolName,
    input: Record<string, unknown>,
    callId: string,
    signal?: AbortSignal,
  ): Promise<unknown> => {
    if (!allowedToolNames(mode).includes(name))
      throw new Error(`${name} is unavailable in Chat mode.`);
    const repeat = guard.record(name, input);
    if (repeat.warning) callbacks.onLoopWarning?.(repeat.warning, repeat.pause);
    if (repeat.pause) throw new Error('Run paused after five identical consecutive tool calls.');
    callbacks.onStarted?.({ callId, tool: name, input });
    try {
      const output =
        name === 'use_skill'
          ? await host.loadSkill?.(String(input.name))
          : await host.execute(name, input, { mode, callId, ...(signal ? { signal } : {}) });
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
  return {
    read_file: tool({
      description: 'Read numbered lines from a workspace file.',
      inputSchema: TOOL_SCHEMAS.read_file,
      execute: (input, options) =>
        execute('read_file', input, options.toolCallId, options.abortSignal),
    }),
    list_dir: tool({
      description: 'List files and directories at a workspace path.',
      inputSchema: TOOL_SCHEMAS.list_dir,
      execute: (input, options) =>
        execute('list_dir', input, options.toolCallId, options.abortSignal),
    }),
    glob: tool({
      description: 'Find workspace paths matching a glob pattern.',
      inputSchema: TOOL_SCHEMAS.glob,
      execute: (input, options) => execute('glob', input, options.toolCallId, options.abortSignal),
    }),
    grep: tool({
      description: 'Search workspace text for a query.',
      inputSchema: TOOL_SCHEMAS.grep,
      execute: (input, options) => execute('grep', input, options.toolCallId, options.abortSignal),
    }),
    write_file: tool({
      description: 'Propose or write a complete workspace file.',
      inputSchema: TOOL_SCHEMAS.write_file,
      execute: (input, options) =>
        execute('write_file', input, options.toolCallId, options.abortSignal),
    }),
    edit_file: tool({
      description: 'Replace exact text in a workspace file.',
      inputSchema: TOOL_SCHEMAS.edit_file,
      execute: (input, options) =>
        execute('edit_file', input, options.toolCallId, options.abortSignal),
    }),
    run_command: tool({
      description: 'Run one workspace-scoped shell command.',
      inputSchema: TOOL_SCHEMAS.run_command,
      execute: (input, options) =>
        execute('run_command', input, options.toolCallId, options.abortSignal),
    }),
    fetch_url: tool({
      description: 'Fetch a public HTTP or HTTPS URL as capped text.',
      inputSchema: TOOL_SCHEMAS.fetch_url,
      execute: (input, options) =>
        execute('fetch_url', input, options.toolCallId, options.abortSignal),
    }),
    use_skill: tool({
      description: 'Load the full instructions for one discovered skill.',
      inputSchema: TOOL_SCHEMAS.use_skill,
      execute: (input, options) =>
        execute('use_skill', input, options.toolCallId, options.abortSignal),
    }),
  };
}
