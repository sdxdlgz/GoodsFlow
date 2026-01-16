'use client';

import * as React from 'react';

import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { compressImageFile } from '@/lib/image-compress';

export type UploadResponse = {
  url: string;
  pathname: string;
  size: number;
  contentType?: string;
};

export type FileUploadProps = {
  label: string;
  folder?: string;
  accept?: string;
  disabled?: boolean;
  className?: string;
  value?: UploadResponse | null;
  onChange?: (value: UploadResponse | null) => void;
};

export function FileUpload({
  label,
  folder,
  accept = 'image/*',
  disabled,
  className,
  value,
  onChange,
}: FileUploadProps) {
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const upload = React.useCallback(
    async (file: File | null) => {
      setError(null);
      if (!file) {
        onChange?.(null);
        return;
      }

      setBusy(true);
      try {
        const compressed = await compressImageFile(file);
        const body = new FormData();
        body.append('file', compressed, compressed.name);
        if (folder) body.append('folder', folder);

        const response = await fetch('/api/upload', { method: 'POST', body });
        const json = (await response.json()) as Partial<UploadResponse> & { error?: string };
        if (!response.ok || !json.url || !json.pathname || typeof json.size !== 'number') {
          throw new Error(json.error || 'Upload failed');
        }

        onChange?.({
          url: json.url,
          pathname: json.pathname,
          size: json.size,
          contentType: json.contentType,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload failed');
      } finally {
        setBusy(false);
      }
    },
    [folder, onChange],
  );

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium">{label}</p>
        {value ? (
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange?.(null)} disabled={busy || disabled}>
            移除
          </Button>
        ) : null}
      </div>

      <input
        aria-label={label}
        type="file"
        accept={accept}
        disabled={busy || disabled}
        onChange={(e) => void upload(e.currentTarget.files?.[0] ?? null)}
      />

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {value?.url ? (
        <div className="overflow-hidden rounded-[1.25rem] border border-border bg-background/60">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value.url} alt={`${label}预览`} className="h-auto w-full object-contain" />
        </div>
      ) : null}
    </div>
  );
}

