import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import './globals.css';
import { SITE_NAME_EN } from '@eunminlog/config/site';

import { Toaster } from 'sonner';

import { SidebarLayout } from './sidebar-layout';

export const metadata: Metadata = {
  title: `${SITE_NAME_EN} admin`,
  description: `${SITE_NAME_EN} 관리자 페이지`,
  robots: 'noindex, nofollow',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className="font-pretendard antialiased" suppressHydrationWarning>
        <SidebarLayout>{children}</SidebarLayout>
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
