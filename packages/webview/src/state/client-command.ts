export type ClientCommand = 'openSettings' | 'openSkills';

export function resolveClientCommand(input: string): ClientCommand | undefined {
  const command = input.trim();
  if (command === '/model') return 'openSettings';
  if (command === '/skills') return 'openSkills';
  return undefined;
}
