'use client';

import * as React from 'react';

import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';

type AdminAuthProps = {
  slug: string;
  children: React.ReactNode;
};

export function AdminAuth({ slug, children }: AdminAuthProps) {
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [isVerifying, setIsVerifying] = React.useState(false);

  React.useEffect(() => {
    const stored = localStorage.getItem(`admin_auth_${slug}`);
    if (stored) {
      const { expiry } = JSON.parse(stored);
      if (expiry > Date.now()) {
        setIsAuthenticated(true);
      } else {
        localStorage.removeItem(`admin_auth_${slug}`);
      }
    }
    setIsLoading(false);
  }, [slug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsVerifying(true);

    try {
      const res = await fetch(`/api/groups/${slug}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || '验证失败');
        return;
      }

      localStorage.setItem(
        `admin_auth_${slug}`,
        JSON.stringify({ expiry: Date.now() + 24 * 60 * 60 * 1000 })
      );
      setIsAuthenticated(true);
    } catch {
      setError('网络错误，请重试');
    } finally {
      setIsVerifying(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-muted-foreground">加载中...</p>
      </div>
    );
  }

  if (isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-[50vh] items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>团长验证</CardTitle>
          <CardDescription>请输入管理密码以访问后台</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="password"
              placeholder="管理密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" className="w-full" disabled={isVerifying || !password}>
              {isVerifying ? '验证中...' : '确认'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
