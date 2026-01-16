'use client';

import * as React from 'react';
import Link from 'next/link';

import { Button, buttonVariants } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';

type ImportResult = {
  periodId: string;
  periodName: string;
  totalOrders: number;
  totalAmount: number;
};

function formatCurrency(amount: number) {
  if (!Number.isFinite(amount)) return String(amount);
  return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(amount);
}

function isExcelFile(file: File) {
  const name = file.name.toLowerCase();
  return name.endsWith('.xlsx') || name.endsWith('.xls');
}

export function ImportUploader() {
  const { toast } = useToast();
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  const [isDragging, setIsDragging] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);
  const [fileName, setFileName] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<ImportResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const uploadFile = React.useCallback(
    async (file: File) => {
      if (!isExcelFile(file)) {
        setError('请上传 .xlsx 或 .xls 文件');
        toast({ variant: 'error', message: '文件格式不支持，请选择 Excel 文件。' });
        return;
      }

      setIsUploading(true);
      setError(null);
      setResult(null);
      setFileName(file.name);

      try {
        const formData = new FormData();
        formData.set('file', file);

        const response = await fetch('/api/admin/import', {
          method: 'POST',
          body: formData,
        });

        const data = (await response.json()) as
          | ImportResult
          | { error?: string; code?: string; issues?: unknown };

        if (!response.ok) {
          const message =
            typeof (data as any)?.error === 'string'
              ? (data as any).error
              : '导入失败，请检查文件格式';
          setError(message);
          toast({ variant: 'error', title: '导入失败', message });
          return;
        }

        setResult(data as ImportResult);
        toast({ variant: 'success', title: '导入成功', message: '已写入数据库，可继续进行到货管理。' });
      } catch (err) {
        const message = err instanceof Error ? err.message : '网络异常';
        setError(message);
        toast({ variant: 'error', title: '上传失败', message });
      } finally {
        setIsUploading(false);
      }
    },
    [toast],
  );

  const onBrowse = () => inputRef.current?.click();

  const onDrop: React.DragEventHandler<HTMLDivElement> = (event) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) void uploadFile(file);
  };

  const onChange: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    const file = event.target.files?.[0];
    if (file) void uploadFile(file);
    event.target.value = '';
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <Card>
        <CardHeader>
          <CardTitle>Excel 导入</CardTitle>
          <CardDescription>拖拽上传汇总表，系统会自动解析并写入本期数据。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div
            role="button"
            tabIndex={0}
            onClick={onBrowse}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ' ? onBrowse() : null)}
            onDragEnter={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragOver={(e) => e.preventDefault()}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
            className={cn(
              [
                'relative overflow-hidden rounded-[2.25rem_1.75rem_2.25rem_2rem]',
                'border border-dashed border-border bg-background/60',
                'px-6 py-10 text-center shadow-sm backdrop-blur-sm',
                'transition-all duration-300',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                'focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                'hover:-translate-y-0.5 hover:bg-accent/40',
              ].join(' '),
              isDragging && 'border-primary bg-accent/50',
            )}
          >
            <div className="mx-auto max-w-sm">
              <p className="font-medium">拖拽 Excel 到这里</p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                或点击选择文件（.xlsx / .xls）
              </p>
              <div className="mt-6 flex items-center justify-center gap-3">
                <Button type="button" variant="outline" onClick={onBrowse} disabled={isUploading}>
                  选择文件
                </Button>
                <p className="text-xs text-muted-foreground">
                  {fileName ? `已选择：${fileName}` : '建议使用导入模板'}
                </p>
              </div>
            </div>

            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls"
              className="sr-only"
              onChange={onChange}
            />
          </div>

          {isUploading ? (
            <p className="text-sm text-muted-foreground">正在上传并解析…</p>
          ) : error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : null}

          {result ? (
            <Card className="bg-accent/30">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl">导入结果</CardTitle>
                <CardDescription>期数：{result.periodName}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-xs text-muted-foreground">订单数</p>
                  <p className="mt-1 font-serif text-2xl">{result.totalOrders}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">总金额</p>
                  <p className="mt-1 font-serif text-2xl">{formatCurrency(result.totalAmount)}</p>
                </div>
                <div className="flex items-end justify-start sm:justify-end">
                  <Link
                    href="/admin/arrival"
                    className={buttonVariants({ variant: 'primary', size: 'md' })}
                  >
                    去到货管理
                  </Link>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>小贴士</CardTitle>
          <CardDescription>保持表格结构一致，能显著降低导入失败率。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm leading-relaxed text-muted-foreground">
          <ul className="list-disc space-y-2 pl-5">
            <li>确保工作表名称为“汇总表”或使用模板。</li>
            <li>商品行、单价行顺序不要调整。</li>
            <li>昵称请保持一致，系统会自动合并同名记录。</li>
          </ul>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/arrival" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
              到货管理
            </Link>
            <Link
              href="/admin/requests"
              className={buttonVariants({ variant: 'outline', size: 'sm' })}
            >
              排发审核
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

