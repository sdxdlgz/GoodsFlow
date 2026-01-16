import Link from 'next/link';

import { NicknameSearch } from '@/components/member/NicknameSearch';
import { buttonVariants } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

export default function HomePage() {
  return (
    <main className="min-h-dvh px-4 py-12 sm:py-16">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">GoodsFlow</p>
            <h1 className="mt-2 font-serif text-3xl tracking-tight sm:text-5xl">
              团员查询与排发
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              输入昵称即可查询订单、查看已到货商品，并提交排发申请或追踪物流状态。
            </p>
            <nav className="mt-5 flex flex-wrap gap-2">
              <Link href="/orders" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
                订单列表
              </Link>
              <Link
                href="/shipment"
                className={buttonVariants({ variant: 'outline', size: 'sm' })}
              >
                排发申请
              </Link>
              <Link
                href="/shipment/status"
                className={buttonVariants({ variant: 'outline', size: 'sm' })}
              >
                物流查询
              </Link>
              <Link href="/admin" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
                团长管理
              </Link>
            </nav>
          </div>
          <ThemeToggle />
        </header>

        <section className="mt-10 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <NicknameSearch />
          <Card className="transition-all duration-300 hover:-translate-y-1 hover:shadow-soft">
            <CardHeader>
              <CardTitle>使用提示</CardTitle>
              <CardDescription>更快完成查询与提交。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
              <p>1) 在左侧输入昵称，系统会自动查询（防抖 300ms）。</p>
              <p>2) 订单列表按期数分组展示，并标注到货与排发状态。</p>
              <p>3) 排发申请需要填写地址，并上传付款/运费截图。</p>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}

