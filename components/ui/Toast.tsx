'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

export type ToastVariant = 'success' | 'error' | 'info';

export type ToastOptions = {
  title?: string;
  message: string;
  variant?: ToastVariant;
  durationMs?: number;
};

type ToastRecord = ToastOptions & { id: string; variant: ToastVariant; durationMs: number };

type ToastContextValue = {
  toast: (options: ToastOptions) => void;
};

const ToastContext = React.createContext<ToastContextValue | null>(null);

function createId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastRecord[]>([]);

  const toast = React.useCallback((options: ToastOptions) => {
    const id = createId();
    const record: ToastRecord = {
      id,
      title: options.title,
      message: options.message,
      variant: options.variant ?? 'info',
      durationMs: options.durationMs ?? 4500,
    };

    setToasts((prev) => [...prev, record]);

    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, record.durationMs);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        aria-live="polite"
        className="fixed bottom-4 right-4 z-[60] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-3"
      >
        {toasts.map((t) => (
          <Toast
            key={t.id}
            variant={t.variant}
            title={t.title}
            message={t.message}
            onClose={() => setToasts((prev) => prev.filter((p) => p.id !== t.id))}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

export function Toast({
  variant,
  title,
  message,
  onClose,
}: {
  variant: ToastVariant;
  title?: string;
  message: string;
  onClose: () => void;
}) {
  const role = variant === 'error' ? 'alert' : 'status';

  return (
    <div
      role={role}
      className={cn(
        [
          'relative overflow-hidden rounded-[1.75rem_1.25rem_1.75rem_1.5rem] border border-border bg-background/90',
          'px-5 py-4 shadow-soft backdrop-blur-sm',
        ].join(' '),
        variant === 'success' && 'border-primary/30',
        variant === 'error' && 'border-destructive/40',
      )}
    >
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          {title ? <p className="font-medium">{title}</p> : null}
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{message}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Dismiss notification"
          className={cn(
            [
              'inline-flex h-9 w-9 items-center justify-center rounded-full',
              'border border-border bg-background/70 text-foreground',
              'transition-all duration-300 hover:bg-accent hover:scale-[1.02] active:scale-[0.98]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              'focus-visible:ring-offset-2 focus-visible:ring-offset-background',
            ].join(' '),
          )}
        >
          <span aria-hidden className="text-lg leading-none">
            ×
          </span>
        </button>
      </div>
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-x-0 bottom-0 h-1',
          variant === 'info' && 'bg-accent',
          variant === 'success' && 'bg-primary/60',
          variant === 'error' && 'bg-destructive/70',
        )}
      />
    </div>
  );
}

