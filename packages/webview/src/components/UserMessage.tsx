import type { ChatMessage } from '@helm/core/browser';

import { Icon } from './Icon';

export interface UserMessageProps {
  message: ChatMessage;
}

function extractContext(text: string): string[] {
  return text.match(/@(file|folder):(?:"[^"]+"|[^\s]+)/gu) ?? [];
}

export function UserMessage({ message }: UserMessageProps): React.JSX.Element {
  const context = extractContext(message.text);
  return (
    <article className="ml-auto flex w-full max-w-[85%] min-w-0 flex-col items-end gap-1">
      <div className="max-w-full whitespace-pre-wrap break-words rounded-[var(--helm-radius-control)] bg-[var(--helm-user-message-background)] p-2">
        {message.text}
      </div>
      {context.length > 0 && (
        <div className="flex max-w-full flex-wrap justify-end gap-1">
          {context.map((reference) => (
            <span
              className="flex max-w-full items-center gap-1 rounded-[var(--helm-radius-control)] bg-[var(--helm-input-background)] px-1.5 py-0.5 text-[length:var(--helm-font-size-meta)] text-[var(--helm-description-foreground)]"
              key={reference}
            >
              <Icon name={reference.startsWith('@folder:') ? 'folder' : 'file'} />
              <span className="truncate">{reference}</span>
            </span>
          ))}
        </div>
      )}
    </article>
  );
}
