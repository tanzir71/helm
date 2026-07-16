import type { ChatMessage } from '@helm/core/browser';
import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';

import { AssistantMessage } from './AssistantMessage';
import { Icon } from './Icon';
import { UserMessage } from './UserMessage';

export interface TranscriptProps {
  activeRunMessageId?: string | undefined;
  children?: ReactNode;
  messages: ChatMessage[];
  status?: string | undefined;
}

export function Transcript({
  activeRunMessageId,
  children,
  messages,
  status,
}: TranscriptProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const shouldFollowRef = useRef(true);
  const [showScrollButton, setShowScrollButton] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (container && shouldFollowRef.current) container.scrollTop = container.scrollHeight;
  }, [children, messages, status]);

  const scrollToBottom = () => {
    const container = containerRef.current;
    if (!container) return;
    shouldFollowRef.current = true;
    setShowScrollButton(false);
    container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
  };

  return (
    <section className="relative min-h-0 min-w-0 flex-1">
      <div
        aria-live="polite"
        className="h-full min-w-0 overflow-y-auto overflow-x-hidden px-3 py-4"
        onScroll={(event) => {
          const element = event.currentTarget;
          const atBottom = element.scrollHeight - element.scrollTop - element.clientHeight < 8;
          shouldFollowRef.current = atBottom;
          setShowScrollButton(!atBottom);
        }}
        ref={containerRef}
        role="log"
      >
        <div className="flex min-w-0 flex-col gap-4">
          {messages.map((message) => {
            if (message.role === 'system') {
              return (
                <div
                  className="text-center text-[length:var(--helm-font-size-meta)] text-[var(--helm-description-foreground)]"
                  key={message.id}
                >
                  {message.text}
                </div>
              );
            }
            if (message.role === 'user') return <UserMessage key={message.id} message={message} />;
            return (
              <AssistantMessage
                key={message.id}
                message={message}
                streaming={message.id === activeRunMessageId}
              />
            );
          })}
          {children}
          {status && (
            <div
              aria-live="polite"
              className="flex items-center gap-2 text-[length:var(--helm-font-size-meta)] text-[var(--helm-description-foreground)]"
              role="status"
            >
              <span className="size-1.5 animate-pulse rounded-full bg-[var(--helm-description-foreground)]" />
              <span>{status}</span>
            </div>
          )}
        </div>
      </div>
      {showScrollButton && (
        <button
          aria-label="Scroll to latest message"
          className="absolute bottom-2 left-1/2 flex size-6 -translate-x-1/2 items-center justify-center rounded-full border border-[var(--helm-border)] bg-[var(--helm-widget-background)] p-0 shadow-[var(--helm-popover-shadow)] hover:bg-[var(--helm-list-hover)]"
          onClick={scrollToBottom}
          type="button"
        >
          <Icon name="arrow-down" />
        </button>
      )}
    </section>
  );
}
