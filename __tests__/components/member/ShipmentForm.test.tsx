import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, test, vi } from 'vitest';

import { ShipmentForm } from '@/components/member/ShipmentForm';
import { ToastProvider } from '@/components/ui/Toast';

class MockFileReader {
  result: string | ArrayBuffer | null = null;
  onload: null | (() => void) = null;
  onerror: null | (() => void) = null;
  readAsDataURL(file: File) {
    this.result = `data:${file.type};base64,MOCK_${file.name}`;
    if (this.onload) this.onload();
  }
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

test('ShipmentForm filters products by period and submits request', async () => {
  vi.stubGlobal('FileReader', MockFileReader as any);

  const fetchMock = vi.fn(async (url: string, init?: any) => {
    if (url.startsWith('/api/orders?nickname=alice')) {
      return {
        ok: true,
        json: async () => ({
          orders: [
            {
              id: 'o1',
              periodName: '第1期',
              items: [
                { id: 'i1', productTypeId: 'p1', productName: '苹果', quantity: 2, arrived: true, shipped: false },
                { id: 'i2', productTypeId: 'p2', productName: '香蕉', quantity: 1, arrived: false, shipped: false },
              ],
            },
            {
              id: 'o2',
              periodName: '第2期',
              items: [
                { id: 'i3', productTypeId: 'p3', productName: '橙子', quantity: 3, arrived: true, shipped: false },
              ],
            },
          ],
        }),
      };
    }

    if (url === '/api/upload' && init?.method === 'POST') {
      const form = init.body as FormData;
      const file = form.get('file') as File | null;
      const name = file?.name ?? 'upload.bin';
      return {
        ok: true,
        json: async () => ({ url: `https://example.com/${name}`, pathname: name, size: file?.size ?? 0 }),
      };
    }

    if (url === '/api/shipment/request' && init?.method === 'POST') {
      return { ok: true, json: async () => ({ requestId: 'r1' }) };
    }

    throw new Error(`Unexpected fetch: ${url}`);
  });
  vi.stubGlobal('fetch', fetchMock as any);

  const user = userEvent.setup();
  render(
    <ToastProvider>
      <ShipmentForm nickname="alice" />
    </ToastProvider>,
  );

  expect(await screen.findByText('选择期数')).toBeInTheDocument();
  expect(screen.getByRole('option', { name: /第1期/ })).toBeInTheDocument();
  expect(screen.getByRole('option', { name: /第2期/ })).toBeInTheDocument();

  expect(screen.getByText('苹果')).toBeInTheDocument();
  expect(screen.queryByText('橙子')).not.toBeInTheDocument();

  await user.selectOptions(screen.getByLabelText('期数'), '第2期');
  expect(await screen.findByText('橙子')).toBeInTheDocument();
  expect(screen.queryByText('苹果')).not.toBeInTheDocument();

  await user.click(screen.getByLabelText('Select 橙子'));
  fireEvent.change(screen.getByLabelText('Quantity for 橙子'), { target: { value: '2' } });
  await user.type(screen.getByPlaceholderText(/请输入详细地址/), '张三 13800000000 北京市朝阳区…');

  const payment = new File(['1'], 'pay.png', { type: 'image/png' });
  const shipping = new File(['1'], 'ship.png', { type: 'image/png' });
  await user.upload(screen.getByLabelText('付款截图'), payment);
  await user.upload(screen.getByLabelText('运费截图'), shipping);

  await user.click(screen.getByRole('button', { name: '提交排发申请' }));
  await waitFor(() =>
    expect(fetchMock.mock.calls.filter((c) => c[0] === '/api/upload')).toHaveLength(2),
  );
  await user.click(screen.getByRole('button', { name: '提交排发申请' }));
  await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/shipment/request', expect.anything()));

  const submitCall = fetchMock.mock.calls.find((c) => c[0] === '/api/shipment/request');
  expect(submitCall).toBeTruthy();
  const body = JSON.parse(submitCall?.[1]?.body ?? '{}');
  expect(body.nickname).toBe('alice');
  expect(body.items).toEqual([{ productTypeId: 'p3', quantity: 2 }]);
  expect(body.paymentProof).toBe('https://example.com/pay.png');
  expect(body.shippingProof).toBe('https://example.com/ship.png');

  expect(await screen.findByText('已提交排发申请')).toBeInTheDocument();
});

test('ShipmentForm validates required fields', async () => {
  const fetchMock = vi.fn(async (url: string, init?: any) => {
    if (url.startsWith('/api/orders?nickname=alice')) {
      return {
        ok: true,
        json: async () => ({
          orders: [
            {
              id: 'o1',
              periodName: '第1期',
              items: [
                { id: 'i1', productTypeId: 'p1', productName: '苹果', quantity: 1, arrived: true, shipped: false },
              ],
            },
          ],
        }),
      };
    }

    if (url === '/api/upload' && init?.method === 'POST') {
      const form = init.body as FormData;
      const file = form.get('file') as File | null;
      const name = file?.name ?? 'upload.bin';
      return {
        ok: true,
        json: async () => ({ url: `https://example.com/${name}`, pathname: name, size: file?.size ?? 0 }),
      };
    }

    throw new Error(`Unexpected fetch: ${url}`);
  });
  vi.stubGlobal('fetch', fetchMock as any);

  const user = userEvent.setup();
  render(
    <ToastProvider>
      <ShipmentForm nickname="alice" />
    </ToastProvider>,
  );

  await screen.findByText('选择期数');
  await user.click(screen.getByLabelText('Select 苹果'));
  await user.click(screen.getByRole('button', { name: '提交排发申请' }));
  expect(await screen.findByText('缺少地址')).toBeInTheDocument();
});

test('ShipmentForm shows load error state', async () => {
  const fetchMock = vi.fn(async () => ({
    ok: false,
    json: async () => ({ error: 'No orders' }),
  }));
  vi.stubGlobal('fetch', fetchMock as any);

  render(
    <ToastProvider>
      <ShipmentForm nickname="alice" />
    </ToastProvider>,
  );

  expect(await screen.findByText('加载失败')).toBeInTheDocument();
  expect(screen.getByText('No orders')).toBeInTheDocument();
});

test('ShipmentForm validates missing product selection', async () => {
  const fetchMock = vi.fn(async (url: string, init?: any) => {
    if (url.startsWith('/api/orders?nickname=alice')) {
      return {
        ok: true,
        json: async () => ({
          orders: [
            {
              id: 'o1',
              periodName: '第1期',
              items: [
                { id: 'i1', productTypeId: 'p1', productName: '苹果', quantity: 1, arrived: true, shipped: false },
              ],
            },
          ],
        }),
      };
    }

    if (url === '/api/upload' && init?.method === 'POST') {
      const form = init.body as FormData;
      const file = form.get('file') as File | null;
      const name = file?.name ?? 'upload.bin';
      return {
        ok: true,
        json: async () => ({ url: `https://example.com/${name}`, pathname: name, size: file?.size ?? 0 }),
      };
    }

    throw new Error(`Unexpected fetch: ${url}`);
  });
  vi.stubGlobal('fetch', fetchMock as any);

  const user = userEvent.setup();
  render(
    <ToastProvider>
      <ShipmentForm nickname="alice" />
    </ToastProvider>,
  );

  await screen.findByText('选择期数');
  await user.type(screen.getByPlaceholderText(/请输入详细地址/), 'Somewhere');
  await user.click(screen.getByRole('button', { name: '提交排发申请' }));
  expect(await screen.findByText('未选择商品')).toBeInTheDocument();
});

test('ShipmentForm validates missing screenshots', async () => {
  const fetchMock = vi.fn(async (url: string, init?: any) => {
    if (url.startsWith('/api/orders?nickname=alice')) {
      return {
        ok: true,
        json: async () => ({
          orders: [
            {
              id: 'o1',
              periodName: '第1期',
              items: [
                { id: 'i1', productTypeId: 'p1', productName: '苹果', quantity: 1, arrived: true, shipped: false },
              ],
            },
          ],
        }),
      };
    }

    if (url === '/api/upload' && init?.method === 'POST') {
      const form = init.body as FormData;
      const file = form.get('file') as File | null;
      const name = file?.name ?? 'upload.bin';
      return {
        ok: true,
        json: async () => ({ url: `https://example.com/${name}`, pathname: name, size: file?.size ?? 0 }),
      };
    }

    throw new Error(`Unexpected fetch: ${url}`);
  });
  vi.stubGlobal('fetch', fetchMock as any);

  const user = userEvent.setup();
  render(
    <ToastProvider>
      <ShipmentForm nickname="alice" />
    </ToastProvider>,
  );

  await screen.findByText('选择期数');
  await user.click(screen.getByLabelText('Select 苹果'));
  await user.type(screen.getByPlaceholderText(/请输入详细地址/), 'Somewhere');
  await user.click(screen.getByRole('button', { name: '提交排发申请' }));
  expect(await screen.findByText('缺少截图')).toBeInTheDocument();
  expect(screen.getByText('请上传付款截图')).toBeInTheDocument();
});

test('ShipmentForm rejects non-image uploads', async () => {
  const fetchMock = vi.fn(async (url: string, init?: any) => {
    if (url.startsWith('/api/orders?nickname=alice')) {
      return {
        ok: true,
        json: async () => ({
          orders: [
            {
              id: 'o1',
              periodName: '第1期',
              items: [
                { id: 'i1', productTypeId: 'p1', productName: '苹果', quantity: 1, arrived: true, shipped: false },
              ],
            },
          ],
        }),
      };
    }

    if (url === '/api/upload' && init?.method === 'POST') {
      const form = init.body as FormData;
      const file = form.get('file') as File | null;
      const name = file?.name ?? 'upload.bin';
      return {
        ok: true,
        json: async () => ({ url: `https://example.com/${name}`, pathname: name, size: file?.size ?? 0 }),
      };
    }

    throw new Error(`Unexpected fetch: ${url}`);
  });
  vi.stubGlobal('fetch', fetchMock as any);

  const user = userEvent.setup();
  render(
    <ToastProvider>
      <ShipmentForm nickname="alice" />
    </ToastProvider>,
  );

  await screen.findByText('选择期数');
  const bad = new File(['no'], 'note.txt', { type: 'text/plain' });
  fireEvent.change(screen.getByLabelText('付款截图'), { target: { files: [bad] } });
  expect(await screen.findByText('文件格式不支持')).toBeInTheDocument();
});

test('ShipmentForm reports submit API errors', async () => {
  vi.stubGlobal('FileReader', MockFileReader as any);

  const fetchMock = vi.fn(async (url: string, init?: any) => {
    if (url.startsWith('/api/orders?nickname=alice')) {
      return {
        ok: true,
        json: async () => ({
          orders: [
            {
              id: 'o1',
              periodName: '第1期',
              items: [
                { id: 'i1', productTypeId: 'p1', productName: '苹果', quantity: 1, arrived: true, shipped: false },
              ],
            },
          ],
        }),
      };
    }

    if (url === '/api/upload' && init?.method === 'POST') {
      const form = init.body as FormData;
      const file = form.get('file') as File | null;
      const name = file?.name ?? 'upload.bin';
      return {
        ok: true,
        json: async () => ({ url: `https://example.com/${name}`, pathname: name, size: file?.size ?? 0 }),
      };
    }

    if (url === '/api/shipment/request' && init?.method === 'POST') {
      return { ok: false, json: async () => ({ error: 'Denied' }) };
    }
    throw new Error(`Unexpected fetch: ${url}`);
  });
  vi.stubGlobal('fetch', fetchMock as any);

  const user = userEvent.setup();
  render(
    <ToastProvider>
      <ShipmentForm nickname="alice" />
    </ToastProvider>,
  );

  await screen.findByText('选择期数');
  await user.click(screen.getByLabelText('Select 苹果'));
  await user.type(screen.getByPlaceholderText(/请输入详细地址/), 'Somewhere');

  const payment = new File(['1'], 'pay.png', { type: 'image/png' });
  const shipping = new File(['1'], 'ship.png', { type: 'image/png' });
  await user.upload(screen.getByLabelText('付款截图'), payment);
  await user.upload(screen.getByLabelText('运费截图'), shipping);

  await user.click(screen.getByRole('button', { name: '提交排发申请' }));
  expect(await screen.findByText('提交失败')).toBeInTheDocument();
  expect(screen.getByText('Denied')).toBeInTheDocument();
});

test('ShipmentForm validates missing shipping screenshot', async () => {
  vi.stubGlobal('FileReader', MockFileReader as any);

  const fetchMock = vi.fn(async (url: string, init?: any) => {
    if (url.startsWith('/api/orders?nickname=alice')) {
      return {
        ok: true,
        json: async () => ({
          orders: [
            {
              id: 'o1',
              periodName: '第1期',
              items: [
                { id: 'i1', productTypeId: 'p1', productName: '苹果', quantity: 1, arrived: true, shipped: false },
              ],
            },
          ],
        }),
      };
    }

    if (url === '/api/upload' && init?.method === 'POST') {
      const form = init.body as FormData;
      const file = form.get('file') as File | null;
      const name = file?.name ?? 'upload.bin';
      return {
        ok: true,
        json: async () => ({ url: `https://example.com/${name}`, pathname: name, size: file?.size ?? 0 }),
      };
    }

    throw new Error(`Unexpected fetch: ${url}`);
  });
  vi.stubGlobal('fetch', fetchMock as any);

  const user = userEvent.setup();
  render(
    <ToastProvider>
      <ShipmentForm nickname="alice" />
    </ToastProvider>,
  );

  await screen.findByText('选择期数');
  await user.click(screen.getByLabelText('Select 苹果'));
  await user.type(screen.getByPlaceholderText(/请输入详细地址/), 'Somewhere');
  await user.upload(screen.getByLabelText('付款截图'), new File(['1'], 'pay.png', { type: 'image/png' }));

  await waitFor(() =>
    expect(fetchMock.mock.calls.filter((c) => c[0] === '/api/upload')).toHaveLength(1),
  );
  await waitFor(() =>
    expect(screen.getByAltText('付款截图预览')).toHaveAttribute('src', 'https://example.com/pay.png'),
  );

  await user.click(screen.getByRole('button', { name: '提交排发申请' }));
  expect(await screen.findByText('缺少截图')).toBeInTheDocument();
  expect(screen.getByText('请上传运费截图')).toBeInTheDocument();
});

test('ShipmentForm shows message when no products are available in period', async () => {
  const fetchMock = vi.fn(async (url: string) => {
    if (url.startsWith('/api/orders?nickname=alice')) {
      return {
        ok: true,
        json: async () => ({
          orders: [
            {
              id: 'o1',
              periodName: '第1期',
              items: [
                { id: 'i1', productTypeId: 'p1', productName: '苹果', quantity: 1, arrived: false, shipped: false },
              ],
            },
          ],
        }),
      };
    }
    throw new Error(`Unexpected fetch: ${url}`);
  });
  vi.stubGlobal('fetch', fetchMock as any);

  render(
    <ToastProvider>
      <ShipmentForm nickname="alice" />
    </ToastProvider>,
  );

  await screen.findByText('选择期数');
  expect(await screen.findByText('当前期数暂无可排发商品（可能还未到货或已全部排发）。')).toBeInTheDocument();
});

test('ShipmentForm keeps selected period on refresh', async () => {
  const fetchMock = vi.fn(async (url: string) => {
    if (url.startsWith('/api/orders?nickname=alice')) {
      return {
        ok: true,
        json: async () => ({
          orders: [
            {
              id: 'o1',
              periodName: '第1期',
              items: [
                { id: 'i1', productTypeId: 'p1', productName: '苹果', quantity: 1, arrived: true, shipped: false },
              ],
            },
            {
              id: 'o2',
              periodName: '第2期',
              items: [
                { id: 'i2', productTypeId: 'p2', productName: '橙子', quantity: 1, arrived: true, shipped: false },
              ],
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
      <ShipmentForm nickname="alice" />
    </ToastProvider>,
  );

  await screen.findByText('选择期数');
  await user.selectOptions(screen.getByLabelText('期数'), '第2期');
  expect(screen.getByLabelText('期数')).toHaveValue('第2期');

  await user.click(screen.getByRole('button', { name: '刷新商品' }));
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  expect(screen.getByLabelText('期数')).toHaveValue('第2期');
});

test('ShipmentForm rejects files larger than 2MB', async () => {
  const fetchMock = vi.fn(async (url: string) => {
    if (url.startsWith('/api/orders?nickname=alice')) {
      return {
        ok: true,
        json: async () => ({
          orders: [
            {
              id: 'o1',
              periodName: '第1期',
              items: [
                { id: 'i1', productTypeId: 'p1', productName: '苹果', quantity: 1, arrived: true, shipped: false },
              ],
            },
          ],
        }),
      };
    }
    throw new Error(`Unexpected fetch: ${url}`);
  });
  vi.stubGlobal('fetch', fetchMock as any);

  render(
    <ToastProvider>
      <ShipmentForm nickname="alice" />
    </ToastProvider>,
  );

  await screen.findByText('选择期数');
  const big = new File([new Uint8Array(2 * 1024 * 1024 + 1)], 'big.png', { type: 'image/png' });
  fireEvent.change(screen.getByLabelText('付款截图'), { target: { files: [big] } });
  expect(await screen.findByText('图片过大')).toBeInTheDocument();
});

test('ShipmentForm clears preview when file is removed', async () => {
  vi.stubGlobal('FileReader', MockFileReader as any);

  const fetchMock = vi.fn(async (url: string, init?: any) => {
    if (url.startsWith('/api/orders?nickname=alice')) {
      return {
        ok: true,
        json: async () => ({
          orders: [
            {
              id: 'o1',
              periodName: '第1期',
              items: [
                { id: 'i1', productTypeId: 'p1', productName: '苹果', quantity: 1, arrived: true, shipped: false },
              ],
            },
          ],
        }),
      };
    }

    if (url === '/api/upload' && init?.method === 'POST') {
      const form = init.body as FormData;
      const file = form.get('file') as File | null;
      const name = file?.name ?? 'upload.bin';
      return {
        ok: true,
        json: async () => ({ url: `https://example.com/${name}`, pathname: name, size: file?.size ?? 0 }),
      };
    }

    throw new Error(`Unexpected fetch: ${url}`);
  });
  vi.stubGlobal('fetch', fetchMock as any);

  const user = userEvent.setup();
  render(
    <ToastProvider>
      <ShipmentForm nickname="alice" />
    </ToastProvider>,
  );

  await screen.findByText('选择期数');
  const image = new File(['1'], 'pay.png', { type: 'image/png' });
  await user.upload(screen.getByLabelText('付款截图'), image);
  expect(await screen.findByAltText('付款截图预览')).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText('付款截图'), { target: { files: [] } });
  await waitFor(() => expect(screen.queryByAltText('付款截图预览')).not.toBeInTheDocument());
});

test('ShipmentForm reports image read errors', async () => {
  class ErrorFileReader {
    result: string | ArrayBuffer | null = null;
    onload: null | (() => void) = null;
    onerror: null | (() => void) = null;
    readAsDataURL() {
      if (this.onerror) this.onerror();
    }
  }
  vi.stubGlobal('FileReader', ErrorFileReader as any);

  const fetchMock = vi.fn(async (url: string) => {
    if (url.startsWith('/api/orders?nickname=alice')) {
      return {
        ok: true,
        json: async () => ({
          orders: [
            {
              id: 'o1',
              periodName: '第1期',
              items: [
                { id: 'i1', productTypeId: 'p1', productName: '苹果', quantity: 1, arrived: true, shipped: false },
              ],
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
      <ShipmentForm nickname="alice" />
    </ToastProvider>,
  );

  await screen.findByText('选择期数');
  await user.upload(screen.getByLabelText('付款截图'), new File(['1'], 'pay.png', { type: 'image/png' }));
  expect(await screen.findByText('读取失败')).toBeInTheDocument();
});

test('ShipmentForm uses default load error when missing error field', async () => {
  const fetchMock = vi.fn(async () => ({ ok: false, json: async () => ({}) }));
  vi.stubGlobal('fetch', fetchMock as any);

  render(
    <ToastProvider>
      <ShipmentForm nickname="alice" />
    </ToastProvider>,
  );

  expect(await screen.findAllByText('加载失败')).not.toHaveLength(0);
});

test('ShipmentForm treats non-array orders as empty', async () => {
  const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ orders: {} }) }));
  vi.stubGlobal('fetch', fetchMock as any);

  render(
    <ToastProvider>
      <ShipmentForm nickname="alice" />
    </ToastProvider>,
  );

  expect(await screen.findByText('暂无可排发商品（可能还未到货或已全部排发）。')).toBeInTheDocument();
});

test('ShipmentForm keeps selected items on refresh', async () => {
  const fetchMock = vi.fn(async (url: string) => {
    if (url.startsWith('/api/orders?nickname=alice')) {
      return {
        ok: true,
        json: async () => ({
          orders: [
            {
              id: 'o1',
              periodName: '第1期',
              items: [
                { id: 'i1', productTypeId: 'p1', productName: '苹果', quantity: 2, arrived: true, shipped: false },
              ],
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
      <ShipmentForm nickname="alice" />
    </ToastProvider>,
  );

  await screen.findByText('选择期数');
  await user.click(screen.getByLabelText('Select 苹果'));
  expect(screen.getByLabelText('Quantity for 苹果')).toHaveValue(1);

  await user.click(screen.getByRole('button', { name: '刷新商品' }));
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  expect(screen.getByLabelText('Quantity for 苹果')).toHaveValue(1);
});

test('ShipmentForm unselects items when quantity is set to zero', async () => {
  const fetchMock = vi.fn(async (url: string) => {
    if (url.startsWith('/api/orders?nickname=alice')) {
      return {
        ok: true,
        json: async () => ({
          orders: [
            {
              id: 'o1',
              periodName: '第1期',
              items: [
                { id: 'i1', productTypeId: 'p1', productName: '苹果', quantity: 2, arrived: true, shipped: false },
              ],
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
      <ShipmentForm nickname="alice" />
    </ToastProvider>,
  );

  await screen.findByText('选择期数');
  await user.click(screen.getByLabelText('Select 苹果'));
  fireEvent.change(screen.getByLabelText('Quantity for 苹果'), { target: { value: '0' } });
  expect(screen.queryByLabelText('Quantity for 苹果')).toBeInTheDocument();
  expect(screen.getByText(/已选择 0 件商品/)).toBeInTheDocument();
});

test('ShipmentForm uses default submit error message', async () => {
  vi.stubGlobal('FileReader', MockFileReader as any);

  const fetchMock = vi.fn(async (url: string, init?: any) => {
    if (url.startsWith('/api/orders?nickname=alice')) {
      return {
        ok: true,
        json: async () => ({
          orders: [
            {
              id: 'o1',
              periodName: '第1期',
              items: [
                { id: 'i1', productTypeId: 'p1', productName: '苹果', quantity: 1, arrived: true, shipped: false },
              ],
            },
          ],
        }),
      };
    }

    if (url === '/api/upload' && init?.method === 'POST') {
      const form = init.body as FormData;
      const file = form.get('file') as File | null;
      const name = file?.name ?? 'upload.bin';
      return {
        ok: true,
        json: async () => ({ url: `https://example.com/${name}`, pathname: name, size: file?.size ?? 0 }),
      };
    }

    if (url === '/api/shipment/request' && init?.method === 'POST') {
      return { ok: false, json: async () => ({}) };
    }
    throw new Error(`Unexpected fetch: ${url}`);
  });
  vi.stubGlobal('fetch', fetchMock as any);

  const user = userEvent.setup();
  render(
    <ToastProvider>
      <ShipmentForm nickname="alice" />
    </ToastProvider>,
  );

  await screen.findByText('选择期数');
  await user.click(screen.getByLabelText('Select 苹果'));
  await user.type(screen.getByPlaceholderText(/请输入详细地址/), 'Somewhere');
  await user.upload(screen.getByLabelText('付款截图'), new File(['1'], 'pay.png', { type: 'image/png' }));
  await user.upload(screen.getByLabelText('运费截图'), new File(['1'], 'ship.png', { type: 'image/png' }));
  await waitFor(() =>
    expect(fetchMock.mock.calls.filter((c) => c[0] === '/api/upload')).toHaveLength(2),
  );
  await user.click(screen.getByRole('button', { name: '提交排发申请' }));
  expect(await screen.findByText('提交失败')).toBeInTheDocument();
  expect(screen.getByText('请稍后重试')).toBeInTheDocument();
});

test('ShipmentForm supports submit success without requestId', async () => {
  vi.stubGlobal('FileReader', MockFileReader as any);

  const fetchMock = vi.fn(async (url: string, init?: any) => {
    if (url.startsWith('/api/orders?nickname=alice')) {
      return {
        ok: true,
        json: async () => ({
          orders: [
            {
              id: 'o1',
              periodName: '第1期',
              items: [
                { id: 'i1', productTypeId: 'p1', productName: '苹果', quantity: 1, arrived: true, shipped: false },
              ],
            },
          ],
        }),
      };
    }

    if (url === '/api/upload' && init?.method === 'POST') {
      const form = init.body as FormData;
      const file = form.get('file') as File | null;
      const name = file?.name ?? 'upload.bin';
      return {
        ok: true,
        json: async () => ({ url: `https://example.com/${name}`, pathname: name, size: file?.size ?? 0 }),
      };
    }

    if (url === '/api/shipment/request' && init?.method === 'POST') {
      return { ok: true, json: async () => ({}) };
    }
    throw new Error(`Unexpected fetch: ${url}`);
  });
  vi.stubGlobal('fetch', fetchMock as any);

  const user = userEvent.setup();
  render(
    <ToastProvider>
      <ShipmentForm nickname="alice" />
    </ToastProvider>,
  );

  await screen.findByText('选择期数');
  await user.click(screen.getByLabelText('Select 苹果'));
  await user.type(screen.getByPlaceholderText(/请输入详细地址/), 'Somewhere');
  await user.upload(screen.getByLabelText('付款截图'), new File(['1'], 'pay.png', { type: 'image/png' }));
  await user.upload(screen.getByLabelText('运费截图'), new File(['1'], 'ship.png', { type: 'image/png' }));
  await waitFor(() =>
    expect(fetchMock.mock.calls.filter((c) => c[0] === '/api/upload')).toHaveLength(2),
  );
  await user.click(screen.getByRole('button', { name: '提交排发申请' }));
  expect(await screen.findByText('已提交排发申请')).toBeInTheDocument();
  expect(screen.getByText(/申请编号：-/)).toBeInTheDocument();
});

test('ShipmentForm reports generic read errors when FileReader throws non-Error', async () => {
  class ThrowingFileReader {
    onload: null | (() => void) = null;
    onerror: null | (() => void) = null;
    readAsDataURL() {
      throw 'boom';
    }
  }
  vi.stubGlobal('FileReader', ThrowingFileReader as any);

  const fetchMock = vi.fn(async (url: string) => {
    if (url.startsWith('/api/orders?nickname=alice')) {
      return {
        ok: true,
        json: async () => ({
          orders: [
            {
              id: 'o1',
              periodName: '第1期',
              items: [
                { id: 'i1', productTypeId: 'p1', productName: '苹果', quantity: 1, arrived: true, shipped: false },
              ],
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
      <ShipmentForm nickname="alice" />
    </ToastProvider>,
  );

  await screen.findByText('选择期数');
  await user.upload(screen.getByLabelText('付款截图'), new File(['1'], 'pay.png', { type: 'image/png' }));
  expect(await screen.findByText('读取失败')).toBeInTheDocument();
  expect(screen.getByText('无法读取图片')).toBeInTheDocument();
});

test('ShipmentForm clears shipping preview when file is removed', async () => {
  vi.stubGlobal('FileReader', MockFileReader as any);

  const fetchMock = vi.fn(async (url: string, init?: any) => {
    if (url.startsWith('/api/orders?nickname=alice')) {
      return {
        ok: true,
        json: async () => ({
          orders: [
            {
              id: 'o1',
              periodName: '第1期',
              items: [
                { id: 'i1', productTypeId: 'p1', productName: '苹果', quantity: 1, arrived: true, shipped: false },
              ],
            },
          ],
        }),
      };
    }

    if (url === '/api/upload' && init?.method === 'POST') {
      const form = init.body as FormData;
      const file = form.get('file') as File | null;
      const name = file?.name ?? 'upload.bin';
      return {
        ok: true,
        json: async () => ({ url: `https://example.com/${name}`, pathname: name, size: file?.size ?? 0 }),
      };
    }

    throw new Error(`Unexpected fetch: ${url}`);
  });
  vi.stubGlobal('fetch', fetchMock as any);

  const user = userEvent.setup();
  render(
    <ToastProvider>
      <ShipmentForm nickname="alice" />
    </ToastProvider>,
  );

  await screen.findByText('选择期数');
  const image = new File(['1'], 'ship.png', { type: 'image/png' });
  await user.upload(screen.getByLabelText('运费截图'), image);
  expect(await screen.findByAltText('运费截图预览')).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText('运费截图'), { target: { files: [] } });
  await waitFor(() => expect(screen.queryByAltText('运费截图预览')).not.toBeInTheDocument());
});
