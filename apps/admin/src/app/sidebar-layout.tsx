'use client';

import type { ReactNode } from 'react';

import { Menu } from 'lucide-react';

import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import AppSidebar from '@/shared/components/layout/AppSidebar';

export function SidebarLayout({ children }: { children: ReactNode }) {
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
