import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

let currentTheme: string | undefined = 'light';
const setTheme = vi.fn((theme) => {
  currentTheme = theme;
});

vi.mock('next-themes', () => ({
  useTheme: () => ({
    resolvedTheme: currentTheme,
    setTheme,
  }),
}));

import { ThemeToggle } from '@/components/ui/ThemeToggle';

describe('ThemeToggle', () => {
  beforeEach(() => {
    currentTheme = 'light';
    setTheme.mockClear();
  });

  it('toggles from light to dark', async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);

    const button = screen.getByRole('button', { name: /toggle theme/i });
    await waitFor(() => expect(button).not.toBeDisabled());

    await user.click(button);
    expect(setTheme).toHaveBeenCalledWith('dark');
  });

  it('toggles from dark to light', async () => {
    currentTheme = 'dark';
    const user = userEvent.setup();
    render(<ThemeToggle />);

    const button = screen.getByRole('button', { name: /toggle theme/i });
    await waitFor(() => expect(button).not.toBeDisabled());

    await user.click(button);
    expect(setTheme).toHaveBeenCalledWith('light');
  });

  it('defaults to light when resolvedTheme is undefined', async () => {
    currentTheme = undefined;
    const user = userEvent.setup();
    render(<ThemeToggle />);

    const button = screen.getByRole('button', { name: /toggle theme/i });
    await waitFor(() => expect(button).not.toBeDisabled());

    await user.click(button);
    expect(setTheme).toHaveBeenCalledWith('dark');
  });
});
