import { cn } from '@/lib/utils';

import { expect, test } from 'vitest';

test('cn joins truthy classnames', () => {
  expect(cn('a', undefined, 'b')).toBe('a b');
});

test('cn merges tailwind conflicts', () => {
  expect(cn('p-2', 'p-4')).toBe('p-4');
});

