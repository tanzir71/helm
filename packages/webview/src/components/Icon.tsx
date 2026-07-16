import type { HTMLAttributes } from 'react';

export type IconName =
  | 'add'
  | 'arrow-down'
  | 'arrow-left'
  | 'arrow-right'
  | 'check'
  | 'chevron-down'
  | 'chevron-right'
  | 'close'
  | 'copy'
  | 'discard'
  | 'error'
  | 'file'
  | 'files'
  | 'folder'
  | 'globe'
  | 'mention'
  | 'link-external'
  | 'play'
  | 'search'
  | 'send'
  | 'settings-gear'
  | 'sparkle'
  | 'stop-circle'
  | 'terminal'
  | 'tools'
  | 'type-hierarchy'
  | 'warning'
  | 'zap';

export interface IconProps extends Omit<HTMLAttributes<HTMLElement>, 'children'> {
  name: IconName;
  size?: 14 | 16;
}

export function Icon({ className = '', name, size = 14, ...props }: IconProps): React.JSX.Element {
  return (
    <i
      aria-hidden="true"
      className={`codicon codicon-${name} shrink-0 ${size === 16 ? 'text-[length:16px]' : 'text-[length:14px]'} ${className}`}
      {...props}
    />
  );
}
