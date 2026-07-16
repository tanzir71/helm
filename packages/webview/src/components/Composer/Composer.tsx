import type { ApprovalMode, SessionSettings } from '@helm/core/browser';
import { useLayoutEffect, useRef } from 'react';

import { CommandPopover } from './CommandPopover';
import { ComposerToolbar } from './ComposerToolbar';

export type SubmitKind = 'userMessage' | 'queueMessage' | 'steerMessage';

export interface ComposerProps {
  contextItems: string[];
  input: string;
  onInputChange: (value: string) => void;
  onModeChange: (mode: ApprovalMode) => void;
  onOpenModel: () => void;
  onStop: () => void;
  onSubmit: (kind: SubmitKind) => void;
  onToggleAutoContext: () => void;
  running: boolean;
  settings: SessionSettings;
}

export function Composer({
  contextItems,
  input,
  onInputChange,
  onModeChange,
  onOpenModel,
  onStop,
  onSubmit,
  onToggleAutoContext,
  running,
  settings,
}: ComposerProps): React.JSX.Element {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = '0px';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 180)}px`;
  }, [input]);

  const primarySubmit: SubmitKind = running
    ? settings.enterBehavior === 'queue'
      ? 'queueMessage'
      : 'steerMessage'
    : 'userMessage';
  const inverseSubmit: SubmitKind =
    settings.enterBehavior === 'queue' ? 'steerMessage' : 'queueMessage';

  return (
    <div className="relative min-w-0 rounded-[var(--helm-radius-container)] border border-[var(--helm-border)] bg-[var(--helm-input-background)] focus-within:border-[var(--helm-focus-border)]">
      <CommandPopover
        contextItems={contextItems}
        input={input}
        onChooseMention={(name) => onInputChange(input.replace(/@[^\s]*$/u, name))}
        onChooseSlash={(name) => onInputChange(`/${name}${name === 'goal' ? ' ' : ''}`)}
      />
      <textarea
        aria-label="Message Helm"
        className="block max-h-[180px] min-h-[36px] w-full resize-none overflow-y-auto border-0 bg-transparent px-2 py-2 outline-none placeholder:text-[var(--helm-input-placeholder)]"
        onChange={(event) => onInputChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            if (input.trim()) onSubmit(primarySubmit);
          } else if (event.key === 'Tab' && running && input.trim()) {
            event.preventDefault();
            onSubmit(inverseSubmit);
          }
        }}
        placeholder="Ask Helm anything — @ for context, / for commands"
        ref={textareaRef}
        rows={1}
        value={input}
      />
      <ComposerToolbar
        canSend={Boolean(input.trim())}
        onAttach={() => onInputChange(`${input}@`)}
        onModeChange={onModeChange}
        onOpenModel={onOpenModel}
        onSend={() => onSubmit(primarySubmit)}
        onStop={onStop}
        onToggleAutoContext={onToggleAutoContext}
        running={running}
        settings={settings}
      />
    </div>
  );
}
