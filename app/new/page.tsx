'use client';

import { useRouter } from 'next/navigation';
import * as React from 'react';

import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

export default function NewGroupPage() {
  const router = useRouter();
  const [name, setName] = React.useState('');
  const [slug, setSlug] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleNameChange = (value: string) => {
    setName(value);
    const autoSlug = value
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
      .replace(/^-|-$/g, '');
    setSlug(autoSlug);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, slug, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || '创建失败');
        return;
      }

      const group = await res.json();
      localStorage.setItem(
        `admin_auth_${group.slug}`,
        JSON.stringify({ expiry: Date.now() + 24 * 60 * 60 * 1000 })
      );
      router.push(`/g/${group.slug}/admin`);
    } catch {
      setError('网络错误，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-dvh px-4 py-12 sm:py-16">
      <div className="mx-auto max-w-md">
        <header className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">GoodsFlow</p>
            <h1 className="mt-2 font-serif text-2xl tracking-tight sm:text-3xl">创建新团</h1>
          </div>
          <ThemeToggle />
        </header>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>团购信息</CardTitle>
            <CardDescription>填写基本信息创建你的团购群组</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">团名称</label>
                <Input
                  placeholder="例如：XX谷子团"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">访问路径</label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">/g/</span>
                  <Input
                    placeholder="xx-guzi"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    required
                  />
                </div>
                <p className="text-xs text-muted-foreground">只能包含小写字母、数字和连字符</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">管理密码</label>
                <Input
                  type="password"
                  placeholder="至少4位"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={4}
                  required
                />
                <p className="text-xs text-muted-foreground">用于访问团长管理后台</p>
              </div>

              {error && <p className="text-sm text-red-500">{error}</p>}

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/')}
                  disabled={isSubmitting}
                >
                  取消
                </Button>
                <Button type="submit" className="flex-1" disabled={isSubmitting || !name || !slug || !password}>
                  {isSubmitting ? '创建中...' : '创建团购'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
