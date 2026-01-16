import { render, screen } from '@testing-library/react';

import { Input } from '@/components/ui/Input';

import { expect, test } from 'vitest';

test('Input renders and forwards attributes', () => {
  render(<Input type="email" placeholder="you@example.com" />);
  expect(screen.getByPlaceholderText('you@example.com')).toHaveAttribute('type', 'email');
});

test('Input accepts className', () => {
  render(<Input aria-label="email" className="mt-2" />);
  expect(screen.getByLabelText('email')).toHaveClass('mt-2');
});

