import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, test, vi } from 'vitest';

import { ArrivalManager } from '@/components/admin/ArrivalManager';
import { ToastProvider } from '@/components/ui/Toast';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

test('ArrivalManager marks selected items as arrived', async () => {
  const fetchMock = vi.fn(async () => ({
    ok: true,
    json: async () => ({ updated: 1 }),
  }));
  vi.stubGlobal('fetch', fetchMock as any);

  const user = userEvent.setup();
  render(
    <ToastProvider>
      <ArrivalManager
        periodName="第 1 期"
        initialItems={[
          { id: 'a', name: 'A', unitPrice: 5, arrived: false, arrivedAt: null },
          { id: 'b', name: 'B', unitPrice: 2, arrived: false, arrivedAt: null },
        ]}
      />
    </ToastProvider>,
  );

  await user.click(screen.getByRole('checkbox', { name: 'Select A' }));
  await user.click(screen.getByRole('button', { name: '标记到货' }));

  await waitFor(() => expect(fetchMock).toHaveBeenCalled());
  const [, init] = fetchMock.mock.calls[0];
  expect(init.method).toBe('PATCH');

  const body = JSON.parse(init.body);
  expect(body).toEqual({ productTypeIds: ['a'], arrived: true });

  expect(screen.getAllByText('已到货').length).toBeGreaterThan(0);
});

test('ArrivalManager select-all toggles visible selections', async () => {
  const fetchMock = vi.fn(async () => ({
    ok: true,
    json: async () => ({ updated: 2 }),
  }));
  vi.stubGlobal('fetch', fetchMock as any);

  const user = userEvent.setup();
  render(
    <ToastProvider>
      <ArrivalManager
        periodName="第 1 期"
        initialItems={[
          { id: 'a', name: 'A', unitPrice: 5, arrived: false, arrivedAt: null },
          { id: 'b', name: 'B', unitPrice: 2, arrived: true, arrivedAt: null },
        ]}
      />
    </ToastProvider>,
  );

  await user.click(screen.getByRole('button', { name: '未到货' }));
  const selectAll = screen.getByRole('checkbox', { name: 'Select all' });

  await user.click(selectAll);
  expect(screen.getByRole('checkbox', { name: 'Select A' })).toBeChecked();

  await user.click(selectAll);
  expect(screen.getByRole('checkbox', { name: 'Select A' })).not.toBeChecked();
});

test('ArrivalManager shows error toast on failed update', async () => {
  const fetchMock = vi.fn(async () => ({
    ok: false,
    json: async () => ({ error: 'Nope' }),
  }));
  vi.stubGlobal('fetch', fetchMock as any);

  const user = userEvent.setup();
  render(
    <ToastProvider>
      <ArrivalManager
        periodName="第 1 期"
        initialItems={[{ id: 'a', name: 'A', unitPrice: 5, arrived: false, arrivedAt: null }]}
      />
    </ToastProvider>,
  );

  await user.click(screen.getByRole('checkbox', { name: 'Select A' }));
  await user.click(screen.getByRole('button', { name: '标记到货' }));

  expect(await screen.findByText('更新失败')).toBeInTheDocument();
  expect(screen.getByText('Nope')).toBeInTheDocument();
});

test('ArrivalManager cancels arrived status', async () => {
  const fetchMock = vi.fn(async () => ({
    ok: true,
    json: async () => ({ updated: 1 }),
  }));
  vi.stubGlobal('fetch', fetchMock as any);

  const user = userEvent.setup();
  render(
    <ToastProvider>
      <ArrivalManager
        periodName="第 1 期"
        initialItems={[
          { id: 'a', name: 'A', unitPrice: 5, arrived: false, arrivedAt: null },
          { id: 'b', name: 'B', unitPrice: 2, arrived: true, arrivedAt: '2026-01-01T00:00:00.000Z' },
        ]}
      />
    </ToastProvider>,
  );

  await user.click(screen.getByRole('button', { name: '已到货' }));
  await user.click(screen.getByRole('checkbox', { name: 'Select B' }));
  await user.click(screen.getByRole('button', { name: '取消到货' }));

  await waitFor(() => expect(fetchMock).toHaveBeenCalled());
  const [, init] = fetchMock.mock.calls[0];
  expect(JSON.parse(init.body)).toEqual({ productTypeIds: ['b'], arrived: false });

  expect(await screen.findByText('暂无数据')).toBeInTheDocument();
});

test('ArrivalManager reports network errors', async () => {
  const fetchMock = vi.fn(async () => {
    throw new Error('offline');
  });
  vi.stubGlobal('fetch', fetchMock as any);

  const user = userEvent.setup();
  render(
    <ToastProvider>
      <ArrivalManager
        periodName="第 1 期"
        initialItems={[{ id: 'a', name: 'A', unitPrice: 5, arrived: false, arrivedAt: null }]}
      />
    </ToastProvider>,
  );

  await user.click(screen.getByRole('checkbox', { name: 'Select A' }));
  await user.click(screen.getByRole('button', { name: '标记到货' }));

  expect(await screen.findByText('网络异常')).toBeInTheDocument();
  expect(screen.getByText('offline')).toBeInTheDocument();
});
