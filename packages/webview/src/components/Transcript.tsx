import type { ChatMessage } from '@helm/core/browser';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  Children,
  isValidElement,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { AssistantMessage } from './AssistantMessage';
import { Icon } from './Icon';
import { UserMessage } from './UserMessage';

export interface TranscriptProps {
  activeRunMessageId?: string | undefined;
  children?: ReactNode;
  messages: ChatMessage[];
  reasoningDurationMs?: Record<string, number> | undefined;
  reasoningStartedAt?: Record<string, number> | undefined;
  status?: string | undefined;
}

type TranscriptItem =
  | { key: string; kind: 'message'; message: ChatMessage }
  | { key: string; kind: 'content'; node: ReactNode }
  | { key: string; kind: 'status'; text: string };

export function Transcript({
  activeRunMessageId,
  children,
  messages,
  reasoningDurationMs = {},
  reasoningStartedAt = {},
  status,
}: TranscriptProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const shouldFollowRef = useRef(true);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const items = useMemo<TranscriptItem[]>(() => {
    const messageItems: TranscriptItem[] = messages.map((message) => ({
      key: message.id,
      kind: 'message',
      message,
    }));
    const contentItems: TranscriptItem[] = Children.toArray(children).map((node, index) => ({
      key: `content-${isValidElement(node) && node.key !== null ? node.key : index}`,
      kind: 'content',
      node,
    }));
    return status
      ? [...messageItems, ...contentItems, { key: 'live-status', kind: 'status', text: status }]
      : [...messageItems, ...contentItems];
  }, [children, messages, status]);
  const virtualizer = useVirtualizer({
    count: items.length,
    estimateSize: () => 96,
    getItemKey: (index) => items[index]?.key ?? index,
    getScrollElement: () => containerRef.current,
    overscan: 6,
  });
  const lastMessageLength = messages.at(-1)?.text.length ?? 0;

  useEffect(() => {
    if (!shouldFollowRef.current || items.length === 0) return;
    const frame = window.requestAnimationFrame(() => {
      virtualizer.scrollToIndex(items.length - 1, { align: 'end' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [items.length, lastMessageLength, status, virtualizer]);

  const scrollToBottom = () => {
    shouldFollowRef.current = true;
    setShowScrollButton(false);
    if (items.length > 0) virtualizer.scrollToIndex(items.length - 1, { align: 'end' });
  };

  return (
    <section className="relative min-h-0 min-w-0 flex-1">
      <div
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
        <div className="relative min-w-0" style={{ height: `${virtualizer.getTotalSize()}px` }}>
          {virtualizer.getVirtualItems().map((virtualItem) => {
            const item = items[virtualItem.index];
            if (!item) return null;
            return (
              <div
                className="absolute top-0 left-0 w-full min-w-0 pb-4"
                data-index={virtualItem.index}
                key={item.key}
                ref={virtualizer.measureElement}
                style={{ transform: `translateY(${virtualItem.start}px)` }}
              >
                {item.kind === 'message' && item.message.role === 'system' && (
                  <div className="text-center text-[length:var(--helm-font-size-meta)] text-[var(--helm-description-foreground)]">
                    {item.message.text}
                  </div>
                )}
                {item.kind === 'message' && item.message.role === 'user' && (
                  <UserMessage message={item.message} />
                )}
                {item.kind === 'message' && item.message.role === 'assistant' && (
                  <AssistantMessage
                    message={item.message}
                    reasoningDurationMs={reasoningDurationMs[item.message.id]}
                    reasoningStartedAt={reasoningStartedAt[item.message.id]}
                    streaming={item.message.id === activeRunMessageId}
                  />
                )}
                {item.kind === 'content' && item.node}
                {item.kind === 'status' && (
                  <div
                    aria-live="polite"
                    className="flex items-center gap-2 text-[length:var(--helm-font-size-meta)] text-[var(--helm-description-foreground)]"
                    role="status"
                  >
                    <span className="size-1.5 animate-pulse rounded-full bg-[var(--helm-description-foreground)]" />
                    <span>{item.text}</span>
                  </div>
                )}
              </div>
            );
          })}
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
