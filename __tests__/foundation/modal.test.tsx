import * as React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';

import { Modal } from '@/components/ui/Modal';

function ModalHarness() {
  const [open, setOpen] = React.useState(true);
  return (
    <Modal open={open} onOpenChange={setOpen} title="Dialog title" description="Dialog desc">
      <p>Dialog body</p>
    </Modal>
  );
}

test('Modal renders and closes via close button', async () => {
  const user = userEvent.setup();
  render(<ModalHarness />);

  expect(screen.getByRole('dialog', { name: 'Dialog title' })).toBeInTheDocument();
  expect(document.body.style.overflow).toBe('hidden');

  await user.click(screen.getByRole('button', { name: /close dialog/i }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(document.body.style.overflow).toBe('');
});

test('Modal closes via Escape key', async () => {
  render(<ModalHarness />);
  expect(screen.getByRole('dialog')).toBeInTheDocument();

  await userEvent.keyboard('{Escape}');
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
});

test('Modal closes via overlay click', async () => {
  const user = userEvent.setup();
  const { container } = render(<ModalHarness />);

  const overlay = container.querySelector('[aria-hidden="true"]');
  expect(overlay).toBeTruthy();

  await user.click(overlay as Element);
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
});

test('Modal supports footer and optional title/description', () => {
  render(
    <Modal open onOpenChange={() => {}} footer={<button type="button">OK</button>}>
      <p>Body</p>
    </Modal>,
  );

  expect(screen.getByRole('dialog')).toBeInTheDocument();
  expect(screen.getByText('Body')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'OK' })).toBeInTheDocument();
  expect(screen.queryByRole('heading')).not.toBeInTheDocument();
});

test('Modal returns null when closed', () => {
  render(
    <Modal open={false} onOpenChange={() => {}} title="Hidden">
      <p>Body</p>
    </Modal>,
  );

  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
