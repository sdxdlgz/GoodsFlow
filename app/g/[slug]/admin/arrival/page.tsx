import Link from 'next/link';

import { AdminAuth } from '@/components/admin/AdminAuth';
import { ArrivalManager } from '@/components/admin/ArrivalManager';
import { buttonVariants } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { getGroupBySlug } from '@/lib/group';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function AdminArrivalPage({ params }: PageProps) {
  const { slug } = await params;
  const group = await getGroupBySlug(slug);

  if (!group) {
    return <div>Group not found</div>;
  }

  const period = await prisma.period.findFirst({
    where: { groupId: group.id },
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
      <AdminAuth slug={slug}>
        <main className="px-4 py-8 sm:py-12">
          <div className="mx-auto max-w-4xl">
            <Card>
              <CardHeader>
                <CardTitle>到货管理</CardTitle>
                <CardDescription>当前还没有可管理的数据，请先导入 Excel。</CardDescription>
              </CardHeader>
              <CardContent>
                <Link
                  href={`/g/${slug}/admin/import`}
                  className={buttonVariants({ variant: 'primary', size: 'md' })}
                >
                  去导入
                </Link>
              </CardContent>
            </Card>
          </div>
        </main>
      </AdminAuth>
    );
  }

  return (
    <AdminAuth slug={slug}>
      <main className="px-4 py-8 sm:py-12">
        <div className="mx-auto max-w-4xl">
          <ArrivalManager
            groupSlug={slug}
            periodName={period.name}
            initialItems={period.productTypes.map((p) => ({
              id: p.id,
              name: p.name,
              unitPrice: p.unitPrice,
              arrived: p.arrived,
              arrivedAt: p.arrivedAt ? p.arrivedAt.toISOString() : null,
            }))}
          />
        </div>
      </main>
    </AdminAuth>
  );
}
