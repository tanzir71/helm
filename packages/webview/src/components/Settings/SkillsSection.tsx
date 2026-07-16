import { Icon } from '../Icon';

export function SkillsSection(): React.JSX.Element {
  return (
    <section className="grid gap-1 border-b border-[var(--helm-border)] py-4">
      <h2 className="m-0 flex items-center gap-2 font-semibold">
        <Icon name="tools" /> Skills
      </h2>
      <p className="m-0 text-[length:var(--helm-font-size-meta)] text-[var(--helm-description-foreground)]">
        Built-in, global, and workspace skills will be managed here.
      </p>
    </section>
  );
}
