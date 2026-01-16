'use client';

import * as React from 'react';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { cn } from '@/lib/utils';

export type MemberOrderItem = {
  id: string;
  productTypeId: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
  arrived: boolean;
  shipped: boolean;
};

export type MemberOrder = {
  id: string;
  periodName: string;
  totalAmount: number;
  items: MemberOrderItem[];
};

function formatPrice(amount: number) {
  if (!Number.isFinite(amount)) return String(amount);
  return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(amount);
}

function groupByPeriod(orders: MemberOrder[]) {
  const byPeriod = new Map<string, MemberOrder[]>();
  for (const order of orders) {
    const key = order.periodName || '未命名期数';
    const group = byPeriod.get(key);
    if (group) group.push(order);
    else byPeriod.set(key, [order]);
  }
  return Array.from(byPeriod.entries());
}

export function OrderList({ nickname, groupSlug }: { nickname: string; groupSlug?: string }) {
  const [orders, setOrders] = React.useState<MemberOrder[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const apiPath = groupSlug ? `/api/g/${groupSlug}` : '/api';
  const basePath = groupSlug ? `/g/${groupSlug}` : '';

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${apiPath}/orders?nickname=${encodeURIComponent(nickname)}`, {
        method: 'GET',
      });
      const data = (await response.json()) as { orders?: MemberOrder[]; error?: string };
      if (!response.ok) {
        setError(data.error ?? '加载失败');
        setOrders([]);
        return;
      }

      setOrders(Array.isArray(data.orders) ? data.orders : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '网络异常');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [nickname, apiPath]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const grouped = React.useMemo(() => groupByPeriod(orders), [orders]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="font-serif text-2xl tracking-tight sm:text-3xl">订单列表</h2>
          <p className="mt-1 text-sm text-muted-foreground">昵称：{nickname}</p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => void load()} disabled={loading}>
            刷新
          </Button>
        </div>
      </div>

      {loading ? (
        <Card>
          <CardHeader>
            <CardTitle>加载中…</CardTitle>
            <CardDescription>正在获取订单数据。</CardDescription>
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
      ) : orders.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>暂无订单</CardTitle>
            <CardDescription>未找到该昵称的订单记录。</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        grouped.map(([periodName, periodOrders]) => (
          <PeriodSection
            key={periodName}
            periodName={periodName}
            orders={periodOrders}
            nickname={nickname}
            basePath={basePath}
          />
        ))
      )}
    </div>
  );
}

function PeriodSection({
  periodName,
  orders,
  nickname,
  basePath,
}: {
  periodName: string;
  orders: MemberOrder[];
  nickname: string;
  basePath: string;
}) {
  const items = orders.flatMap((o) => o.items ?? []);
  const arrivedItems = items.filter((i) => i.arrived && !i.shipped && i.quantity > 0);
  const pendingItems = items.filter((i) => !i.arrived && !i.shipped && i.quantity > 0);
  const shippedItems = items.filter((i) => i.shipped && i.quantity > 0);
  const totalAmount = orders.reduce(
    (sum, order) => sum + (Number.isFinite(order.totalAmount) ? order.totalAmount : 0),
    0,
  );

  return (
    <Card className="transition-all duration-300 hover:-translate-y-1 hover:shadow-soft">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <CardTitle className="text-xl sm:text-2xl">{periodName}</CardTitle>
            <CardDescription className="mt-1">
              合计：{formatPrice(totalAmount)} · 已到货 {arrivedItems.length} 项 · 未到货{' '}
              {pendingItems.length} 项
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href={`${basePath}/shipment?nickname=${encodeURIComponent(nickname)}`}
              className={cn(
                'inline-flex h-10 items-center justify-center rounded-full border border-border bg-background/70 px-4 text-sm',
                'transition-all duration-300 hover:bg-accent hover:scale-[1.02] active:scale-[0.98]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              )}
            >
              去排发
            </a>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-wrap gap-2">
          <Badge variant={arrivedItems.length > 0 ? 'primary' : 'default'}>已到货</Badge>
          <Badge variant="default">未到货</Badge>
          {shippedItems.length > 0 ? <Badge variant="secondary">已排发</Badge> : null}
        </div>

        <div className="overflow-hidden rounded-[1.75rem] border border-border">
          <div className="grid grid-cols-[1fr_auto_auto] gap-3 bg-accent/30 px-4 py-3 text-sm font-medium">
            <div>商品</div>
            <div className="text-right">数量</div>
            <div className="text-right">状态</div>
          </div>
          <ul className="divide-y divide-border">
            {items.map((item) => (
              <li
                key={item.id}
                className="grid grid-cols-[1fr_auto_auto] items-center gap-3 px-4 py-4"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{item.productName}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatPrice(item.unitPrice)} · 小计 {formatPrice(item.subtotal)}
                  </p>
                </div>
                <div className="text-right text-sm font-medium">×{item.quantity}</div>
                <div className="flex justify-end">
                  <Badge
                    size="sm"
                    variant={item.shipped ? 'secondary' : item.arrived ? 'primary' : 'default'}
                  >
                    {item.shipped ? '已排发' : item.arrived ? '已到货' : '未到货'}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

