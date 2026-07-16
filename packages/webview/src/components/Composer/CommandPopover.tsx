import { filterSlashCommands } from '@helm/core/browser';
import type { ReactNode } from 'react';

export interface CommandOption {
  description: string;
  id: string;
  kind: 'slash' | 'mention';
  label: string;
  value: string;
}

export interface CommandPopoverProps {
  activeIndex: number;
  input: string;
  onChoose: (option: CommandOption) => void;
  options: CommandOption[];
}

export function getCommandOptions(input: string, contextItems: string[]): CommandOption[] {
  if (input.startsWith('/') && !input.includes(' ')) {
    return filterSlashCommands(input)
      .slice(0, 7)
      .map((command) => ({
        description: command.description,
        id: `slash-${command.name}`,
        kind: 'slash',
        label: `/${command.name}`,
        value: command.name,
      }));
  }
  const mentionMatches = /@(?:file|folder):[^\s]*$/u.test(input)
    ? contextItems.map((name) => ({ name, hint: 'Workspace match' }))
    : input.endsWith('@') || /@(f|fo|p|t)$/u.test(input)
      ? [
          { name: '@file:', hint: 'Attach a workspace file' },
          { name: '@folder:', hint: 'Attach a folder listing' },
          { name: '@problems', hint: 'Attach VS Code diagnostics' },
          { name: '@terminal', hint: 'Attach the last command output' },
        ]
      : [];
  return mentionMatches.map((mention) => ({
    description: mention.hint,
    id: `mention-${mention.name}`,
    kind: 'mention',
    label: mention.name,
    value: mention.name,
  }));
}

export function moveCommandIndex(current: number, delta: number, optionCount: number): number {
  if (optionCount === 0) return 0;
  return (current + delta + optionCount) % optionCount;
}

function highlightedLabel(label: string, input: string): ReactNode {
  const query = input.startsWith('/')
    ? input.slice(1)
    : (/@([^\s]*)$/u.exec(input)?.[1] ?? '').replace(/^(?:file|folder):/u, '');
  if (!query) return label;
  const index = label.toLowerCase().indexOf(query.toLowerCase());
  if (index === -1) return label;
  return (
    <>
      {label.slice(0, index)}
      <mark className="bg-[var(--helm-list-active)] text-[var(--helm-list-active-foreground)]">
        {label.slice(index, index + query.length)}
      </mark>
      {label.slice(index + query.length)}
    </>
  );
}

export function CommandPopover({
  activeIndex,
  input,
  onChoose,
  options,
}: CommandPopoverProps): React.JSX.Element | null {
  if (options.length === 0) return null;
  return (
    <div
      className="absolute right-0 bottom-[calc(100%+4px)] left-0 z-20 max-h-[240px] overflow-auto rounded-[var(--helm-radius-container)] border border-[var(--helm-border)] bg-[var(--helm-widget-background)] p-1 shadow-[var(--helm-popover-shadow)]"
      id="helm-command-popover"
      role="listbox"
    >
      {options.map((option, index) => (
        <button
          aria-selected={index === activeIndex}
          className={`flex w-full min-w-0 items-start gap-2 rounded-[var(--helm-radius-control)] border-0 p-2 text-left hover:bg-[var(--helm-list-hover)] ${index === activeIndex ? 'bg-[var(--helm-list-active)] text-[var(--helm-list-active-foreground)]' : 'bg-transparent'}`}
          id={`helm-command-option-${index}`}
          key={option.id}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onChoose(option)}
          role="option"
          tabIndex={-1}
          type="button"
        >
          <strong className="font-semibold">{highlightedLabel(option.label, input)}</strong>
          <span
            className={`min-w-0 text-[length:var(--helm-font-size-meta)] ${index === activeIndex ? '' : 'text-[var(--helm-description-foreground)]'}`}
          >
            {option.description}
          </span>
        </button>
      ))}
    </div>
  );
}
