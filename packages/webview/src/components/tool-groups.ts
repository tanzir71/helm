import type { UiTool } from '@/state/store';

export type ToolDisplayItem =
  { key: string; kind: 'single'; tool: UiTool } | { key: string; kind: 'group'; tools: UiTool[] };

const readOnlyTools = new Set([
  'read_file',
  'list_dir',
  'glob',
  'grep',
  'web_search',
  'explore_code',
]);

export function groupConsecutiveTools(tools: UiTool[]): ToolDisplayItem[] {
  const result: ToolDisplayItem[] = [];
  let pending: UiTool[] = [];

  const flush = () => {
    if (pending.length === 1) {
      const tool = pending[0]!;
      result.push({ key: tool.id, kind: 'single', tool });
    } else if (pending.length > 1) {
      result.push({
        key: `group-${pending.map((tool) => tool.id).join('-')}`,
        kind: 'group',
        tools: pending,
      });
    }
    pending = [];
  };

  for (const tool of tools) {
    if (tool.ok === true && !tool.approval && readOnlyTools.has(tool.name)) {
      pending.push(tool);
    } else {
      flush();
      result.push({ key: tool.id, kind: 'single', tool });
    }
  }
  flush();
  return result;
}
