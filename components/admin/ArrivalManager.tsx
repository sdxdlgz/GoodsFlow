'use client';

import * as React from 'react';

import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Checkbox } from '@/components/ui/Checkbox';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';

export type ArrivalProductType = {
  id: string;
  name: string;
  unitPrice: number;
  arrived: boolean;
  arrivedAt?: string | null;
};

function formatPrice(amount: number) {
  if (!Number.isFinite(amount)) return String(amount);
  return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(amount);
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('zh-CN', { hour12: false });
}

export function ArrivalManager({
  periodName,
  initialItems,
}: {
  periodName: string;
  initialItems: ArrivalProductType[];
}) {
  const { toast } = useToast();
  const [items, setItems] = React.useState<ArrivalProductType[]>(initialItems);
  const [filter, setFilter] = React.useState<'all' | 'pending' | 'arrived'>('all');
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [saving, setSaving] = React.useState(false);

  const visibleItems = React.useMemo(() => {
    if (filter === 'all') return items;
    if (filter === 'arrived') return items.filter((p) => p.arrived);
    return items.filter((p) => !p.arrived);
  }, [filter, items]);

  const arrivedCount = items.filter((p) => p.arrived).length;
  const allVisibleSelected =
    visibleItems.length > 0 && visibleItems.every((item) => selectedIds.has(item.id));

  const toggleAllVisible = (checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        for (const item of visibleItems) next.add(item.id);
        return next;
      }
      for (const item of visibleItems) next.delete(item.id);
      return next;
    });
  };

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const applyArrival = async (arrived: boolean) => {
    const productTypeIds = Array.from(selectedIds);
    if (productTypeIds.length === 0) return;

    setSaving(true);
    try {
      const response = await fetch('/api/admin/arrival', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ productTypeIds, arrived }),
      });
      const data = (await response.json()) as { updated?: number; error?: string };

      if (!response.ok) {
        toast({
          variant: 'error',
          title: '更新失败',
          message: data.error ?? '请稍后重试',
        });
        return;
      }

      const now = new Date().toISOString();
      setItems((prev) =>
        prev.map((p) =>
          selectedIds.has(p.id) ? { ...p, arrived, arrivedAt: arrived ? now : null } : p,
        ),
      );
      setSelectedIds(new Set());
      toast({
        variant: 'success',
        title: '已更新到货状态',
        message: `更新 ${data.updated ?? productTypeIds.length} 项`,
      });
    } catch (err) {
      toast({
        variant: 'error',
        title: '网络异常',
        message: err instanceof Error ? err.message : '请稍后重试',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>到货管理</CardTitle>
        <CardDescription>
          期数：{periodName} · 已到货 {arrivedCount}/{items.length}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={filter === 'all' ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              全部
            </Button>
            <Button
              type="button"
              variant={filter === 'pending' ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => setFilter('pending')}
            >
              未到货
            </Button>
            <Button
              type="button"
              variant={filter === 'arrived' ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => setFilter('arrived')}
            >
              已到货
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={saving || selectedIds.size === 0}
              onClick={() => void applyArrival(true)}
            >
              标记到货
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={saving || selectedIds.size === 0}
              onClick={() => void applyArrival(false)}
            >
              取消到货
            </Button>
          </div>
        </div>

        <div className="overflow-hidden rounded-[1.75rem] border border-border">
          <div className="grid grid-cols-[2.5rem_1fr_auto] gap-3 bg-accent/30 px-4 py-3 text-sm font-medium sm:grid-cols-[2.5rem_2fr_1fr_1.2fr]">
            <div className="flex items-center">
              <Checkbox
                aria-label="Select all"
                checked={allVisibleSelected}
                onChange={(e) => toggleAllVisible(e.currentTarget.checked)}
              />
            </div>
            <div>商品</div>
            <div className="hidden sm:block">单价</div>
            <div className="text-right">状态</div>
          </div>

          <ul className="divide-y divide-border">
            {visibleItems.length === 0 ? (
              <li className="px-4 py-10 text-center text-sm text-muted-foreground">暂无数据</li>
            ) : (
              visibleItems.map((item) => (
                <li
                  key={item.id}
                  className="grid grid-cols-[2.5rem_1fr_auto] items-center gap-3 px-4 py-4 sm:grid-cols-[2.5rem_2fr_1fr_1.2fr]"
                >
                  <div className="flex items-center">
                    <Checkbox
                      aria-label={`Select ${item.name}`}
                      checked={selectedIds.has(item.id)}
                      onChange={() => toggleOne(item.id)}
                    />
                  </div>

                  <div className="min-w-0">
                    <p className="truncate font-medium">{item.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground sm:hidden">
                      单价：{formatPrice(item.unitPrice)}
                    </p>
                  </div>

                  <div className="hidden text-sm text-muted-foreground sm:block">
                    {formatPrice(item.unitPrice)}
                  </div>

                  <div className="flex flex-col items-end gap-1 text-right">
                    <span
                      className={cn(
                        'inline-flex items-center rounded-full border px-3 py-1 text-xs',
                        item.arrived
                          ? 'border-primary/30 bg-primary/10 text-foreground'
                          : 'border-border bg-background/60 text-muted-foreground',
                      )}
                    >
                      {item.arrived ? '已到货' : '未到货'}
                    </span>
                    {item.arrivedAt ? (
                      <span className="hidden text-xs text-muted-foreground sm:block">
                        {formatDateTime(item.arrivedAt)}
                      </span>
                    ) : null}
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

