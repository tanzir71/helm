import { Card } from './Card';
import { Icon } from './Icon';

export interface WebCardProps {
  description: string;
  title: string;
}

export function WebCard({ description, title }: WebCardProps): React.JSX.Element {
  return (
    <Card>
      <div className="flex min-w-0 items-start gap-2">
        <Icon name="globe" />
        <div className="min-w-0">
          <div className="break-words">{title}</div>
          <div className="break-words text-[var(--helm-description-foreground)]">{description}</div>
        </div>
      </div>
    </Card>
  );
}
