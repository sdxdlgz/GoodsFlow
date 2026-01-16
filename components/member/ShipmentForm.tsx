'use client';

import * as React from 'react';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Checkbox } from '@/components/ui/Checkbox';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { useToast } from '@/components/ui/Toast';
import { compressImageFile } from '@/lib/image-compress';
import { cn } from '@/lib/utils';

type OrdersApiOrderItem = {
  id: string;
  productTypeId: string;
  productName: string;
  quantity: number;
  arrived: boolean;
  shipped: boolean;
};

type OrdersApiOrder = {
  id: string;
  periodName: string;
  items: OrdersApiOrderItem[];
};

type ProductOption = {
  productTypeId: string;
  productName: string;
  maxQuantity: number;
  periodName: string;
};

async function fileToDataUrl(file: File) {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('读取图片失败'));
    reader.readAsDataURL(file);
  });
}

function deriveProducts(orders: OrdersApiOrder[]): ProductOption[] {
  const result: ProductOption[] = [];
  for (const order of orders) {
    for (const item of order.items ?? []) {
      if (!item.arrived || item.shipped) continue;
      if (!Number.isFinite(item.quantity) || item.quantity <= 0) continue;
      result.push({
        productTypeId: item.productTypeId,
        productName: item.productName,
        maxQuantity: item.quantity,
        periodName: order.periodName,
      });
    }
  }
  result.sort(
    (a, b) => a.periodName.localeCompare(b.periodName) || a.productName.localeCompare(b.productName),
  );
  return result;
}

export function ShipmentForm({ nickname, groupSlug }: { nickname: string; groupSlug?: string }) {
  const { toast } = useToast();
  const [orders, setOrders] = React.useState<OrdersApiOrder[]>([]);
  const [products, setProducts] = React.useState<ProductOption[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [selected, setSelected] = React.useState<Record<string, number>>({});
  const [period, setPeriod] = React.useState<string>('');
  const [address, setAddress] = React.useState('');
  const [paymentFile, setPaymentFile] = React.useState<File | null>(null);
  const [shippingFile, setShippingFile] = React.useState<File | null>(null);
  const [paymentPreview, setPaymentPreview] = React.useState<string>('');
  const [shippingPreview, setShippingPreview] = React.useState<string>('');
  const [paymentProofUrl, setPaymentProofUrl] = React.useState<string>('');
  const [shippingProofUrl, setShippingProofUrl] = React.useState<string>('');
  const [submitting, setSubmitting] = React.useState(false);

  const paymentUploadId = React.useRef(0);
  const shippingUploadId = React.useRef(0);

  const apiPath = groupSlug ? `/api/g/${groupSlug}` : '/api';

  const periodRef = React.useRef(period);
  React.useEffect(() => {
    periodRef.current = period;
  }, [period]);

  const load = React.useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const response = await fetch(`${apiPath}/orders?nickname=${encodeURIComponent(nickname)}`, {
        method: 'GET',
      });
      const data = (await response.json()) as { orders?: OrdersApiOrder[]; error?: string };
      if (!response.ok) {
        setOrders([]);
        setProducts([]);
        setSelected({});
        setPeriod('');
        setLoadError(data.error ?? '加载失败');
        return;
      }
      const orders = Array.isArray(data.orders) ? data.orders : [];
      setOrders(orders);
      const nextProducts = deriveProducts(orders);
      const currentPeriod = periodRef.current;
      const desiredPeriod =
        currentPeriod && orders.some((o) => o.periodName === currentPeriod) ? currentPeriod : '';
      const firstAvailablePeriod =
        orders.find((o) => o.items?.some((i) => i.arrived && !i.shipped && i.quantity > 0))?.periodName ??
        orders[0]?.periodName ??
        '';
      const nextPeriod = desiredPeriod || firstAvailablePeriod;
      const nextProductsForPeriod = nextPeriod
        ? nextProducts.filter((p) => p.periodName === nextPeriod)
        : nextProducts;
      setProducts(nextProducts);
      setPeriod(nextPeriod);
      setSelected((prev) => {
        const keep: Record<string, number> = {};
        for (const product of nextProductsForPeriod) {
          const value = prev[product.productTypeId];
          if (typeof value === 'number' && value > 0) keep[product.productTypeId] = value;
        }
        return keep;
      });
    } catch (err) {
      setProducts([]);
      setSelected({});
      setOrders([]);
      setPeriod('');
      setLoadError(err instanceof Error ? err.message : '网络异常');
    } finally {
      setLoading(false);
    }
  }, [nickname, apiPath]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const selectedItems = React.useMemo(() => {
    const items: Array<{ productTypeId: string; quantity: number }> = [];
    for (const product of products) {
      if (period && product.periodName !== period) continue;
      const qty = selected[product.productTypeId];
      if (typeof qty === 'number' && qty > 0) {
        items.push({ productTypeId: product.productTypeId, quantity: qty });
      }
    }
    return items;
  }, [period, products, selected]);

  const onPickFile = async (
    file: File | null,
    setFile: (file: File | null) => void,
    setPreview: (value: string) => void,
    setUrl: (value: string) => void,
    uploadIdRef: React.MutableRefObject<number>,
  ) => {
    const uploadId = ++uploadIdRef.current;
    if (!file) {
      setFile(null);
      setPreview('');
      setUrl('');
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast({ variant: 'error', title: '文件格式不支持', message: '请上传图片文件（PNG/JPG 等）' });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ variant: 'error', title: '图片过大', message: '请上传小于 2MB 的截图' });
      return;
    }

    setFile(file);
    setUrl('');
    try {
      const nextPreview = await fileToDataUrl(file);
      if (uploadIdRef.current !== uploadId) return;
      setPreview(nextPreview);
    } catch (err) {
      if (uploadIdRef.current !== uploadId) return;
      toast({
        variant: 'error',
        title: '读取失败',
        message: err instanceof Error ? err.message : '无法读取图片',
      });
      setFile(null);
      setPreview('');
      setUrl('');
      return;
    }

    try {
      const compressed = await compressImageFile(file);
      if (uploadIdRef.current !== uploadId) return;
      const body = new FormData();
      body.append('file', compressed, compressed.name);
      body.append('folder', 'shipment');

      const response = await fetch('/api/upload', { method: 'POST', body });
      const data = (await response.json()) as { url?: string; error?: string };
      if (uploadIdRef.current !== uploadId) return;
      if (!response.ok || !data.url) {
        throw new Error(data.error ?? 'Upload failed');
      }

      setPreview(String(data.url));
      setUrl(String(data.url));
    } catch (err) {
      if (uploadIdRef.current !== uploadId) return;
      toast({
        variant: 'error',
        title: '上传失败',
        message: err instanceof Error ? err.message : '请稍后重试',
      });
      setFile(null);
      setPreview('');
      setUrl('');
    }
  };

  const toggleProduct = (product: ProductOption, checked: boolean) => {
    setSelected((prev) => {
      const next = { ...prev };
      if (!checked) {
        delete next[product.productTypeId];
        return next;
      }
      next[product.productTypeId] = Math.min(prev[product.productTypeId] ?? 1, product.maxQuantity);
      return next;
    });
  };

  const updateQuantity = (product: ProductOption, quantity: number) => {
    setSelected((prev) => {
      const next = { ...prev };
      if (!Number.isFinite(quantity) || quantity <= 0) {
        delete next[product.productTypeId];
        return next;
      }
      next[product.productTypeId] = Math.min(quantity, product.maxQuantity);
      return next;
    });
  };

  const periodOptions = React.useMemo(() => {
    return orders.map((order) => {
      const available = (order.items ?? [])
        .filter((i) => i.arrived && !i.shipped && i.quantity > 0)
        .reduce((sum, i) => sum + i.quantity, 0);
      return { periodName: order.periodName, available };
    });
  }, [orders]);

  const visibleProducts = React.useMemo(() => {
    if (!period) return [];
    return products.filter((p) => p.periodName === period);
  }, [period, products]);

  const submit = async () => {
    const addressValue = address.trim();
    if (!addressValue) {
      toast({ variant: 'error', title: '缺少地址', message: '请填写收货地址' });
      return;
    }
    if (selectedItems.length === 0) {
      toast({ variant: 'error', title: '未选择商品', message: '请至少选择 1 个已到货商品' });
      return;
    }
    if (!paymentProofUrl) {
      toast({ variant: 'error', title: '缺少截图', message: '请上传付款截图' });
      return;
    }
    if (!shippingProofUrl) {
      toast({ variant: 'error', title: '缺少截图', message: '请上传运费截图' });
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${apiPath}/shipment/request`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          nickname,
          address: addressValue,
          items: selectedItems,
          paymentProof: paymentProofUrl,
          shippingProof: shippingProofUrl,
        }),
      });

      const data = (await response.json()) as { requestId?: string; error?: string };
      if (!response.ok) {
        toast({ variant: 'error', title: '提交失败', message: data.error ?? '请稍后重试' });
        return;
      }

      toast({
        variant: 'success',
        title: '已提交排发申请',
        message: `申请编号：${data.requestId ?? '-'}`,
      });
      setSelected({});
      setAddress('');
      setPaymentFile(null);
      setShippingFile(null);
      setPaymentPreview('');
      setShippingPreview('');
      setPaymentProofUrl('');
      setShippingProofUrl('');
    } catch (err) {
      toast({
        variant: 'error',
        title: '网络异常',
        message: err instanceof Error ? err.message : '请稍后重试',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle>排发申请</CardTitle>
        <CardDescription>选择已到货商品并提交截图，团长审核后会录入物流单号。</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">昵称：{nickname}</Badge>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void load()}
            disabled={loading}
          >
            刷新商品
          </Button>
        </div>

        {loading ? (
          <div className="rounded-[1.75rem] border border-border bg-accent/20 p-6 text-sm text-muted-foreground">
            正在加载可排发商品…
          </div>
        ) : loadError ? (
          <div className="rounded-[1.75rem] border border-destructive/40 bg-destructive/10 p-6 text-sm text-foreground">
            <p className="font-medium">加载失败</p>
            <p className="mt-1 text-sm text-muted-foreground">{loadError}</p>
          </div>
        ) : periodOptions.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <div className="space-y-2">
              <p className="text-sm font-medium">选择期数</p>
              <Select
                aria-label="期数"
                value={period}
                onChange={(e) => {
                  setPeriod(e.currentTarget.value);
                  setSelected({});
                }}
                disabled={submitting}
              >
                {periodOptions.map((option) => (
                  <option key={option.periodName} value={option.periodName}>
                    {option.periodName}（可排发 {option.available}）
                  </option>
                ))}
              </Select>
            </div>
          </div>
        ) : null}

        {!loading && !loadError && periodOptions.length === 0 ? (
          <div className="rounded-[1.75rem] border border-border bg-background/60 p-6 text-sm text-muted-foreground">
            暂无可排发商品（可能还未到货或已全部排发）。
          </div>
        ) : null}

        {!loading && !loadError && periodOptions.length > 0 && visibleProducts.length === 0 ? (
          <div className="rounded-[1.75rem] border border-border bg-background/60 p-6 text-sm text-muted-foreground">
            当前期数暂无可排发商品（可能还未到货或已全部排发）。
          </div>
        ) : null}

        {!loading && !loadError && periodOptions.length > 0 && visibleProducts.length > 0 ? (
          <div className="overflow-hidden rounded-[1.75rem] border border-border">
            <div className="grid grid-cols-[2.5rem_1fr_6.5rem] gap-3 bg-accent/30 px-4 py-3 text-sm font-medium">
              <div />
              <div>已到货商品</div>
              <div className="text-right">数量</div>
            </div>
            <ul className="divide-y divide-border">
              {visibleProducts.map((product) => {
                const qty = selected[product.productTypeId] ?? 0;
                const checked = qty > 0;
                return (
                  <li
                    key={product.productTypeId}
                    className="grid grid-cols-[2.5rem_1fr_6.5rem] items-center gap-3 px-4 py-4"
                  >
                    <div className="flex items-center">
                      <Checkbox
                        aria-label={`Select ${product.productName}`}
                        checked={checked}
                        onChange={(e) => toggleProduct(product, e.currentTarget.checked)}
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{product.productName}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        可排发：{product.maxQuantity}
                      </p>
                    </div>
                    <div className="flex justify-end">
                      <Input
                        type="number"
                        min={1}
                        max={product.maxQuantity}
                        value={checked ? String(qty) : ''}
                        placeholder={checked ? undefined : '0'}
                        onChange={(e) => updateQuantity(product, Number(e.currentTarget.value))}
                        className={cn('h-10 w-24 text-right', !checked && 'opacity-70')}
                        disabled={!checked || submitting}
                        aria-label={`Quantity for ${product.productName}`}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="shipment-address">
              收货地址（必填）
            </label>
            <Textarea
              id="shipment-address"
              value={address}
              onChange={(e) => setAddress(e.currentTarget.value)}
              placeholder="请输入详细地址：姓名 / 电话 / 省市区 / 街道门牌"
              disabled={submitting}
            />
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">付款截图（必填）</p>
              <input
                aria-label="付款截图"
                type="file"
                accept="image/*"
                onChange={(e) =>
                  void onPickFile(
                    e.currentTarget.files?.[0] ?? null,
                    setPaymentFile,
                    setPaymentPreview,
                    setPaymentProofUrl,
                    paymentUploadId,
                  )
                }
                disabled={submitting}
              />
              {paymentPreview ? (
                <div className="overflow-hidden rounded-[1.5rem] border border-border bg-background/60">
                  <img
                    src={paymentPreview}
                    alt="付款截图预览"
                    className="h-auto w-full object-contain"
                  />
                </div>
              ) : null}
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">运费截图（必填）</p>
              <input
                aria-label="运费截图"
                type="file"
                accept="image/*"
                onChange={(e) =>
                  void onPickFile(
                    e.currentTarget.files?.[0] ?? null,
                    setShippingFile,
                    setShippingPreview,
                    setShippingProofUrl,
                    shippingUploadId,
                  )
                }
                disabled={submitting}
              />
              {shippingPreview ? (
                <div className="overflow-hidden rounded-[1.5rem] border border-border bg-background/60">
                  <img
                    src={shippingPreview}
                    alt="运费截图预览"
                    className="h-auto w-full object-contain"
                  />
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            已选择 {selectedItems.reduce((sum, item) => sum + item.quantity, 0)} 件商品
          </p>
          <Button
            type="button"
            variant="primary"
            size="lg"
            onClick={() => void submit()}
            disabled={submitting}
          >
            {submitting ? '提交中…' : '提交排发申请'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
