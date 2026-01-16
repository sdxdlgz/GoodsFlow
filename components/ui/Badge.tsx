import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  [
    'inline-flex items-center justify-center',
    'whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium',
    'transition-colors',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
    'focus-visible:ring-offset-2 focus-visible:ring-offset-background',
  ].join(' '),
  {
    variants: {
      variant: {
        default: 'border-border bg-background/60 text-muted-foreground',
        primary: 'border-primary/30 bg-primary/10 text-foreground',
        secondary: 'border-secondary/30 bg-secondary/10 text-foreground',
        outline: 'border-border bg-background/70 text-foreground',
        destructive: 'border-destructive/40 bg-destructive/10 text-foreground',
      },
      size: {
        sm: 'px-2.5 py-1 text-[0.7rem]',
        md: 'px-3 py-1 text-xs',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  },
);

export type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>;

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, size, ...props }, ref) => (
    <span ref={ref} className={cn(badgeVariants({ variant, size }), className)} {...props} />
  ),
);

Badge.displayName = 'Badge';

export { badgeVariants };

