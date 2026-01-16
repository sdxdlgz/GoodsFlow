import Link from 'next/link';

import { ArrivalManager } from '@/components/admin/ArrivalManager';
import { buttonVariants } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function AdminArrivalPage() {
  const period = await prisma.period.findFirst({
    orderBy: { createdAt: 'desc' },
    select: {
      name: true,
      productTypes: {
        orderBy: { name: 'asc' },
        select: { id: true, name: true, unitPrice: true, arrived: true, arrivedAt: true },
      },
    },
  });

  if (!period) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>到货管理</CardTitle>
          <CardDescription>当前还没有可管理的数据，请先导入 Excel。</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/admin/import" className={buttonVariants({ variant: 'primary', size: 'md' })}>
            去导入
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <ArrivalManager
      periodName={period.name}
      initialItems={period.productTypes.map((p) => ({
        id: p.id,
        name: p.name,
        unitPrice: p.unitPrice,
        arrived: p.arrived,
        arrivedAt: p.arrivedAt ? p.arrivedAt.toISOString() : null,
      }))}
    />
  );
}

