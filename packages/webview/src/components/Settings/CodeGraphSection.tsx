import { Icon } from '../Icon';

export function CodeGraphSection(): React.JSX.Element {
  return (
    <section className="grid gap-1 py-4">
      <h2 className="m-0 flex items-center gap-2 font-semibold">
        <Icon name="type-hierarchy" /> Code graph
      </h2>
      <p className="m-0 text-[length:var(--helm-font-size-meta)] text-[var(--helm-description-foreground)]">
        Index status and lifecycle controls will appear here after workspace consent.
      </p>
    </section>
  );
}
