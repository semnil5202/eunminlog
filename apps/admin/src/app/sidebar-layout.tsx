'use client';

import type { ReactNode } from 'react';

import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';

import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import AppSidebar from '@/shared/components/layout/AppSidebar';

const NO_SIDEBAR_PATHS = ['/login'];

export function SidebarLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (NO_SIDEBAR_PATHS.includes(pathname)) {
    return <>{children}</>;
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-12 items-center px-8 md:hidden">
          <SidebarTrigger>
            <Menu className="h-5 w-5" />
          </SidebarTrigger>
        </header>
        <main className="px-8 pb-8 pt-6 md:pt-13">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
