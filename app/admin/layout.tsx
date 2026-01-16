import Link from 'next/link';

import { buttonVariants } from '@/components/ui/Button';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

export const dynamic = 'force-dynamic';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh px-4 py-12 sm:py-16">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">GoodsFlow</p>
            <h1 className="mt-2 font-serif text-3xl tracking-tight sm:text-4xl">团长管理</h1>
            <nav className="mt-5 flex flex-wrap gap-2">
              <Link href="/admin" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
                首页
              </Link>
              <Link
                href="/admin/import"
                className={buttonVariants({ variant: 'outline', size: 'sm' })}
              >
                Excel 导入
              </Link>
              <Link
                href="/admin/arrival"
                className={buttonVariants({ variant: 'outline', size: 'sm' })}
              >
                到货管理
              </Link>
              <Link
                href="/admin/requests"
                className={buttonVariants({ variant: 'outline', size: 'sm' })}
              >
                排发审核
              </Link>
              <Link href="/" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
                返回首页
              </Link>
            </nav>
          </div>
          <ThemeToggle />
        </header>

        <main className="mt-10">{children}</main>
      </div>
    </div>
  );
}

