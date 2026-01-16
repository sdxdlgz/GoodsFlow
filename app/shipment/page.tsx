import Link from 'next/link';

import { NicknameSearch } from '@/components/member/NicknameSearch';
import { ShipmentForm } from '@/components/member/ShipmentForm';
import { buttonVariants } from '@/components/ui/Button';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

export const dynamic = 'force-dynamic';

export default function ShipmentPage({
  searchParams,
}: {
  searchParams?: { nickname?: string | string[] };
}) {
  const nickname =
    typeof searchParams?.nickname === 'string' ? searchParams.nickname.trim() : '';

  return (
    <main className="min-h-dvh px-4 py-12 sm:py-16">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">GoodsFlow</p>
            <h1 className="mt-2 font-serif text-3xl tracking-tight sm:text-4xl">排发申请</h1>
            <nav className="mt-5 flex flex-wrap gap-2">
              <Link href="/" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
                首页
              </Link>
              <Link
                href="/orders"
                className={buttonVariants({ variant: 'outline', size: 'sm' })}
              >
                订单列表
              </Link>
              <Link
                href="/shipment/status"
                className={buttonVariants({ variant: 'outline', size: 'sm' })}
              >
                物流查询
              </Link>
            </nav>
          </div>
          <ThemeToggle />
        </header>

        <div className="mt-10 space-y-6">
          {nickname ? <ShipmentForm nickname={nickname} /> : <NicknameSearch />}
        </div>
      </div>
    </main>
  );
}

