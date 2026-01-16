import * as React from 'react';

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, test, vi } from 'vitest';

import { FileUpload, type UploadResponse } from '@/components/FileUpload';

vi.mock('@/lib/image-compress', () => ({
  compressImageFile: vi.fn(async (file: File) => file),
}));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function Harness({ label, folder, onChange }: { label: string; folder: string; onChange: (value: UploadResponse | null) => void }) {
  const [value, setValue] = React.useState<UploadResponse | null>(null);
  return (
    <FileUpload
      label={label}
      folder={folder}
      value={value}
      onChange={(next) => {
        onChange(next);
        setValue(next);
      }}
    />
  );
}

test('FileUpload uploads a file and reports the uploaded url', async () => {
  const onChange = vi.fn();
  const fetchMock = vi.fn(async (url: string, init?: any) => {
    expect(url).toBe('/api/upload');
    expect(init?.method).toBe('POST');

    const form = init?.body as FormData;
    expect(form.get('folder')).toBe('proofs');
    const file = form.get('file') as File;

    return {
      ok: true,
      json: async () => ({ url: `https://example.com/${file.name}`, pathname: file.name, size: file.size }),
    };
  });
  vi.stubGlobal('fetch', fetchMock as any);

  const user = userEvent.setup();
  render(<Harness label="付款截图" folder="proofs" onChange={onChange} />);

  await user.upload(screen.getByLabelText('付款截图'), new File(['1'], 'pay.png', { type: 'image/png' }));

  await waitFor(() =>
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ url: 'https://example.com/pay.png', pathname: 'pay.png', size: 1 }),
    ),
  );
  expect(screen.getByAltText('付款截图预览')).toBeInTheDocument();
});

test('FileUpload shows error when upload fails', async () => {
  const onChange = vi.fn();
  const fetchMock = vi.fn(async () => ({
    ok: false,
    json: async () => ({ error: 'Nope' }),
  }));
  vi.stubGlobal('fetch', fetchMock as any);

  const user = userEvent.setup();
  render(<FileUpload label="付款截图" folder="proofs" value={null} onChange={onChange} />);

  await user.upload(screen.getByLabelText('付款截图'), new File(['1'], 'pay.png', { type: 'image/png' }));

  expect(await screen.findByText('Nope')).toBeInTheDocument();
  expect(onChange).not.toHaveBeenCalled();
});

test('FileUpload clears value via remove button', async () => {
  const onChange = vi.fn();
  const fetchMock = vi.fn(async () => ({
    ok: true,
    json: async () => ({ url: 'https://example.com/pay.png', pathname: 'pay.png', size: 1 }),
  }));
  vi.stubGlobal('fetch', fetchMock as any);

  const user = userEvent.setup();
  render(<Harness label="付款截图" folder="proofs" onChange={onChange} />);

  await user.upload(screen.getByLabelText('付款截图'), new File(['1'], 'pay.png', { type: 'image/png' }));
  await waitFor(() => expect(onChange).toHaveBeenCalled());

  await user.click(screen.getByRole('button', { name: '移除' }));
  expect(onChange).toHaveBeenLastCalledWith(null);
});
