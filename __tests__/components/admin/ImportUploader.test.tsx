import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={typeof href === 'string' ? href : String(href)} {...props}>
      {children}
    </a>
  ),
}));

import { ImportUploader } from '@/components/admin/ImportUploader';
import { ToastProvider } from '@/components/ui/Toast';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

test('ImportUploader uploads excel and shows result', async () => {
  const fetchMock = vi.fn(async () => ({
    ok: true,
    json: async () => ({
      periodId: 'p1',
      periodName: '第 1 期',
      totalOrders: 2,
      totalAmount: 100,
    }),
  }));
  vi.stubGlobal('fetch', fetchMock as any);

  render(
    <ToastProvider>
      <ImportUploader />
    </ToastProvider>,
  );

  const dropzone = screen.getByRole('button', { name: /拖拽 excel 到这里/i });
  const file = new File(['dummy'], 'orders.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

  fireEvent.drop(dropzone, { dataTransfer: { files: [file] } });

  await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/admin/import', expect.anything()));
  expect(await screen.findByText('导入结果')).toBeInTheDocument();
  expect(screen.getByText(/期数：第 1 期/)).toBeInTheDocument();
});

test('ImportUploader rejects non-excel files', async () => {
  const fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock as any);

  render(
    <ToastProvider>
      <ImportUploader />
    </ToastProvider>,
  );

  const dropzone = screen.getByRole('button', { name: /拖拽 excel 到这里/i });
  const file = new File(['dummy'], 'notes.txt', { type: 'text/plain' });

  fireEvent.drop(dropzone, { dataTransfer: { files: [file] } });

  expect(await screen.findByText(/请上传 \.xlsx 或 \.xls 文件/)).toBeInTheDocument();
  expect(fetchMock).not.toHaveBeenCalled();
});

test('ImportUploader shows server error messages', async () => {
  const fetchMock = vi.fn(async () => ({
    ok: false,
    json: async () => ({ error: 'Bad format' }),
  }));
  vi.stubGlobal('fetch', fetchMock as any);

  render(
    <ToastProvider>
      <ImportUploader />
    </ToastProvider>,
  );

  const dropzone = screen.getByRole('button', { name: /拖拽 excel 到这里/i });
  const file = new File(['dummy'], 'orders.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  fireEvent.drop(dropzone, { dataTransfer: { files: [file] } });

  expect((await screen.findAllByText('Bad format')).length).toBeGreaterThan(0);
  expect(screen.queryByText('导入结果')).not.toBeInTheDocument();
});

test('ImportUploader supports click, keyboard, and input change', async () => {
  const fetchMock = vi.fn(async () => ({
    ok: true,
    json: async () => ({
      periodId: 'p1',
      periodName: '第 1 期',
      totalOrders: 1,
      totalAmount: 5,
    }),
  }));
  vi.stubGlobal('fetch', fetchMock as any);

  const clickSpy = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {});

  const { container } = render(
    <ToastProvider>
      <ImportUploader />
    </ToastProvider>,
  );

  const dropzone = screen.getByRole('button', { name: /拖拽 excel 到这里/i });

  fireEvent.click(dropzone);
  fireEvent.keyDown(dropzone, { key: 'Enter' });
  fireEvent.keyDown(dropzone, { key: ' ' });
  fireEvent.keyDown(dropzone, { key: 'Escape' });
  expect(clickSpy).toHaveBeenCalled();

  fireEvent.dragEnter(dropzone);
  expect(dropzone.className).toContain('border-primary');
  fireEvent.dragOver(dropzone);
  fireEvent.dragLeave(dropzone);
  expect(dropzone.className).not.toContain('border-primary');

  const input = container.querySelector('input[type="file"]') as HTMLInputElement;
  const file = new File(['dummy'], 'orders.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  fireEvent.change(input, { target: { files: [file] } });

  await waitFor(() => expect(fetchMock).toHaveBeenCalled());
  clickSpy.mockRestore();
});

test('ImportUploader reports network errors', async () => {
  const fetchMock = vi.fn(async () => {
    throw new Error('offline');
  });
  vi.stubGlobal('fetch', fetchMock as any);

  render(
    <ToastProvider>
      <ImportUploader />
    </ToastProvider>,
  );

  const dropzone = screen.getByRole('button', { name: /拖拽 excel 到这里/i });
  const file = new File(['dummy'], 'orders.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  fireEvent.drop(dropzone, { dataTransfer: { files: [file] } });

  expect((await screen.findAllByText('offline')).length).toBeGreaterThan(0);
});
