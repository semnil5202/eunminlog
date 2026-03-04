import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import './globals.css';
import { SITE_NAME_EN } from '@eunminlog/config/site';

export const metadata: Metadata = {
  title: `${SITE_NAME_EN} admin`,
  description: `${SITE_NAME_EN} 관리자 페이지`,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className="font-pretendard antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
