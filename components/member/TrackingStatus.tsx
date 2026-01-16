'use client';

import * as React from 'react';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { cn } from '@/lib/utils';

export type MemberTrackingRecord = {
  requestId: string;
  nickname: string;
  periodName?: string | null;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  trackingNumber?: string | null;
  shipmentStatus?: string | null;
  shippedAt?: string | null;
  items?: Array<{ productName: string; quantity: number }>;
};

function formatDateTime(value: string | null | undefined) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('zh-CN', { hour12: false });
}

function statusLabel(status: MemberTrackingRecord['status']) {
  if (status === 'approved') return '已通过';
  if (status === 'rejected') return '已拒绝';
  return '审核中';
}

function statusVariant(status: MemberTrackingRecord['status']) {
  if (status === 'approved') return 'primary';
  if (status === 'rejected') return 'destructive';
  return 'default';
}

function buildTimeline(record: MemberTrackingRecord) {
  const steps: Array<{ title: string; time?: string | null; tone: 'done' | 'current' | 'pending' }> = [
    { title: '已提交申请', time: record.createdAt, tone: 'done' },
  ];

  if (record.status === 'rejected') {
    steps.push({ title: '已拒绝', tone: 'current' });
    return steps;
  }

  if (record.status === 'pending') {
    steps.push({ title: '团长审核中', tone: 'current' });
    steps.push({ title: '等待发货', tone: 'pending' });
    return steps;
  }

  const shipped = Boolean(record.trackingNumber) || record.shipmentStatus === 'shipped';
  if (!shipped) {
    steps.push({ title: '已审核通过', tone: 'done' });
    steps.push({ title: '等待发货', tone: 'current' });
    return steps;
  }

  steps.push({ title: '已审核通过', tone: 'done' });
  steps.push({ title: '已发货', time: record.shippedAt, tone: 'current' });
  return steps;
}

export function TrackingStatus({ nickname }: { nickname: string }) {
  const [records, setRecords] = React.useState<MemberTrackingRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/shipment/status?nickname=${encodeURIComponent(nickname)}`, {
        method: 'GET',
      });
      const data = (await response.json()) as { records?: MemberTrackingRecord[]; error?: string };
      if (!response.ok) {
        setError(data.error ?? '加载失败');
        setRecords([]);
        return;
      }

      setRecords(Array.isArray(data.records) ? data.records : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '网络异常');
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [nickname]);

  React.useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="font-serif text-2xl tracking-tight sm:text-3xl">物流查询</h2>
          <p className="mt-1 text-sm text-muted-foreground">昵称：{nickname}</p>
        </div>
        <Button type="button" variant="outline" onClick={() => void load()} disabled={loading}>
          刷新
        </Button>
      </div>

      {loading ? (
        <Card>
          <CardHeader>
            <CardTitle>加载中…</CardTitle>
            <CardDescription>正在获取排发与物流状态。</CardDescription>
          </CardHeader>
        </Card>
      ) : error ? (
        <Card>
          <CardHeader>
            <CardTitle>加载失败</CardTitle>
            <CardDescription className="text-destructive">{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button type="button" variant="primary" onClick={() => void load()}>
              重试
            </Button>
          </CardContent>
        </Card>
      ) : records.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>暂无记录</CardTitle>
            <CardDescription>还没有排发申请记录，或团长尚未审核。</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-6">
          {records.map((record) => (
            <TrackingCard key={record.requestId} record={record} />
          ))}
        </div>
      )}
    </div>
  );
}

function TrackingCard({ record }: { record: MemberTrackingRecord }) {
  const steps = buildTimeline(record);

  return (
    <Card className="transition-all duration-300 hover:-translate-y-1 hover:shadow-soft">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <CardTitle className="text-xl">排发申请</CardTitle>
            <CardDescription className="mt-1">
              {record.periodName ? `期数：${record.periodName} · ` : null}提交：
              {formatDateTime(record.createdAt)}
            </CardDescription>
          </div>
          <Badge variant={statusVariant(record.status)}>{statusLabel(record.status)}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {record.items?.length ? (
          <div className="grid gap-2">
            <p className="text-sm font-medium">商品</p>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {record.items.map((item) => (
                <li
                  key={`${record.requestId}-${item.productName}`}
                  className="flex justify-between gap-4"
                >
                  <span className="truncate">{item.productName}</span>
                  <span className="font-medium text-foreground">×{item.quantity}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="grid gap-3 rounded-[1.75rem] border border-border bg-background/60 p-4 sm:p-5">
          <p className="text-sm font-medium">物流单号</p>
          <p className="text-sm text-muted-foreground">
            {record.trackingNumber ? (
              <span className="font-medium text-foreground">{record.trackingNumber}</span>
            ) : (
              '团长审核后将录入单号'
            )}
          </p>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium">进度</p>
          <ol className="space-y-3">
            {steps.map((step, index) => (
              <li key={`${record.requestId}-${step.title}`} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span
                    className={cn(
                      'mt-0.5 h-3 w-3 rounded-full border',
                      step.tone === 'done' && 'border-primary/40 bg-primary/60',
                      step.tone === 'current' && 'border-secondary/50 bg-secondary/60',
                      step.tone === 'pending' && 'border-border bg-background',
                    )}
                  />
                  {index < steps.length - 1 ? (
                    <span
                      aria-hidden
                      className={cn(
                        'mt-1 h-8 w-px',
                        step.tone === 'pending' ? 'bg-border' : 'bg-primary/30',
                      )}
                    />
                  ) : null}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium">{step.title}</p>
                  {step.time ? (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatDateTime(step.time)}
                    </p>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}

