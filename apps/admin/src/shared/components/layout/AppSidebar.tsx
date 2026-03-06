'use client';

import type { ComponentType } from 'react';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { BarChart3, ChevronDown, FileEdit, HandCoins, LogOut } from 'lucide-react';

import { getSupabase } from '@/shared/lib/supabase';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

type NavChild = {
  label: string;
  href: string | null;
};

type NavGroup = {
  label: string;
  icon: ComponentType<{ className?: string }>;
  children: NavChild[];
};

const NAV_ITEMS: NavGroup[] = [
  {
    label: '핵심 지표',
    icon: BarChart3,
    children: [
      { label: '게시글 조회수/추천수/댓글수', href: '/' },
      { label: '광고 지표', href: null },
    ],
  },
  {
    label: '게시글 관리',
    icon: FileEdit,
    children: [
      { label: '카테고리 생성/수정/삭제', href: '/categories' },
      { label: '게시글 작성/수정/삭제', href: '/posts' },
      { label: '댓글 수정/삭제', href: null },
      { label: '임시저장 글', href: '/drafts' },
    ],
  },
  {
    label: '협찬 관리',
    icon: HandCoins,
    children: [{ label: '협찬 조회', href: null }],
  },
];

export default function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = getSupabase();
    await supabase.auth.signOut();
    router.replace('/login');
  };

  return (
    <Sidebar>
      <SidebarHeader className="px-4 py-4 pl-6">
        <Link href="/" className="text-title1 font-bold text-primary-600">
          은민로그
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup className="px-4">
          <SidebarGroupLabel className="sr-only">메뉴</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-2">
              {NAV_ITEMS.map((group) => (
                <Collapsible key={group.label} defaultOpen>
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton className="cursor-pointer">
                        <group.icon className="h-4 w-4" />
                        <span className="font-bold">{group.label}</span>
                        <ChevronDown className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {group.children.map((child) => (
                          <SidebarMenuSubItem key={child.label}>
                            {child.href ? (
                              <SidebarMenuSubButton
                                asChild
                                isActive={
                                  child.href === '/'
                                    ? pathname === '/'
                                    : pathname.startsWith(child.href)
                                }
                              >
                                <Link href={child.href}>{child.label}</Link>
                              </SidebarMenuSubButton>
                            ) : (
                              <SidebarMenuSubButton className="cursor-not-allowed opacity-50">
                                {child.label}
                              </SidebarMenuSubButton>
                            )}
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="px-4 py-4">
        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
          로그아웃
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}
