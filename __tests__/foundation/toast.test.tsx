import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';

import { ToastProvider, useToast } from '@/components/ui/Toast';

function Trigger() {
  const { toast } = useToast();
  return (
    <div>
      <button
        type="button"
        onClick={() => toast({ title: 'Saved', message: 'All set', variant: 'success', durationMs: 1000 })}
      >
        Show
      </button>
      <button type="button" onClick={() => toast({ message: 'Boom', variant: 'error', durationMs: 1000 })}>
        Error
      </button>
    </div>
  );
}

afterEach(() => {
  vi.useRealTimers();
});

test('ToastProvider shows and dismisses toasts', async () => {
  vi.useFakeTimers();

  render(
    <ToastProvider>
      <Trigger />
    </ToastProvider>,
  );

  fireEvent.click(screen.getByRole('button', { name: 'Show' }));
  expect(screen.getByRole('status')).toBeInTheDocument();
  expect(screen.getByText('Saved')).toBeInTheDocument();
  expect(screen.getByText('All set')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /dismiss notification/i }));
  expect(screen.queryByText('All set')).not.toBeInTheDocument();
});

test('ToastProvider auto-removes toasts', async () => {
  vi.useFakeTimers();

  render(
    <ToastProvider>
      <Trigger />
    </ToastProvider>,
  );

  fireEvent.click(screen.getByRole('button', { name: 'Error' }));
  expect(screen.getByRole('alert')).toBeInTheDocument();
  expect(screen.getByText('Boom')).toBeInTheDocument();

  await act(async () => {
    await vi.advanceTimersByTimeAsync(1000);
  });
  expect(screen.queryByText('Boom')).not.toBeInTheDocument();
});
