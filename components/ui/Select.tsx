'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  wrapperClassName?: string;
  placeholder?: string;
};

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, wrapperClassName, children, placeholder, defaultValue, ...props }, ref) => {
    const resolvedDefaultValue =
      placeholder && defaultValue === undefined && props.value === undefined ? '' : defaultValue;

    return (
      <div className={cn('relative', wrapperClassName)}>
        <select
          ref={ref}
          defaultValue={resolvedDefaultValue}
          className={cn(
            [
              'flex h-11 w-full appearance-none rounded-[1.25rem]',
              'border border-border bg-background px-4 py-2 pr-10 text-sm shadow-sm',
              'transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              'focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              'disabled:cursor-not-allowed disabled:opacity-50',
            ].join(' '),
            className,
          )}
          {...props}
        >
          {placeholder ? (
            <option value="" disabled hidden>
              {placeholder}
            </option>
          ) : null}
          {children}
        </select>
        <span
          aria-hidden
          className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-muted-foreground"
        >
          ▾
        </span>
      </div>
    );
  },
);

Select.displayName = 'Select';

