import type { SuggestedAction } from '@helm/core/browser';

import { Icon } from '../Icon';

export interface SuggestionRowProps {
  items: SuggestedAction[];
  onChoose: (item: SuggestedAction) => void;
}

export function SuggestionRow({ items, onChoose }: SuggestionRowProps): React.JSX.Element | null {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {items.slice(0, 3).map((item) => (
        <button
          className="flex items-center gap-1 rounded-[var(--helm-radius-control)] border border-[var(--helm-border)] bg-transparent px-2 py-1 text-[length:var(--helm-font-size-meta)] text-[var(--helm-description-foreground)] hover:bg-[var(--helm-list-hover)] hover:text-[var(--helm-panel-foreground)]"
          key={`${item.kind}:${item.label}`}
          onClick={() => onChoose(item)}
          type="button"
        >
          {item.kind !== 'prompt' && <Icon name="discard" />}
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
}
