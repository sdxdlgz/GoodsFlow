import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, test, vi } from 'vitest';

import { TrackingStatus } from '@/components/member/TrackingStatus';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

test('TrackingStatus renders timeline and tracking number', async () => {
  const fetchMock = vi.fn(async (url: string) => {
    if (url.startsWith('/api/shipment/status?nickname=alice')) {
      return {
        ok: true,
        json: async () => ({
          records: [
            {
              requestId: 'r1',
              nickname: 'alice',
              periodName: '第1期',
              status: 'approved',
              createdAt: new Date('2026-01-01T00:00:00.000Z').toISOString(),
              trackingNumber: 'SF123',
              shipmentStatus: 'shipped',
              shippedAt: new Date('2026-01-02T00:00:00.000Z').toISOString(),
              items: [{ productName: '苹果', quantity: 2 }],
            },
          ],
        }),
      };
    }
    throw new Error(`Unexpected fetch: ${url}`);
  });
  vi.stubGlobal('fetch', fetchMock as any);

  render(<TrackingStatus nickname="alice" />);

  expect(await screen.findByText('SF123')).toBeInTheDocument();
  expect(screen.getByText('已发货')).toBeInTheDocument();
  expect(screen.getByText('已通过')).toBeInTheDocument();
});

test('TrackingStatus shows error and retries', async () => {
  const fetchMock = vi.fn(async () => ({
    ok: false,
    json: async () => ({ error: 'Denied' }),
  }));
  vi.stubGlobal('fetch', fetchMock as any);

  const user = userEvent.setup();
  render(<TrackingStatus nickname="alice" />);

  expect(await screen.findByText('加载失败')).toBeInTheDocument();
  expect(screen.getByText('Denied')).toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: '重试' }));
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
});

test('TrackingStatus shows empty state', async () => {
  const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ records: [] }) }));
  vi.stubGlobal('fetch', fetchMock as any);

  render(<TrackingStatus nickname="alice" />);
  expect(await screen.findByText('暂无记录')).toBeInTheDocument();
});

test('TrackingStatus renders pending records without tracking number', async () => {
  const fetchMock = vi.fn(async () => ({
    ok: true,
    json: async () => ({
      records: [
        {
          requestId: 'r1',
          nickname: 'alice',
          periodName: '第1期',
          status: 'pending',
          createdAt: new Date('2026-01-01T00:00:00.000Z').toISOString(),
          trackingNumber: null,
          shipmentStatus: null,
          shippedAt: null,
          items: [],
        },
      ],
    }),
  }));
  vi.stubGlobal('fetch', fetchMock as any);

  render(<TrackingStatus nickname="alice" />);
  expect(await screen.findByText('审核中')).toBeInTheDocument();
  expect(screen.getByText('团长审核后将录入单号')).toBeInTheDocument();
  expect(screen.getByText('团长审核中')).toBeInTheDocument();
});

test('TrackingStatus renders rejected records', async () => {
  const fetchMock = vi.fn(async () => ({
    ok: true,
    json: async () => ({
      records: [
        {
          requestId: 'r1',
          nickname: 'alice',
          periodName: '第1期',
          status: 'rejected',
          createdAt: new Date('2026-01-01T00:00:00.000Z').toISOString(),
          trackingNumber: null,
          shipmentStatus: null,
          shippedAt: null,
          items: [{ productName: '苹果', quantity: 1 }],
        },
      ],
    }),
  }));
  vi.stubGlobal('fetch', fetchMock as any);

  render(<TrackingStatus nickname="alice" />);
  expect((await screen.findAllByText('已拒绝')).length).toBeGreaterThan(0);
});

test('TrackingStatus renders approved records without shipping info', async () => {
  const fetchMock = vi.fn(async () => ({
    ok: true,
    json: async () => ({
      records: [
        {
          requestId: 'r1',
          nickname: 'alice',
          periodName: '第1期',
          status: 'approved',
          createdAt: new Date('2026-01-01T00:00:00.000Z').toISOString(),
          trackingNumber: null,
          shipmentStatus: null,
          shippedAt: null,
          items: [],
        },
      ],
    }),
  }));
  vi.stubGlobal('fetch', fetchMock as any);

  render(<TrackingStatus nickname="alice" />);
  expect(await screen.findByText('已通过')).toBeInTheDocument();
  expect(screen.getByText('等待发货')).toBeInTheDocument();
});
