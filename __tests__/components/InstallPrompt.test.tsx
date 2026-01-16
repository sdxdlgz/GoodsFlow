import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, test, vi } from 'vitest';

import { InstallPrompt } from '@/components/InstallPrompt';

afterEach(() => {
  vi.restoreAllMocks();
});

test('InstallPrompt shows and triggers beforeinstallprompt flow', async () => {
  const user = userEvent.setup();
  render(<InstallPrompt />);

  const event = new Event('beforeinstallprompt', { cancelable: true }) as any;
  event.prompt = vi.fn(async () => {});
  event.userChoice = Promise.resolve({ outcome: 'accepted', platform: 'web' });

  act(() => {
    window.dispatchEvent(event);
  });

  const button = await screen.findByRole('button', { name: '安装' });
  await user.click(button);

  await waitFor(() => expect(event.prompt).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(screen.queryByRole('button', { name: '安装' })).not.toBeInTheDocument());
});

test('InstallPrompt stays hidden in standalone mode', async () => {
  const originalMatchMedia = window.matchMedia;
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: () => ({ matches: true, addEventListener: () => {}, removeEventListener: () => {} }),
  });

  render(<InstallPrompt />);
  const event = new Event('beforeinstallprompt', { cancelable: true }) as any;
  event.prompt = vi.fn(async () => {});
  event.userChoice = Promise.resolve({ outcome: 'accepted', platform: 'web' });
  act(() => {
    window.dispatchEvent(event);
  });

  expect(screen.queryByRole('button', { name: '安装' })).not.toBeInTheDocument();

  Object.defineProperty(window, 'matchMedia', { writable: true, value: originalMatchMedia });
});
