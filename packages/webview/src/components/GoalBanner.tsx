import { Icon } from './Icon';

export interface GoalBannerProps {
  goal: string;
}

export function GoalBanner({ goal }: GoalBannerProps): React.JSX.Element {
  return (
    <div className="mx-2 mt-2 flex min-w-0 items-center gap-2 rounded-[var(--helm-radius-control)] bg-[var(--helm-input-background)] px-2 py-1 text-[length:var(--helm-font-size-meta)] text-[var(--helm-description-foreground)]">
      <Icon name="sparkle" />
      <span className="min-w-0 truncate" title={goal}>
        {goal}
      </span>
    </div>
  );
}
