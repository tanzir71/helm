import { describe, expect, it, vi } from 'vitest';

import { allowedToolNames, createAgentTools, type ToolHost } from '../src/tools.js';

const options = {
  toolCallId: 'call-1',
  messages: [],
  abortSignal: new AbortController().signal,
};

describe('agent tools', () => {
  it('exposes read-only tools in Chat mode', () => {
    expect(allowedToolNames('chat')).toEqual([
      'read_file',
      'list_dir',
      'glob',
      'grep',
      'use_skill',
    ]);
    expect(allowedToolNames('agent')).toContain('run_command');
  });

  it('forwards validated calls and emits friendly lifecycle events', async () => {
    const execute = vi.fn(async () => '1: hello');
    const started = vi.fn();
    const finished = vi.fn();
    const host: ToolHost = { execute };
    const tools = createAgentTools(host, 'agent', { onStarted: started, onFinished: finished });
    const run = tools.read_file.execute;
    expect(run).toBeDefined();
    const output = await run!({ path: 'a.ts' }, options);
    expect(output).toBe('1: hello');
    expect(execute).toHaveBeenCalledWith(
      'read_file',
      { path: 'a.ts' },
      expect.objectContaining({ mode: 'agent' }),
    );
    expect(started).toHaveBeenCalledOnce();
    expect(finished).toHaveBeenCalledWith(expect.objectContaining({ ok: true }));
  });

  it('blocks writes in Chat mode before reaching the host', async () => {
    const execute = vi.fn(async () => 'no');
    const tools = createAgentTools({ execute }, 'chat');
    await expect(tools.write_file.execute!({ path: 'a', content: 'x' }, options)).rejects.toThrow(
      'unavailable',
    );
    expect(execute).not.toHaveBeenCalled();
  });
});
