import type { SessionSettings, WebviewToHostMessage } from './protocol.js';

export type ComposerKey = 'Enter' | 'Tab';
export type ComposerSubmitAction = Extract<
  WebviewToHostMessage['type'],
  'userMessage' | 'queueMessage' | 'steerMessage'
>;

export function resolveEnterAction(
  settings: Pick<SessionSettings, 'enterBehavior'>,
  running: boolean,
  key: ComposerKey,
): ComposerSubmitAction | undefined {
  if (!running) return key === 'Enter' ? 'userMessage' : undefined;
  if (key === 'Enter') {
    return settings.enterBehavior === 'queue' ? 'queueMessage' : 'steerMessage';
  }
  return settings.enterBehavior === 'queue' ? 'steerMessage' : 'queueMessage';
}
