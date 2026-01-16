'use client';

import * as React from 'react';

import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

function isStandalone() {
  if (typeof window === 'undefined') return false;
  const standaloneMatch = window.matchMedia?.('(display-mode: standalone)')?.matches ?? false;
  const iosStandalone = (window.navigator as any)?.standalone ?? false;
  return Boolean(standaloneMatch || iosStandalone);
}

export function InstallPrompt({ className }: { className?: string }) {
  const [promptEvent, setPromptEvent] = React.useState<BeforeInstallPromptEvent | null>(null);
  const [hidden, setHidden] = React.useState(false);

  React.useEffect(() => {
    if (isStandalone()) return;

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
    };

    const onAppInstalled = () => {
      setHidden(true);
      setPromptEvent(null);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  const onInstall = React.useCallback(async () => {
    if (!promptEvent) return;
    try {
      await promptEvent.prompt();
      await promptEvent.userChoice;
    } finally {
      setHidden(true);
      setPromptEvent(null);
    }
  }, [promptEvent]);

  if (hidden || !promptEvent) return null;

  return (
    <div
      role="region"
      aria-label="Install app prompt"
      className={cn(
        [
          'fixed inset-x-4 bottom-4 z-[55]',
          'rounded-[1.5rem] border border-border bg-background/90 px-5 py-4 shadow-soft backdrop-blur-sm',
          'flex items-center justify-between gap-4',
        ].join(' '),
        className,
      )}
    >
      <div className="min-w-0">
        <p className="font-medium">安装 GoodsFlow</p>
        <p className="mt-1 text-sm text-muted-foreground">添加到主屏幕，离线也能打开。</p>
      </div>
      <Button type="button" variant="primary" size="sm" onClick={() => void onInstall()}>
        安装
      </Button>
    </div>
  );
}

