import * as React from 'react';

import { cn } from '@/lib/utils';

export type CheckboxProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'>;

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, ...props }, ref) => {
    return (
      <span className={cn('relative inline-flex h-5 w-5 items-center justify-center', className)}>
        <input
          ref={ref}
          type="checkbox"
          className={cn(
            [
              'peer h-5 w-5 appearance-none',
              'rounded-[0.75rem] border border-border bg-background shadow-sm',
              'transition-colors',
              'checked:border-primary checked:bg-primary',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              'focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              'disabled:cursor-not-allowed disabled:opacity-50',
            ].join(' '),
          )}
          {...props}
        />
        <svg
          aria-hidden
          viewBox="0 0 16 16"
          className="pointer-events-none absolute h-3 w-3 text-primary-foreground opacity-0 transition-opacity peer-checked:opacity-100"
        >
          <path
            fill="currentColor"
            d="M6.196 10.808 3.404 8.016 4.52 6.9l1.676 1.676 5.283-5.284 1.117 1.117-6.4 6.4Z"
          />
        </svg>
      </span>
    );
  },
);

Checkbox.displayName = 'Checkbox';

