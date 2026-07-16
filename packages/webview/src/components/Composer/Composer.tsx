import { resolveEnterAction, type ApprovalMode, type SessionSettings } from '@helm/core/browser';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import {
  CommandPopover,
  getCommandOptions,
  moveCommandIndex,
  type CommandOption,
} from './CommandPopover';
import { ComposerToolbar } from './ComposerToolbar';
import { FileAttachments } from './FileAttachments';
import { resizeComposerTextarea } from './textarea-layout';

export type SubmitKind = 'userMessage' | 'queueMessage' | 'steerMessage';

export interface ComposerProps {
  fileAttachments: string[];
  contextItems: string[];
  input: string;
  models: ReadonlyArray<{ id: string; label: string }>;
  onInputChange: (value: string) => void;
  onAttachFiles: () => void;
  onModelChange: (modelId: string, effort: SessionSettings['reasoningEffort']) => void;
  onModeChange: (mode: ApprovalMode) => void;
  onRemoveFileAttachment: (reference: string) => void;
  onStop: () => void;
  onSubmit: (kind: SubmitKind) => void;
  onToggleAutoContext: () => void;
  running: boolean;
  settings: SessionSettings;
}

export function Composer({
  fileAttachments,
  contextItems,
  input,
  models,
  onAttachFiles,
  onInputChange,
  onModelChange,
  onModeChange,
  onRemoveFileAttachment,
  onStop,
  onSubmit,
  onToggleAutoContext,
  running,
  settings,
}: ComposerProps): React.JSX.Element {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [activeCommandIndex, setActiveCommandIndex] = useState(0);
  const [dismissedCommandInput, setDismissedCommandInput] = useState<string>();
  const commandOptions = useMemo(
    () => getCommandOptions(input, contextItems),
    [contextItems, input],
  );
  const visibleCommandOptions = dismissedCommandInput === input ? [] : commandOptions;

  useEffect(() => {
    setActiveCommandIndex(0);
  }, [input]);

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    resizeComposerTextarea(textarea);
  }, [input]);

  const primarySubmit = resolveEnterAction(settings, running, 'Enter') ?? 'userMessage';
  const canSubmit = Boolean(input.trim() || fileAttachments.length > 0);
  const chooseCommand = (option: CommandOption) => {
    const nextInput =
      option.kind === 'mention'
        ? input.replace(/@[^\s]*$/u, option.value)
        : `/${option.value}${option.value === 'goal' ? ' ' : ''}`;
    setDismissedCommandInput(nextInput);
    onInputChange(nextInput);
    textareaRef.current?.focus();
  };

  return (
    <div
      className="relative min-w-0 rounded-[var(--helm-radius-container)] border border-[var(--helm-border)] bg-[var(--helm-input-background)] focus-within:border-[var(--helm-focus-border)]"
      data-helm-composer="true"
    >
      <CommandPopover
        activeIndex={activeCommandIndex}
        input={input}
        onChoose={chooseCommand}
        options={visibleCommandOptions}
      />
      <textarea
        aria-activedescendant={
          visibleCommandOptions.length > 0 ? `helm-command-option-${activeCommandIndex}` : undefined
        }
        aria-controls={visibleCommandOptions.length > 0 ? 'helm-command-popover' : undefined}
        aria-label="Message Helm"
        className="block max-h-[180px] min-h-8 w-full resize-none overflow-y-auto border-0 bg-transparent px-2 py-2 placeholder:text-[var(--helm-input-placeholder)]"
        onChange={(event) => {
          setDismissedCommandInput(undefined);
          onInputChange(event.target.value);
        }}
        onKeyDown={(event) => {
          if (visibleCommandOptions.length > 0) {
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              event.preventDefault();
              const delta = event.key === 'ArrowDown' ? 1 : -1;
              setActiveCommandIndex((current) =>
                moveCommandIndex(current, delta, visibleCommandOptions.length),
              );
              return;
            }
            if (event.key === 'Escape') {
              event.preventDefault();
              setDismissedCommandInput(input);
              return;
            }
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              const option = visibleCommandOptions[activeCommandIndex];
              if (option) chooseCommand(option);
              return;
            }
          }
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            if (canSubmit) onSubmit(primarySubmit);
          } else if (
            event.key === 'Tab' &&
            visibleCommandOptions.length === 0 &&
            running &&
            canSubmit
          ) {
            event.preventDefault();
            const action = resolveEnterAction(settings, running, 'Tab');
            if (action) onSubmit(action);
          }
        }}
        placeholder={
          settings.workflow === 'solo'
            ? 'Describe an outcome — Helm will plan first'
            : 'Ask Helm anything — @ for context, / for commands'
        }
        ref={textareaRef}
        rows={1}
        value={input}
      />
      <FileAttachments items={fileAttachments} onRemove={onRemoveFileAttachment} />
      <ComposerToolbar
        canSend={canSubmit}
        models={models}
        onAddContext={() => onInputChange(`${input}@`)}
        onAttachFiles={onAttachFiles}
        onModelChange={onModelChange}
        onModeChange={onModeChange}
        onSend={() => onSubmit(primarySubmit)}
        onStop={onStop}
        onToggleAutoContext={onToggleAutoContext}
        running={running}
        settings={settings}
      />
    </div>
  );
}
