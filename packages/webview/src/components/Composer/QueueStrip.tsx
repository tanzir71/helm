import { Icon } from '../Icon';

export interface QueueStripProps {
  items: Array<{ id: string; text: string }>;
  onClear: () => void;
  onRemove: (id: string) => void;
  onReorder: (ids: string[]) => void;
  onSteer: (item: { id: string; text: string }) => void;
}

export function QueueStrip({
  items,
  onClear,
  onRemove,
  onReorder,
  onSteer,
}: QueueStripProps): React.JSX.Element | null {
  if (items.length === 0) return null;

  const move = (id: string, delta: -1 | 1) => {
    const ids = items.map((item) => item.id);
    const from = ids.indexOf(id);
    const to = Math.max(0, Math.min(ids.length - 1, from + delta));
    if (from === to) return;
    const [moving] = ids.splice(from, 1);
    if (moving) ids.splice(to, 0, moving);
    onReorder(ids);
  };

  return (
    <section className="animate-in fade-in slide-in-from-bottom-1 grid gap-1 duration-[var(--helm-duration-fast)]">
      <header className="flex items-center justify-between text-[length:var(--helm-font-size-meta)] text-[var(--helm-description-foreground)]">
        <span>Queued · {items.length}</span>
        <button
          className="border-0 bg-transparent p-0 hover:underline"
          onClick={onClear}
          type="button"
        >
          Clear
        </button>
      </header>
      <div className="flex min-w-0 gap-1 overflow-x-auto pb-1">
        {items.map((item) => (
          <div
            className="group flex min-w-[80px] max-w-[200px] shrink-0 items-center gap-1 rounded-[var(--helm-radius-control)] bg-[var(--helm-input-background)] px-1.5 py-1 text-[length:var(--helm-font-size-meta)]"
            key={item.id}
            onKeyDown={(event) => {
              if (!(event.metaKey || event.ctrlKey)) return;
              if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
                event.preventDefault();
                move(item.id, -1);
              } else if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
                event.preventDefault();
                move(item.id, 1);
              }
            }}
            tabIndex={0}
            title={item.text}
          >
            <span className="min-w-0 flex-1 truncate">{item.text}</span>
            <button
              aria-label={`Move ${item.text} earlier`}
              className="hidden size-5 items-center justify-center border-0 bg-transparent p-0 group-hover:flex group-focus-within:flex"
              onClick={() => move(item.id, -1)}
              type="button"
            >
              <Icon name="arrow-left" />
            </button>
            <button
              aria-label={`Move ${item.text} later`}
              className="hidden size-5 items-center justify-center border-0 bg-transparent p-0 group-hover:flex group-focus-within:flex"
              onClick={() => move(item.id, 1)}
              type="button"
            >
              <Icon name="arrow-right" />
            </button>
            <button
              aria-label={`Steer with ${item.text}`}
              className="hidden size-5 items-center justify-center border-0 bg-transparent p-0 group-hover:flex group-focus-within:flex"
              onClick={() => onSteer(item)}
              type="button"
            >
              <Icon name="zap" />
            </button>
            <button
              aria-label={`Remove ${item.text}`}
              className="hidden size-5 items-center justify-center border-0 bg-transparent p-0 group-hover:flex group-focus-within:flex"
              onClick={() => onRemove(item.id)}
              type="button"
            >
              <Icon name="close" />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
