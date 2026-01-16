import Link from 'next/link';

import { NicknameSearch } from '@/components/member/NicknameSearch';
import { ShipmentForm } from '@/components/member/ShipmentForm';
import { buttonVariants } from '@/components/ui/Button';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ nickname?: string | string[] }>;
};

export default async function ShipmentPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;
  const nickname =
    typeof resolvedSearchParams?.nickname === 'string' ? resolvedSearchParams.nickname.trim() : '';

  return (
    <main className="px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-6xl">
        <div className="min-w-0">
          <h1 className="font-serif text-2xl tracking-tight sm:text-4xl">排发申请</h1>
          <nav className="mt-5 flex flex-wrap gap-2">
            <Link href={`/g/${slug}`} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
              首页
            </Link>
            <Link
              href={`/g/${slug}/orders`}
              className={buttonVariants({ variant: 'outline', size: 'sm' })}
            >
              订单列表
            </Link>
            <Link
              href={`/g/${slug}/shipment/status`}
              className={buttonVariants({ variant: 'outline', size: 'sm' })}
            >
              物流查询
            </Link>
          </nav>
        </div>

        <div className="mt-10 space-y-6">
          {nickname ? (
            <ShipmentForm nickname={nickname} groupSlug={slug} />
          ) : (
            <NicknameSearch groupSlug={slug} />
          )}
        </div>
      </div>
    </main>
  );
}
