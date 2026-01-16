import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, test, vi } from 'vitest';

import { OrderList } from '@/components/member/OrderList';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

test('OrderList groups orders by period and shows item status', async () => {
  const fetchMock = vi.fn(async (url: string) => {
    if (url.startsWith('/api/orders?nickname=alice')) {
      return {
        ok: true,
        json: async () => ({
          orders: [
            {
              id: 'o1',
              periodName: '第1期',
              totalAmount: 12,
              items: [
                {
                  id: 'i1',
                  productTypeId: 'p1',
                  productName: '苹果',
                  unitPrice: 1,
                  quantity: 2,
                  subtotal: 2,
                  arrived: true,
                  shipped: false,
                },
              ],
            },
            {
              id: 'o2',
              periodName: '第2期',
              totalAmount: 8,
              items: [
                {
                  id: 'i2',
                  productTypeId: 'p2',
                  productName: '香蕉',
                  unitPrice: 1,
                  quantity: 1,
                  subtotal: 1,
                  arrived: false,
                  shipped: false,
                },
              ],
            },
          ],
        }),
      };
    }
    throw new Error(`Unexpected fetch: ${url}`);
  });
  vi.stubGlobal('fetch', fetchMock as any);

  render(<OrderList nickname="alice" />);

  expect(await screen.findByText('第1期')).toBeInTheDocument();
  expect(screen.getByText('第2期')).toBeInTheDocument();
  expect(screen.getByText('苹果')).toBeInTheDocument();
  expect(screen.getByText('香蕉')).toBeInTheDocument();
  expect(screen.getAllByText('已到货').length).toBeGreaterThan(0);
  expect(screen.getAllByText('未到货').length).toBeGreaterThan(0);
});

test('OrderList shows API error and retries', async () => {
  const fetchMock = vi.fn(async () => ({
    ok: false,
    json: async () => ({ error: 'Denied' }),
  }));
  vi.stubGlobal('fetch', fetchMock as any);

  const user = userEvent.setup();
  render(<OrderList nickname="alice" />);

  expect(await screen.findByText('加载失败')).toBeInTheDocument();
  expect(screen.getByText('Denied')).toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: '重试' }));
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
});

test('OrderList shows empty state', async () => {
  const fetchMock = vi.fn(async () => ({
    ok: true,
    json: async () => ({ orders: [] }),
  }));
  vi.stubGlobal('fetch', fetchMock as any);

  render(<OrderList nickname="alice" />);
  expect(await screen.findByText('暂无订单')).toBeInTheDocument();
});

test('OrderList shows shipped items', async () => {
  const fetchMock = vi.fn(async () => ({
    ok: true,
    json: async () => ({
      orders: [
        {
          id: 'o1',
          periodName: '第1期',
          totalAmount: 1,
          items: [
            {
              id: 'i1',
              productTypeId: 'p1',
              productName: '苹果',
              unitPrice: 1,
              quantity: 1,
              subtotal: 1,
              arrived: true,
              shipped: true,
            },
          ],
        },
      ],
    }),
  }));
  vi.stubGlobal('fetch', fetchMock as any);

  render(<OrderList nickname="alice" />);
  expect(await screen.findByText('第1期')).toBeInTheDocument();
  expect(screen.getAllByText('已排发').length).toBeGreaterThan(0);
});

test('OrderList reports network errors', async () => {
  const fetchMock = vi.fn(async () => {
    throw new Error('offline');
  });
  vi.stubGlobal('fetch', fetchMock as any);

  render(<OrderList nickname="alice" />);
  expect(await screen.findByText('加载失败')).toBeInTheDocument();
  expect(screen.getByText('offline')).toBeInTheDocument();
});
