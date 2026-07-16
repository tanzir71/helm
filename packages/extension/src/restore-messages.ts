import type { ChatMessage, HostToWebviewMessage, SessionSettings } from '@helm/core';

export function createRestoreMessages(
  messages: ChatMessage[],
  settings: SessionSettings,
  running: boolean,
): HostToWebviewMessage[] {
  return [
    { type: 'hello', version: '0.1.0' },
    { type: 'sessionRestored', messages, settings },
    { type: 'runStateChanged', state: running ? 'running' : 'idle' },
  ];
}
