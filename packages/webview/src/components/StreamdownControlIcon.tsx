import type { SVGProps } from 'react';

export function StreamdownControlIcon({
  className = '',
}: SVGProps<SVGSVGElement> & { size?: number }): React.JSX.Element {
  return (
    <i aria-hidden="true" className={`codicon codicon-copy text-[length:14px] ${className}`} />
  );
}
