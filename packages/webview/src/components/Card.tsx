import { forwardRef, type HTMLAttributes } from 'react';

export type CardProps = HTMLAttributes<HTMLElement>;

export const Card = forwardRef<HTMLElement, CardProps>(function Card(
  { className = '', ...props },
  ref,
) {
  return (
    <section
      className={`min-w-0 rounded-[var(--helm-radius-control)] border border-[var(--helm-border)] bg-transparent p-2 text-[length:var(--helm-font-size-meta)] ${className}`}
      ref={ref}
      {...props}
    />
  );
});
