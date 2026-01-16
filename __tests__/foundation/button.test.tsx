import { render, screen } from '@testing-library/react';

import { Button } from '@/components/ui/Button';

import { expect, test } from 'vitest';

test('Button renders children', () => {
  render(<Button>Click</Button>);
  expect(screen.getByRole('button', { name: 'Click' })).toBeInTheDocument();
});

test('Button supports variants', () => {
  render(<Button variant="secondary">Go</Button>);
  const button = screen.getByRole('button', { name: 'Go' });
  expect(button.className).toContain('bg-secondary');
});

test('Button supports disabled', () => {
  render(<Button disabled>Go</Button>);
  expect(screen.getByRole('button', { name: 'Go' })).toBeDisabled();
});

