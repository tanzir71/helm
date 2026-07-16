import { Icon } from './Icon';

export interface EmptyStateProps {
  hasApiKey: boolean;
  onOpenSettings: () => void;
  onSend: (text: string) => void;
  onUseOllama: () => void;
}

const starters = [
  'Explain this project',
  '/plan improve the current code',
  'Find important TODOs in this project',
];

export function EmptyState({
  hasApiKey,
  onOpenSettings,
  onSend,
  onUseOllama,
}: EmptyStateProps): React.JSX.Element {
  if (!hasApiKey) {
    return (
      <section className="mx-auto flex w-full max-w-[280px] flex-col items-stretch gap-3 px-4 py-5 text-center">
        <strong className="font-semibold">Helm</strong>
        <p className="m-0 text-[length:var(--helm-font-size-meta)] text-[var(--helm-description-foreground)]">
          Connect a model provider to start working in this project.
        </p>
        <button
          className="rounded-[var(--helm-radius-control)] border-0 bg-[var(--helm-button-background)] px-3 py-1.5 text-[var(--helm-button-foreground)] hover:bg-[var(--helm-button-hover)]"
          onClick={onOpenSettings}
          type="button"
        >
          Add an API key
        </button>
        <button
          className="rounded-[var(--helm-radius-control)] border border-[var(--helm-border)] bg-transparent px-3 py-1.5 hover:bg-[var(--helm-list-hover)]"
          onClick={onUseOllama}
          type="button"
        >
          Use Ollama (local)
        </button>
      </section>
    );
  }

  return (
    <section className="mx-auto flex w-full max-w-[280px] flex-col gap-2 px-4 py-5">
      <strong className="mb-1 font-semibold">What are we building?</strong>
      {starters.map((starter) => (
        <button
          className="flex min-w-0 items-center gap-2 rounded-[var(--helm-radius-control)] border-0 bg-transparent px-2 py-1.5 text-left text-[length:var(--helm-font-size-meta)] hover:bg-[var(--helm-list-hover)]"
          key={starter}
          onClick={() => onSend(starter)}
          type="button"
        >
          <Icon name="arrow-right" />
          <span className="min-w-0 break-words">{starter}</span>
        </button>
      ))}
    </section>
  );
}
