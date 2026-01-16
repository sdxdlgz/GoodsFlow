import { describe, expect, it, vi } from 'vitest';

vi.mock('next/font/google', () => ({
  Fraunces: () => ({ variable: '--font-fraunces', className: 'fraunces' }),
  Nunito: () => ({ variable: '--font-nunito', className: 'nunito' }),
}));

describe('fonts', () => {
  it('exports font variables', async () => {
    const { fraunces, nunito } = await import('@/lib/fonts');
    expect(fraunces.variable).toBe('--font-fraunces');
    expect(nunito.variable).toBe('--font-nunito');
  });
});
