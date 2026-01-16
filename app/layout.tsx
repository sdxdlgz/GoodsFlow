import type { Metadata } from 'next';

import { InstallPrompt } from '@/components/InstallPrompt';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { ToastProvider } from '@/components/ui/Toast';
import { fraunces, nunito } from '@/lib/fonts';

import './globals.css';

export const metadata: Metadata = {
  title: 'GoodsFlow',
  description: '轻量、自然的库存与流水管理。',
  applicationName: 'GoodsFlow',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="zh-CN"
      suppressHydrationWarning
      className={`${fraunces.variable} ${nunito.variable}`}
    >
      <body className="min-h-dvh bg-background text-foreground font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <ToastProvider>
            {children}
            <InstallPrompt />
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
