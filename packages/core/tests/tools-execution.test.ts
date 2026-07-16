import { describe, expect, it, vi } from 'vitest';

import { SkillLoader } from '../src/skill-loader.js';
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
    expect(allowedToolNames('chat', true)).toContain('web_search');
    expect(allowedToolNames('chat', true)).toContain('web_fetch');
  });

  it('registers web tools only when the capability is enabled', () => {
    const host: ToolHost = { execute: async () => 'ok' };
    expect(createAgentTools(host, 'agent')).not.toHaveProperty('web_search');
    expect(createAgentTools(host, 'agent', {}, { webEnabled: true })).toHaveProperty('web_search');
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

  it('loads both bundled workspace skills through the agent use_skill tool', async () => {
    const loader = new SkillLoader();
    const root = new URL('../../../.helm/skills/', import.meta.url);
    const discovered = await loader.discover([root.pathname]);
    expect(discovered.map((skill) => skill.name).sort()).toEqual(['commit-message', 'write-tests']);
    const tools = createAgentTools(
      {
        execute: async () => 'unused',
        loadSkill: async (name) => (await loader.load(name)).body,
      },
      'chat',
    );
    await expect(tools.use_skill.execute!({ name: 'write-tests' }, options)).resolves.toContain(
      '`run_command`',
    );
    await expect(tools.use_skill.execute!({ name: 'commit-message' }, options)).resolves.toContain(
      'imperative mood',
    );
  });
});
