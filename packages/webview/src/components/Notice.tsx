import type { UiNotice } from '@/state/store';

import { Icon } from './Icon';

export interface NoticeProps {
  notice: UiNotice;
  onDismiss: () => void;
}

export function Notice({ notice, onDismiss }: NoticeProps): React.JSX.Element {
  return (
    <div
      className="mx-2 mt-2 flex min-w-0 items-start gap-2 rounded-[var(--helm-radius-control)] border border-[var(--helm-border)] p-2 text-[length:var(--helm-font-size-meta)]"
      role={notice.level === 'error' ? 'alert' : 'status'}
    >
      <Icon
        className={notice.level === 'error' ? 'text-[var(--helm-error)]' : ''}
        name={notice.level === 'error' ? 'error' : 'check'}
      />
      <span className="min-w-0 flex-1 break-words">{notice.message}</span>
      <button
        aria-label="Dismiss notice"
        className="flex size-5 items-center justify-center rounded-[var(--helm-radius-control)] border-0 bg-transparent p-0 hover:bg-[var(--helm-toolbar-hover)]"
        onClick={onDismiss}
        type="button"
      >
        <Icon name="close" />
      </button>
    </div>
  );
}
