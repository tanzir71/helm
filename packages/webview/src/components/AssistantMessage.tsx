import type { ChatMessage } from '@helm/core/browser';

import { MessageResponse } from './ai-elements/message';
import { Thinking } from './Thinking';

export interface AssistantMessageProps {
  message: ChatMessage;
  streaming: boolean;
}

export function AssistantMessage({ message, streaming }: AssistantMessageProps): React.JSX.Element {
  return (
    <article className="flex min-w-0 max-w-full flex-col gap-2">
      {message.reasoning && <Thinking content={message.reasoning} streaming={streaming} />}
      {message.text && <MessageResponse streaming={streaming}>{message.text}</MessageResponse>}
      {message.interrupted && (
        <span className="text-[length:var(--helm-font-size-meta)] text-[var(--helm-description-foreground)]">
          Stopped
        </span>
      )}
    </article>
  );
}
