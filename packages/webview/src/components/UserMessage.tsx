import type { ChatMessage } from '@helm/core/browser';

import { Icon } from './Icon';

export interface UserMessageProps {
  message: ChatMessage;
}

export interface ParsedUserMessage {
  context: string[];
  text: string;
}

const CONTEXT_REFERENCE = /@(file|folder):(?:"[^"]+"|[^\s]+)/gu;

export function parseUserMessage(text: string, attachedContext: string[] = []): ParsedUserMessage {
  const context = [...new Set([...(text.match(CONTEXT_REFERENCE) ?? []), ...attachedContext])];
  const visibleText = text
    .replace(CONTEXT_REFERENCE, '')
    .replace(/[ \t]+\n/gu, '\n')
    .replace(/\n[ \t]+/gu, '\n')
    .replace(/[ \t]{2,}/gu, ' ')
    .replace(/\n{3,}/gu, '\n\n')
    .trim();
  return { context, text: visibleText };
}

export function UserMessage({ message }: UserMessageProps): React.JSX.Element {
  const { context, text } = parseUserMessage(message.text, message.context);
  return (
    <article className="ml-auto flex w-full max-w-[85%] min-w-0 flex-col items-end gap-1">
      {text && (
        <div className="max-w-full whitespace-pre-wrap break-words rounded-[var(--helm-radius-control)] bg-[var(--helm-user-message-background)] p-2">
          {text}
        </div>
      )}
      {context.length > 0 && (
        <div className="flex max-w-full flex-wrap justify-end gap-1">
          {context.map((reference) => (
            <span
              className="flex max-w-full items-center gap-1 rounded-[var(--helm-radius-control)] bg-[var(--helm-input-background)] px-1.5 py-0.5 text-[length:var(--helm-font-size-meta)] text-[var(--helm-description-foreground)]"
              key={reference}
            >
              <Icon name={reference.startsWith('@folder:') ? 'folder' : 'file'} />
              <span className="min-w-0 break-all">{reference}</span>
            </span>
          ))}
        </div>
      )}
    </article>
  );
}
