'use client';

import * as React from 'react';

import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';

export type AdminRequestItem = { productName: string; quantity: number };

export type AdminShipmentRequest = {
  id: string;
  nickname: string;
  address: string;
  items: AdminRequestItem[];
  paymentProof: string;
  shippingProof: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  trackingNumber?: string | null;
};

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('zh-CN', { hour12: false });
}

function statusLabel(status: AdminShipmentRequest['status']) {
  if (status === 'approved') return '已批准';
  if (status === 'rejected') return '已拒绝';
  return '待审核';
}

function statusClassName(status: AdminShipmentRequest['status']) {
  if (status === 'approved') return 'border-primary/30 bg-primary/10 text-foreground';
  if (status === 'rejected') return 'border-destructive/40 bg-destructive/10 text-foreground';
  return 'border-border bg-background/60 text-muted-foreground';
}

export function RequestList({ initialRequests }: { initialRequests?: AdminShipmentRequest[] }) {
  const { toast } = useToast();
  const [requests, setRequests] = React.useState<AdminShipmentRequest[]>(initialRequests ?? []);
  const [loading, setLoading] = React.useState(initialRequests ? false : true);
  const [error, setError] = React.useState<string | null>(null);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [trackingById, setTrackingById] = React.useState<Record<string, string>>({});
  const [preview, setPreview] = React.useState<{ title: string; url: string } | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/requests', { method: 'GET' });
      const data = (await response.json()) as
        | { requests: AdminShipmentRequest[] }
        | { error?: string };

      if (!response.ok) {
        const message = (data as any)?.error ?? '加载失败';
        setError(message);
        toast({ variant: 'error', title: '加载失败', message });
        return;
      }

      setRequests((data as any).requests ?? []);
    } catch (err) {
      const message = err instanceof Error ? err.message : '网络异常';
      setError(message);
      toast({ variant: 'error', title: '网络异常', message });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    if (initialRequests) return;
    void load();
  }, [initialRequests, load]);

  const approve = async (requestId: string) => {
    const trackingNumber = trackingById[requestId]?.trim() ?? '';
    if (!trackingNumber) {
      toast({ variant: 'error', title: '缺少单号', message: '请先录入物流单号' });
      return;
    }

    setBusyId(requestId);
    try {
      const response = await fetch('/api/admin/approve', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ requestId, approved: true, trackingNumber }),
      });
      const data = (await response.json()) as { shipmentId?: string; error?: string };
      if (!response.ok) {
        toast({ variant: 'error', title: '操作失败', message: data.error ?? '请稍后重试' });
        return;
      }

      setRequests((prev) =>
        prev.map((r) =>
          r.id === requestId ? { ...r, status: 'approved', trackingNumber } : r,
        ),
      );
      toast({ variant: 'success', title: '已批准', message: `已生成发货记录 ${data.shipmentId ?? ''}`.trim() });
    } catch (err) {
      toast({
        variant: 'error',
        title: '网络异常',
        message: err instanceof Error ? err.message : '请稍后重试',
      });
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (requestId: string) => {
    setBusyId(requestId);
    try {
      const response = await fetch('/api/admin/approve', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ requestId, approved: false }),
      });
      const data = (await response.json()) as { shipmentId?: string; error?: string };
      if (!response.ok) {
        toast({ variant: 'error', title: '操作失败', message: data.error ?? '请稍后重试' });
        return;
      }

      setRequests((prev) => prev.map((r) => (r.id === requestId ? { ...r, status: 'rejected' } : r)));
      toast({ variant: 'info', title: '已拒绝', message: data.shipmentId ? `已撤销 ${data.shipmentId}` : '已更新状态' });
    } catch (err) {
      toast({
        variant: 'error',
        title: '网络异常',
        message: err instanceof Error ? err.message : '请稍后重试',
      });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-serif text-2xl tracking-tight">排发申请</h2>
          <p className="mt-1 text-sm text-muted-foreground">查看截图、地址并完成审核操作。</p>
        </div>
        <Button type="button" variant="outline" onClick={() => void load()} disabled={loading}>
          刷新
        </Button>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">加载中…</CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardHeader>
            <CardTitle>加载失败</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button type="button" onClick={() => void load()}>
              重试
            </Button>
          </CardContent>
        </Card>
      ) : requests.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            暂无排发申请
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {requests.map((req) => (
            <Card key={req.id}>
              <CardHeader className="pb-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <CardTitle className="text-xl">昵称：{req.nickname}</CardTitle>
                    <CardDescription className="mt-1">
                      提交时间：{formatDateTime(req.createdAt)}
                    </CardDescription>
                  </div>
                  <span
                    className={cn(
                      'inline-flex items-center rounded-full border px-3 py-1 text-xs',
                      statusClassName(req.status),
                    )}
                  >
                    {statusLabel(req.status)}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">收货地址</p>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                      {req.address}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">商品清单</p>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      {req.items.map((item) => (
                        <li key={`${req.id}-${item.productName}`} className="flex justify-between gap-4">
                          <span className="truncate">{item.productName}</span>
                          <span className="font-medium text-foreground">×{item.quantity}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setPreview({ title: '付款截图', url: req.paymentProof })}
                      disabled={!req.paymentProof}
                    >
                      查看付款截图
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setPreview({ title: '运费截图', url: req.shippingProof })}
                      disabled={!req.shippingProof}
                    >
                      查看运费截图
                    </Button>
                  </div>

                  {req.status === 'approved' ? (
                    <p className="text-sm text-muted-foreground">
                      单号：<span className="font-medium text-foreground">{req.trackingNumber ?? '-'}</span>
                    </p>
                  ) : null}
                </div>

                {req.status === 'pending' ? (
                  <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
                    <Input
                      aria-label={`Tracking number for ${req.nickname}`}
                      placeholder="录入物流单号"
                      value={trackingById[req.id] ?? ''}
                      onChange={(e) => {
                        const value = e.currentTarget.value;
                        setTrackingById((prev) => ({ ...prev, [req.id]: value }));
                      }}
                      disabled={busyId === req.id}
                    />
                    <Button
                      type="button"
                      variant="primary"
                      disabled={busyId === req.id}
                      onClick={() => void approve(req.id)}
                    >
                      批准
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      disabled={busyId === req.id}
                      onClick={() => void reject(req.id)}
                    >
                      拒绝
                    </Button>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {preview ? (
        <Modal
          open
          onOpenChange={() => setPreview(null)}
          title={preview.title}
          description="点击遮罩或按 Esc 关闭"
          size="lg"
        >
          <div className="overflow-hidden rounded-[1.75rem] border border-border bg-background/60">
            <img
              src={preview.url}
              alt={preview.title}
              className="h-auto w-full object-contain"
              loading="lazy"
            />
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
