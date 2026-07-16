import { Icon } from '../Icon';

export interface ModelPillProps {
  effort: string;
  modelId: string;
  onOpen: () => void;
}

export function ModelPill({ effort, modelId, onOpen }: ModelPillProps): React.JSX.Element {
  const shortModel = modelId.includes('/') ? (modelId.split('/').at(-1) ?? modelId) : modelId;
  return (
    <button
      className="flex max-w-[160px] items-center gap-1 rounded-[var(--helm-radius-control)] border-0 bg-transparent px-1.5 py-1 text-[length:var(--helm-font-size-meta)] text-[var(--helm-description-foreground)] hover:bg-[var(--helm-toolbar-hover)] hover:text-[var(--helm-panel-foreground)]"
      onClick={onOpen}
      title={`${modelId} · ${effort}`}
      type="button"
    >
      <span className="min-w-0 truncate">{shortModel}</span>
      <span>· {effort}</span>
      <Icon name="chevron-down" />
    </button>
  );
}
