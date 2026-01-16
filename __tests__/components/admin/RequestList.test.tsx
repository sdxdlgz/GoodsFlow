import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, test, vi } from 'vitest';

import { RequestList } from '@/components/admin/RequestList';
import { ToastProvider } from '@/components/ui/Toast';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

test('RequestList loads requests and approves with tracking number', async () => {
  const fetchMock = vi.fn(async (url: string, init?: any) => {
    if (url === '/api/admin/requests') {
      return {
        ok: true,
        json: async () => ({
          requests: [
            {
              id: 'r1',
              nickname: 'alice',
              address: 'Somewhere',
              items: [{ productName: 'A', quantity: 1 }],
              paymentProof: 'https://example.com/pay.png',
              shippingProof: 'https://example.com/ship.png',
              status: 'pending',
              createdAt: new Date('2026-01-01T00:00:00.000Z').toISOString(),
              trackingNumber: null,
            },
          ],
        }),
      };
    }

    if (url === '/api/admin/approve' && init?.method === 'POST') {
      return {
        ok: true,
        json: async () => ({ shipmentId: 's1' }),
      };
    }

    throw new Error(`Unexpected fetch: ${url}`);
  });

  vi.stubGlobal('fetch', fetchMock as any);

  const user = userEvent.setup();
  render(
    <ToastProvider>
      <RequestList />
    </ToastProvider>,
  );

  expect(await screen.findByText('昵称：alice')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: '查看付款截图' }));
  expect(screen.getByRole('dialog')).toBeInTheDocument();
  await user.keyboard('{Escape}');
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

  await user.type(screen.getByLabelText(/tracking number for alice/i), 'SF123');
  await user.click(screen.getByRole('button', { name: '批准' }));

  await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/admin/approve', expect.anything()));
  expect(screen.getAllByText('已批准').length).toBeGreaterThan(0);
  expect(screen.getByText(/单号：/)).toBeInTheDocument();
});

test('RequestList blocks approve without tracking number', async () => {
  const fetchMock = vi.fn(async (url: string) => {
    if (url === '/api/admin/requests') {
      return {
        ok: true,
        json: async () => ({
          requests: [
            {
              id: 'r1',
              nickname: 'alice',
              address: 'Somewhere',
              items: [{ productName: 'A', quantity: 1 }],
              paymentProof: '',
              shippingProof: '',
              status: 'pending',
              createdAt: new Date('2026-01-01T00:00:00.000Z').toISOString(),
              trackingNumber: null,
            },
          ],
        }),
      };
    }
    throw new Error(`Unexpected fetch: ${url}`);
  });
  vi.stubGlobal('fetch', fetchMock as any);

  const user = userEvent.setup();
  render(
    <ToastProvider>
      <RequestList />
    </ToastProvider>,
  );

  expect(await screen.findByText('昵称：alice')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: '批准' }));
  expect(screen.getByText('缺少单号')).toBeInTheDocument();
});

test('RequestList rejects pending requests', async () => {
  const fetchMock = vi.fn(async (url: string, init?: any) => {
    if (url === '/api/admin/requests') {
      return {
        ok: true,
        json: async () => ({
          requests: [
            {
              id: 'r1',
              nickname: 'alice',
              address: 'Somewhere',
              items: [{ productName: 'A', quantity: 1 }],
              paymentProof: '',
              shippingProof: '',
              status: 'pending',
              createdAt: new Date('2026-01-01T00:00:00.000Z').toISOString(),
              trackingNumber: null,
            },
          ],
        }),
      };
    }

    if (url === '/api/admin/approve' && init?.method === 'POST') {
      return { ok: true, json: async () => ({}) };
    }

    throw new Error(`Unexpected fetch: ${url}`);
  });

  vi.stubGlobal('fetch', fetchMock as any);

  const user = userEvent.setup();
  render(
    <ToastProvider>
      <RequestList />
    </ToastProvider>,
  );

  expect(await screen.findByText('昵称：alice')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: '拒绝' }));

  await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/admin/approve', expect.anything()));
  expect(screen.getAllByText('已拒绝').length).toBeGreaterThan(0);
});

test('RequestList shows load error state', async () => {
  const fetchMock = vi.fn(async () => ({
    ok: false,
    json: async () => ({ error: 'No access' }),
  }));
  vi.stubGlobal('fetch', fetchMock as any);

  render(
    <ToastProvider>
      <RequestList />
    </ToastProvider>,
  );

  expect(await screen.findByRole('heading', { name: '加载失败' })).toBeInTheDocument();
  expect(screen.getAllByText('No access').length).toBeGreaterThan(0);
});

test('RequestList uses initialRequests and refresh loads data', async () => {
  const fetchMock = vi.fn(async () => ({
    ok: true,
    json: async () => ({ requests: [] }),
  }));
  vi.stubGlobal('fetch', fetchMock as any);

  const user = userEvent.setup();
  render(
    <ToastProvider>
      <RequestList initialRequests={[]} />
    </ToastProvider>,
  );

  expect(screen.getByText('暂无排发申请')).toBeInTheDocument();
  expect(fetchMock).not.toHaveBeenCalled();

  await user.click(screen.getByRole('button', { name: '刷新' }));
  await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/admin/requests', expect.anything()));
  expect(screen.getByText('暂无排发申请')).toBeInTheDocument();
});

test('RequestList shows approve API errors', async () => {
  const fetchMock = vi.fn(async (url: string, init?: any) => {
    if (url === '/api/admin/requests') {
      return {
        ok: true,
        json: async () => ({
          requests: [
            {
              id: 'r1',
              nickname: 'alice',
              address: 'Somewhere',
              items: [{ productName: 'A', quantity: 1 }],
              paymentProof: '',
              shippingProof: '',
              status: 'pending',
              createdAt: new Date('2026-01-01T00:00:00.000Z').toISOString(),
              trackingNumber: null,
            },
          ],
        }),
      };
    }

    if (url === '/api/admin/approve' && init?.method === 'POST') {
      return { ok: false, json: async () => ({ error: 'Denied' }) };
    }

    throw new Error(`Unexpected fetch: ${url}`);
  });

  vi.stubGlobal('fetch', fetchMock as any);

  const user = userEvent.setup();
  render(
    <ToastProvider>
      <RequestList />
    </ToastProvider>,
  );

  expect(await screen.findByText('昵称：alice')).toBeInTheDocument();
  await user.type(screen.getByLabelText(/tracking number for alice/i), 'SF123');
  await user.click(screen.getByRole('button', { name: '批准' }));

  expect(await screen.findByText('操作失败')).toBeInTheDocument();
  expect(screen.getByText('Denied')).toBeInTheDocument();
  expect(screen.getAllByText('待审核').length).toBeGreaterThan(0);
});

test('RequestList reports load network errors', async () => {
  const fetchMock = vi.fn(async () => {
    throw new Error('offline');
  });
  vi.stubGlobal('fetch', fetchMock as any);

  const user = userEvent.setup();
  render(
    <ToastProvider>
      <RequestList initialRequests={[]} />
    </ToastProvider>,
  );

  await user.click(screen.getByRole('button', { name: '刷新' }));
  expect(await screen.findByText('网络异常')).toBeInTheDocument();
  expect(screen.getAllByText('offline').length).toBeGreaterThan(0);
  expect(await screen.findByRole('heading', { name: '加载失败' })).toBeInTheDocument();
});

test('RequestList keeps invalid createdAt as-is', () => {
  render(
    <ToastProvider>
      <RequestList
        initialRequests={[
          {
            id: 'r1',
            nickname: 'alice',
            address: 'Somewhere',
            items: [{ productName: 'A', quantity: 1 }],
            paymentProof: 'https://example.com/pay.png',
            shippingProof: 'https://example.com/ship.png',
            status: 'pending',
            createdAt: 'not-a-date',
            trackingNumber: null,
          },
        ]}
      />
    </ToastProvider>,
  );

  expect(screen.getByText(/提交时间：not-a-date/)).toBeInTheDocument();
});

test('RequestList uses default message when error is missing', async () => {
  const fetchMock = vi.fn(async () => ({
    ok: false,
    json: async () => ({}),
  }));
  vi.stubGlobal('fetch', fetchMock as any);

  const user = userEvent.setup();
  render(
    <ToastProvider>
      <RequestList initialRequests={[]} />
    </ToastProvider>,
  );

  await user.click(screen.getByRole('button', { name: '刷新' }));
  expect((await screen.findAllByText('加载失败')).length).toBeGreaterThan(0);
});

test('RequestList treats missing requests as empty', async () => {
  const fetchMock = vi.fn(async () => ({
    ok: true,
    json: async () => ({}),
  }));
  vi.stubGlobal('fetch', fetchMock as any);

  const user = userEvent.setup();
  render(
    <ToastProvider>
      <RequestList initialRequests={[]} />
    </ToastProvider>,
  );

  await user.click(screen.getByRole('button', { name: '刷新' }));
  expect(await screen.findByText('暂无排发申请')).toBeInTheDocument();
});

test('RequestList reports approve network errors', async () => {
  const fetchMock = vi.fn(async (url: string, init?: any) => {
    if (url === '/api/admin/requests') {
      return {
        ok: true,
        json: async () => ({
          requests: [
            {
              id: 'r1',
              nickname: 'alice',
              address: 'Somewhere',
              items: [{ productName: 'A', quantity: 1 }],
              paymentProof: '',
              shippingProof: '',
              status: 'pending',
              createdAt: new Date('2026-01-01T00:00:00.000Z').toISOString(),
              trackingNumber: null,
            },
          ],
        }),
      };
    }

    if (url === '/api/admin/approve' && init?.method === 'POST') {
      throw new Error('offline');
    }

    throw new Error(`Unexpected fetch: ${url}`);
  });

  vi.stubGlobal('fetch', fetchMock as any);

  const user = userEvent.setup();
  render(
    <ToastProvider>
      <RequestList />
    </ToastProvider>,
  );

  expect(await screen.findByText('昵称：alice')).toBeInTheDocument();
  await user.type(screen.getByLabelText(/tracking number for alice/i), 'SF123');
  await user.click(screen.getByRole('button', { name: '批准' }));

  expect(await screen.findByText('网络异常')).toBeInTheDocument();
  expect(screen.getAllByText('offline').length).toBeGreaterThan(0);
});

test('RequestList handles reject API errors', async () => {
  const fetchMock = vi.fn(async (url: string, init?: any) => {
    if (url === '/api/admin/requests') {
      return {
        ok: true,
        json: async () => ({
          requests: [
            {
              id: 'r1',
              nickname: 'alice',
              address: 'Somewhere',
              items: [{ productName: 'A', quantity: 1 }],
              paymentProof: '',
              shippingProof: '',
              status: 'pending',
              createdAt: new Date('2026-01-01T00:00:00.000Z').toISOString(),
              trackingNumber: null,
            },
          ],
        }),
      };
    }

    if (url === '/api/admin/approve' && init?.method === 'POST') {
      return { ok: false, json: async () => ({ error: 'Denied' }) };
    }

    throw new Error(`Unexpected fetch: ${url}`);
  });

  vi.stubGlobal('fetch', fetchMock as any);

  const user = userEvent.setup();
  render(
    <ToastProvider>
      <RequestList />
    </ToastProvider>,
  );

  expect(await screen.findByText('昵称：alice')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: '拒绝' }));

  expect(await screen.findByText('操作失败')).toBeInTheDocument();
  expect(screen.getAllByText('Denied').length).toBeGreaterThan(0);
});

test('RequestList includes shipmentId when rejecting', async () => {
  const fetchMock = vi.fn(async (url: string, init?: any) => {
    if (url === '/api/admin/requests') {
      return {
        ok: true,
        json: async () => ({
          requests: [
            {
              id: 'r1',
              nickname: 'alice',
              address: 'Somewhere',
              items: [{ productName: 'A', quantity: 1 }],
              paymentProof: '',
              shippingProof: '',
              status: 'pending',
              createdAt: new Date('2026-01-01T00:00:00.000Z').toISOString(),
              trackingNumber: null,
            },
          ],
        }),
      };
    }

    if (url === '/api/admin/approve' && init?.method === 'POST') {
      return { ok: true, json: async () => ({ shipmentId: 's1' }) };
    }

    throw new Error(`Unexpected fetch: ${url}`);
  });

  vi.stubGlobal('fetch', fetchMock as any);

  const user = userEvent.setup();
  render(
    <ToastProvider>
      <RequestList />
    </ToastProvider>,
  );

  expect(await screen.findByText('昵称：alice')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: '拒绝' }));

  expect(await screen.findByText(/已撤销 s1/)).toBeInTheDocument();
});
