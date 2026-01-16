import Link from 'next/link';

import { buttonVariants } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';

export default function AdminHomePage() {
  return (
    <div className="space-y-10">
      <section>
        <h2 className="font-serif text-2xl tracking-tight sm:text-3xl">管理工作台</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          按顺序完成：导入 Excel → 标记到货 → 审核排发（查看截图 / 地址 / 录入单号）。
        </p>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        <Card className="transition-all duration-300 hover:-translate-y-1 hover:shadow-soft">
          <CardHeader>
            <CardTitle>Excel 导入</CardTitle>
            <CardDescription>拖拽上传汇总表，生成本期订单与商品。</CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/admin/import"
              className={buttonVariants({ variant: 'primary', size: 'md' })}
            >
              进入导入
            </Link>
          </CardContent>
        </Card>

        <Card className="transition-all duration-300 hover:-translate-y-1 hover:shadow-soft">
          <CardHeader>
            <CardTitle>到货管理</CardTitle>
            <CardDescription>批量勾选商品，快速标记到货状态。</CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/admin/arrival"
              className={buttonVariants({ variant: 'secondary', size: 'md' })}
            >
              管理到货
            </Link>
          </CardContent>
        </Card>

        <Card className="transition-all duration-300 hover:-translate-y-1 hover:shadow-soft">
          <CardHeader>
            <CardTitle>排发审核</CardTitle>
            <CardDescription>查看截图与地址，批准/拒绝并录入单号。</CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/admin/requests"
              className={buttonVariants({ variant: 'outline', size: 'md' })}
            >
              查看申请
            </Link>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

