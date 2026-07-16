import { filterSlashCommands } from '@helm/core/browser';

export interface CommandPopoverProps {
  contextItems: string[];
  input: string;
  onChooseMention: (name: string) => void;
  onChooseSlash: (name: string) => void;
}

export function CommandPopover({
  contextItems,
  input,
  onChooseMention,
  onChooseSlash,
}: CommandPopoverProps): React.JSX.Element | null {
  const slashMatches =
    input.startsWith('/') && !input.includes(' ') ? filterSlashCommands(input).slice(0, 7) : [];
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

  if (slashMatches.length === 0 && mentionMatches.length === 0) return null;
  return (
    <div className="absolute right-0 bottom-[calc(100%+4px)] left-0 z-20 max-h-[240px] overflow-auto rounded-[var(--helm-radius-container)] border border-[var(--helm-border)] bg-[var(--helm-widget-background)] p-1 shadow-[var(--helm-popover-shadow)]">
      {slashMatches.map((command) => (
        <button
          className="flex w-full min-w-0 items-start gap-2 rounded-[var(--helm-radius-control)] border-0 bg-transparent p-2 text-left hover:bg-[var(--helm-list-hover)]"
          key={command.name}
          onClick={() => onChooseSlash(command.name)}
          type="button"
        >
          <strong className="font-semibold">/{command.name}</strong>
          <span className="min-w-0 text-[length:var(--helm-font-size-meta)] text-[var(--helm-description-foreground)]">
            {command.description}
          </span>
        </button>
      ))}
      {mentionMatches.map((mention) => (
        <button
          className="flex w-full min-w-0 items-start gap-2 rounded-[var(--helm-radius-control)] border-0 bg-transparent p-2 text-left hover:bg-[var(--helm-list-hover)]"
          key={mention.name}
          onClick={() => onChooseMention(mention.name)}
          type="button"
        >
          <strong className="font-semibold">{mention.name}</strong>
          <span className="min-w-0 text-[length:var(--helm-font-size-meta)] text-[var(--helm-description-foreground)]">
            {mention.hint}
          </span>
        </button>
      ))}
    </div>
  );
}
