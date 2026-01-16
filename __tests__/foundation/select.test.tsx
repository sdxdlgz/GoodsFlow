import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';

import { Select } from '@/components/ui/Select';

test('Select supports placeholder option', () => {
  const { container } = render(
    <Select placeholder="Pick one">
      <option value="a">A</option>
    </Select>,
  );

  expect(screen.getByText('Pick one')).toBeInTheDocument();
  const select = screen.getByRole('combobox');
  expect(select).toHaveValue('');
  const placeholder = container.querySelector('option[value=""]') as HTMLOptionElement | null;
  expect(placeholder).not.toBeNull();
  expect(placeholder?.disabled).toBe(true);
});

