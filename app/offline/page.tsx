import Link from 'next/link';

import { buttonVariants } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';

export default function OfflinePage() {
  return (
    <main className="min-h-dvh px-4 py-12 sm:py-16">
      <div className="mx-auto max-w-lg">
        <Card>
          <CardHeader>
            <CardTitle>当前处于离线状态</CardTitle>
            <CardDescription>网络恢复后可继续访问完整功能。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>你仍然可以打开已缓存的页面和资源。</p>
            <Link href="/" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
              返回首页
            </Link>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

