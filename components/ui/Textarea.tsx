import * as React from 'react';

import { cn } from '@/lib/utils';

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      className={cn(
        [
          'flex min-h-28 w-full resize-y rounded-[1.25rem]',
          'border border-border bg-background px-4 py-3 text-sm shadow-sm',
          'transition-colors',
          'placeholder:text-muted-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
          'focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          'disabled:cursor-not-allowed disabled:opacity-50',
        ].join(' '),
        className,
      )}
      {...props}
    />
  );
});

Textarea.displayName = 'Textarea';

