'use client';

import type { ReactNode } from 'react';

import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import AppSidebar from '@/shared/components/layout/AppSidebar';

export function SidebarLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <main className="p-8">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
