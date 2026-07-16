export type SlashCommand =
  | 'plan'
  | 'goal'
  | 'review'
  | 'init'
  | 'model'
  | 'skills'
  | 'status'
  | 'compact'
  | 'clear'
  | 'help';

export const SLASH_COMMANDS: ReadonlyArray<{ name: SlashCommand; description: string }> = [
  { name: 'plan', description: 'Create a plan and wait before executing' },
  { name: 'goal', description: 'Pin a persistent session goal' },
  { name: 'review', description: 'Review staged and unstaged changes' },
  { name: 'init', description: 'Generate workspace AGENTS.md instructions' },
  { name: 'model', description: 'Choose provider and model' },
  { name: 'skills', description: 'Manage built-in, global, and workspace skills' },
  { name: 'status', description: 'Show model, mode, usage, queue, and skills' },
  { name: 'compact', description: 'Compact old conversation context' },
  { name: 'clear', description: 'Start a new session after confirmation' },
  { name: 'help', description: 'List available commands' },
];

export function parseSlashCommand(
  input: string,
): { command: SlashCommand; argument: string } | undefined {
  const match = /^\/(\w+)(?:\s+([\s\S]*))?$/u.exec(input.trim());
  if (!match) return undefined;
  const command = match[1] as SlashCommand;
  if (!SLASH_COMMANDS.some((item) => item.name === command)) return undefined;
  return { command, argument: (match[2] ?? '').trim() };
}

export function filterSlashCommands(query: string): typeof SLASH_COMMANDS {
  const normalized = query.replace(/^\//u, '').toLowerCase();
  return SLASH_COMMANDS.filter(
    (item) => item.name.includes(normalized) || item.description.toLowerCase().includes(normalized),
  );
}
