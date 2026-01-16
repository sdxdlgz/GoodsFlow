'use client';

import * as React from 'react';
import { useTheme } from 'next-themes';

import { Button } from '@/components/ui/Button';

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  const theme = resolvedTheme ?? 'light';
  const nextTheme = theme === 'dark' ? 'light' : 'dark';

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label="Toggle theme"
      onClick={() => setTheme(nextTheme)}
      disabled={!mounted}
    >
      <span aria-hidden className="text-lg leading-none">
        {theme === 'dark' ? '☾' : '☀︎'}
      </span>
    </Button>
  );
}

