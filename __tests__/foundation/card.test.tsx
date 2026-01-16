import { render, screen } from '@testing-library/react';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';

import { expect, test } from 'vitest';

test('Card composes sections', () => {
  render(
    <Card>
      <CardHeader>
        <CardTitle>Title</CardTitle>
        <CardDescription>Description</CardDescription>
      </CardHeader>
      <CardContent>Body</CardContent>
      <CardFooter>Footer</CardFooter>
    </Card>,
  );

  expect(screen.getByRole('heading', { name: 'Title' })).toBeInTheDocument();
  expect(screen.getByText('Description')).toBeInTheDocument();
  expect(screen.getByText('Body')).toBeInTheDocument();
  expect(screen.getByText('Footer')).toBeInTheDocument();
});

test('Card forwards className', () => {
  render(<Card data-testid="card" className="my-card" />);
  expect(screen.getByTestId('card')).toHaveClass('my-card');
});

