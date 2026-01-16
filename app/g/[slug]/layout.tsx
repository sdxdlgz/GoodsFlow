import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { getGroupBySlug } from '@/lib/group';

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
};

export default async function GroupLayout({ children, params }: LayoutProps) {
  const { slug } = await params;
  const group = await getGroupBySlug(slug);

  if (!group) {
    notFound();
  }

  return (
    <div className="min-h-dvh">
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href={`/g/${slug}`} className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">GoodsFlow</span>
            <span className="text-muted-foreground">/</span>
            <span className="font-medium">{group.name}</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
              切换团
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
