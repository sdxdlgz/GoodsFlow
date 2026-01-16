// @vitest-environment node
import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@prisma/client', () => {
  class PrismaClient {
    $connect = vi.fn();
    $disconnect = vi.fn();
  }
  return { PrismaClient };
});

describe('prisma singleton', () => {
  beforeEach(() => {
    vi.resetModules();
    delete (globalThis as any).prisma;
  });

  it('creates singleton instance', async () => {
    const { prisma } = await import('@/lib/prisma');
    expect(prisma).toBeDefined();
    expect(typeof prisma.$connect).toBe('function');
  });

  it('reuses instance in development', async () => {
    process.env.NODE_ENV = 'development';
    const first = await import('@/lib/prisma');
    vi.resetModules();
    const second = await import('@/lib/prisma');
    expect(first.prisma).toBe(second.prisma);
  });
});
