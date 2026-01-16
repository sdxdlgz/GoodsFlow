'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';

type OrdersSummary = {
  periodCount: number;
  arrivedItemCount: number;
  pendingItemCount: number;
};

function summarizeOrders(orders: unknown): OrdersSummary | null {
  if (!Array.isArray(orders)) return null;
  let arrivedItemCount = 0;
  let pendingItemCount = 0;

  for (const order of orders) {
    if (!order || typeof order !== 'object') continue;
    const record = order as Record<string, unknown>;
    const items = Array.isArray(record.items) ? (record.items as unknown[]) : [];
    for (const item of items) {
      if (!item || typeof item !== 'object') continue;
      const itemRecord = item as Record<string, unknown>;
      const arrived = Boolean(itemRecord.arrived);
      const shipped = Boolean(itemRecord.shipped);
      const quantity =
        typeof itemRecord.quantity === 'number'
          ? itemRecord.quantity
          : Number(itemRecord.quantity ?? 0);
      if (!Number.isFinite(quantity) || quantity <= 0) continue;
      if (arrived && !shipped) arrivedItemCount += quantity;
      if (!arrived && !shipped) pendingItemCount += quantity;
    }
  }

  return {
    periodCount: orders.length,
    arrivedItemCount,
    pendingItemCount,
  };
}

export type NicknameSearchProps = {
  defaultNickname?: string;
  debounceMs?: number;
  showActions?: boolean;
  className?: string;
  groupSlug?: string;
};

export function NicknameSearch({
  defaultNickname = '',
  debounceMs = 300,
  showActions = true,
  className,
  groupSlug,
}: NicknameSearchProps) {
  const router = useRouter();
  const [nickname, setNickname] = React.useState(defaultNickname);
  const [summary, setSummary] = React.useState<OrdersSummary | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const requestSeq = React.useRef(0);

  const trimmedNickname = nickname.trim();
  const basePath = groupSlug ? `/g/${groupSlug}` : '';
  const apiPath = groupSlug ? `/api/g/${groupSlug}` : '/api';

  const fetchSummary = React.useCallback(async (value: string) => {
    const seq = ++requestSeq.current;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${apiPath}/orders?nickname=${encodeURIComponent(value)}`, {
        method: 'GET',
      });
      const data = (await response.json()) as { orders?: unknown; error?: string };

      if (seq !== requestSeq.current) return;

      if (!response.ok) {
        setSummary(null);
        setError(data.error ?? '查询失败，请稍后重试');
        return;
      }

      const nextSummary = summarizeOrders(data.orders);
      setSummary(nextSummary);
      if (!nextSummary || nextSummary.periodCount === 0) {
        setError('未找到该昵称的订单');
      }
    } catch (err) {
      if (seq !== requestSeq.current) return;
      setSummary(null);
      setError(err instanceof Error ? err.message : '网络异常');
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  }, [apiPath]);

  React.useEffect(() => {
    if (!trimmedNickname) {
      requestSeq.current += 1;
      setSummary(null);
      setLoading(false);
      setError(null);
      return;
    }

    const handle = window.setTimeout(() => void fetchSummary(trimmedNickname), debounceMs);
    return () => window.clearTimeout(handle);
  }, [debounceMs, fetchSummary, trimmedNickname]);

  const navigateTo = (pathname: string) => {
    if (!trimmedNickname) {
      setError('请输入昵称');
      return;
    }
    router.push(`${basePath}${pathname}?nickname=${encodeURIComponent(trimmedNickname)}`);
  };

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader>
        <CardTitle>团员查询</CardTitle>
        <CardDescription>输入昵称，快速查看订单、可排发商品与物流状态。</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <form
          className="flex flex-col gap-3 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            navigateTo('/orders');
          }}
        >
          <label className="flex-1">
            <span className="sr-only">昵称</span>
            <Input
              value={nickname}
              onChange={(e) => setNickname(e.currentTarget.value)}
              placeholder="输入昵称，例如：ouranos"
              autoComplete="off"
              inputMode="text"
            />
          </label>
          <Button type="submit" variant="primary" className="h-11">
            快速查询
          </Button>
        </form>

        <div className="flex flex-wrap items-center gap-2" aria-live="polite">
          {loading ? (
            <Badge>查询中…</Badge>
          ) : summary ? (
            <>
              <Badge variant="outline">{summary.periodCount} 期订单</Badge>
              <Badge variant={summary.arrivedItemCount > 0 ? 'primary' : 'default'}>
                已到货 {summary.arrivedItemCount} 件
              </Badge>
              <Badge variant="default">未到货 {summary.pendingItemCount} 件</Badge>
            </>
          ) : (
            <Badge>输入昵称后自动查询</Badge>
          )}

          {error ? <span className="text-sm text-destructive">{error}</span> : null}
        </div>

        {showActions ? (
          <div className="grid gap-3 sm:grid-cols-3">
            <Button type="button" variant="outline" onClick={() => navigateTo('/orders')}>
              查看订单
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigateTo('/shipment')}>
              提交排发
            </Button>
            <Button type="button" variant="outline" onClick={() => navigateTo('/shipment/status')}>
              物流查询
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

