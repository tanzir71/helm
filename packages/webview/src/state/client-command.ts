export type ClientCommand = 'openSettings';

export function resolveClientCommand(input: string): ClientCommand | undefined {
  return input.trim() === '/model' ? 'openSettings' : undefined;
}
