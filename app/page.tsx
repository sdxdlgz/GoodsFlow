import Link from 'next/link';

import { buttonVariants } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { listGroups } from '@/lib/group';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const groups = await listGroups();

  return (
    <main className="min-h-dvh px-4 py-12 sm:py-16">
      <div className="mx-auto max-w-4xl">
        <header className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">GoodsFlow</p>
            <h1 className="mt-2 font-serif text-3xl tracking-tight sm:text-5xl">
              选择团购群组
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              选择你所在的团购群组，或创建一个新的群组。
            </p>
          </div>
          <ThemeToggle />
        </header>

        <section className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => (
            <Link key={group.id} href={`/g/${group.slug}`} className="block">
              <Card className="h-full transition-all duration-300 hover:-translate-y-1 hover:shadow-soft">
                <CardHeader>
                  <CardTitle>{group.name}</CardTitle>
                  <CardDescription>/{group.slug}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    创建于 {new Date(group.createdAt).toLocaleDateString('zh-CN')}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}

          <Link href="/new" className="block">
            <Card className="flex h-full min-h-[140px] items-center justify-center border-dashed transition-all duration-300 hover:-translate-y-1 hover:shadow-soft">
              <CardContent className="text-center">
                <p className="text-2xl">+</p>
                <p className="mt-2 text-sm text-muted-foreground">创建新团</p>
              </CardContent>
            </Card>
          </Link>
        </section>

        {groups.length === 0 && (
          <p className="mt-8 text-center text-muted-foreground">
            还没有任何群组，点击上方卡片创建第一个团购群组。
          </p>
        )}
      </div>
    </main>
  );
}
