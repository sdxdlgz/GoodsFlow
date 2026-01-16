import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, test, vi } from 'vitest';

const pushMock = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

import { NicknameSearch } from '@/components/member/NicknameSearch';

afterEach(() => {
  pushMock.mockReset();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

test('NicknameSearch debounces requests (300ms)', async () => {
  vi.useFakeTimers();

  const fetchMock = vi.fn(async () => ({
    ok: true,
    json: async () => ({
      orders: [
        {
          id: 'o1',
          periodName: '第1期',
          totalAmount: 10,
          items: [
            { id: 'i1', productTypeId: 'p1', productName: 'A', unitPrice: 1, quantity: 2, subtotal: 2, arrived: true, shipped: false },
          ],
        },
      ],
    }),
  }));
  vi.stubGlobal('fetch', fetchMock as any);

  render(<NicknameSearch />);

  const input = screen.getByRole('textbox');
  fireEvent.change(input, { target: { value: 'a' } });
  fireEvent.change(input, { target: { value: 'al' } });
  fireEvent.change(input, { target: { value: 'ali' } });
  fireEvent.change(input, { target: { value: 'alic' } });
  fireEvent.change(input, { target: { value: 'alice' } });
  expect(fetchMock).toHaveBeenCalledTimes(0);

  await act(async () => {
    await vi.advanceTimersByTimeAsync(299);
  });
  expect(fetchMock).toHaveBeenCalledTimes(0);

  await act(async () => {
    await vi.advanceTimersByTimeAsync(1);
  });
  expect(fetchMock).toHaveBeenCalledTimes(1);

  expect((fetchMock.mock.calls[0] as unknown as [string, RequestInit] | undefined)?.[0]).toContain('/api/orders?nickname=alice');
});

test('NicknameSearch navigates to orders', async () => {
  const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ orders: [] }) }));
  vi.stubGlobal('fetch', fetchMock as any);

  const user = userEvent.setup();
  render(<NicknameSearch />);

  await user.type(screen.getByRole('textbox'), 'alice');
  await user.click(screen.getByRole('button', { name: '快速查询' }));

  expect(pushMock).toHaveBeenCalledWith('/orders?nickname=alice');
});

test('NicknameSearch blocks navigation when nickname is empty', async () => {
  const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ orders: [] }) }));
  vi.stubGlobal('fetch', fetchMock as any);

  const user = userEvent.setup();
  render(<NicknameSearch />);

  await user.click(screen.getByRole('button', { name: '快速查询' }));
  expect(pushMock).not.toHaveBeenCalled();
  expect(screen.getByText('请输入昵称')).toBeInTheDocument();
});

test('NicknameSearch shows API error messages', async () => {
  vi.useFakeTimers();

  const fetchMock = vi.fn(async () => ({ ok: false, json: async () => ({ error: 'No access' }) }));
  vi.stubGlobal('fetch', fetchMock as any);

  render(<NicknameSearch />);
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'alice' } });

  await act(async () => {
    await vi.advanceTimersByTimeAsync(300);
  });

  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(screen.getByText('No access')).toBeInTheDocument();
});

test('NicknameSearch can hide action buttons', async () => {
  const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ orders: [] }) }));
  vi.stubGlobal('fetch', fetchMock as any);

  render(<NicknameSearch showActions={false} />);
  expect(screen.queryByRole('button', { name: '查看订单' })).not.toBeInTheDocument();
});

test('NicknameSearch summarizes pending items and coerces quantities', async () => {
  vi.useFakeTimers();

  const fetchMock = vi.fn(async () => ({
    ok: true,
    json: async () => ({
      orders: [
        {
          id: 'o1',
          periodName: '第1期',
          totalAmount: 10,
          items: [
            {
              id: 'i1',
              productTypeId: 'p1',
              productName: 'A',
              unitPrice: 1,
              quantity: '2',
              subtotal: 2,
              arrived: false,
              shipped: false,
            },
          ],
        },
      ],
    }),
  }));
  vi.stubGlobal('fetch', fetchMock as any);

  render(<NicknameSearch />);
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'alice' } });

  await act(async () => {
    await vi.advanceTimersByTimeAsync(300);
  });

  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(screen.getByText(/未到货 2 件/)).toBeInTheDocument();
});

test('NicknameSearch uses default error message when missing error field', async () => {
  vi.useFakeTimers();

  const fetchMock = vi.fn(async () => ({ ok: false, json: async () => ({}) }));
  vi.stubGlobal('fetch', fetchMock as any);

  render(<NicknameSearch />);
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'alice' } });

  await act(async () => {
    await vi.advanceTimersByTimeAsync(300);
  });

  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(screen.getByText('查询失败，请稍后重试')).toBeInTheDocument();
});

test('NicknameSearch reports network errors', async () => {
  vi.useFakeTimers();

  const fetchMock = vi.fn(async () => {
    throw new Error('offline');
  });
  vi.stubGlobal('fetch', fetchMock as any);

  render(<NicknameSearch />);
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'alice' } });

  await act(async () => {
    await vi.advanceTimersByTimeAsync(300);
  });

  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(screen.getByText('offline')).toBeInTheDocument();
});

test('NicknameSearch shows loading state for in-flight requests', async () => {
  vi.useFakeTimers();

  let resolveFetch: ((value: any) => void) | null = null;
  const fetchPromise = new Promise((resolve) => {
    resolveFetch = resolve;
  });

  const fetchMock = vi.fn(async () => fetchPromise);
  vi.stubGlobal('fetch', fetchMock as any);

  render(<NicknameSearch />);
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'alice' } });

  await act(async () => {
    await vi.advanceTimersByTimeAsync(300);
  });

  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(screen.getByText('查询中…')).toBeInTheDocument();

  resolveFetch!({ ok: true, json: async () => ({ orders: [] }) });
  await act(async () => {
    await Promise.resolve();
  });
});

test('NicknameSearch handles non-array orders payloads', async () => {
  vi.useFakeTimers();

  const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ orders: {} }) }));
  vi.stubGlobal('fetch', fetchMock as any);

  render(<NicknameSearch />);
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'alice' } });

  await act(async () => {
    await vi.advanceTimersByTimeAsync(300);
  });

  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(screen.getByText('未找到该昵称的订单')).toBeInTheDocument();
});

test('NicknameSearch ignores invalid item quantities', async () => {
  vi.useFakeTimers();

  const fetchMock = vi.fn(async () => ({
    ok: true,
    json: async () => ({
      orders: [
        {
          id: 'o1',
          periodName: '第1期',
          totalAmount: 10,
          items: [{ id: 'i1', productTypeId: 'p1', productName: 'A', unitPrice: 1, subtotal: 0, arrived: true, shipped: false }],
        },
      ],
    }),
  }));
  vi.stubGlobal('fetch', fetchMock as any);

  render(<NicknameSearch />);
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'alice' } });

  await act(async () => {
    await vi.advanceTimersByTimeAsync(300);
  });

  expect(screen.getByText(/1 期订单/)).toBeInTheDocument();
  expect(screen.getByText(/已到货 0 件/)).toBeInTheDocument();
});

test('NicknameSearch uses generic message for non-Error throws', async () => {
  vi.useFakeTimers();

  const fetchMock = vi.fn(async () => {
    throw 'offline';
  });
  vi.stubGlobal('fetch', fetchMock as any);

  render(<NicknameSearch />);
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'alice' } });

  await act(async () => {
    await vi.advanceTimersByTimeAsync(300);
  });

  expect(screen.getByText('网络异常')).toBeInTheDocument();
});

test('NicknameSearch ignores stale responses', async () => {
  vi.useFakeTimers();

  const resolvers: Array<(value: any) => void> = [];
  const fetchMock = vi.fn(async () => {
    return await new Promise((resolve) => resolvers.push(resolve));
  });
  vi.stubGlobal('fetch', fetchMock as any);

  render(<NicknameSearch />);
  const input = screen.getByRole('textbox');

  fireEvent.change(input, { target: { value: 'alice' } });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(300);
  });
  expect(fetchMock).toHaveBeenCalledTimes(1);

  fireEvent.change(input, { target: { value: 'bob' } });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(300);
  });
  expect(fetchMock).toHaveBeenCalledTimes(2);

  resolvers[0]?.({ ok: true, json: async () => ({ orders: [{ id: 'o1', periodName: '第1期', totalAmount: 1, items: [] }] }) });
  resolvers[1]?.({ ok: true, json: async () => ({ orders: [] }) });

  await act(async () => {
    await Promise.resolve();
  });

  expect(screen.getByText(/0 期订单/)).toBeInTheDocument();
  expect(screen.queryByText(/1 期订单/)).not.toBeInTheDocument();
});
