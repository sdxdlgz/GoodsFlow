import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';

import { Checkbox } from '@/components/ui/Checkbox';

test('Checkbox toggles checked state', async () => {
  const user = userEvent.setup();
  render(<Checkbox aria-label="Agree" />);

  const checkbox = screen.getByRole('checkbox', { name: 'Agree' });
  expect(checkbox).not.toBeChecked();

  await user.click(checkbox);
  expect(checkbox).toBeChecked();
});

test('Checkbox supports disabled', () => {
  render(<Checkbox aria-label="Disabled" disabled />);
  expect(screen.getByRole('checkbox', { name: 'Disabled' })).toBeDisabled();
});

