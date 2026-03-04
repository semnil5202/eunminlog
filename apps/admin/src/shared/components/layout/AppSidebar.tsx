'use client';

import type { ComponentType } from 'react';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  ChevronRight,
  FileEdit,
  FolderTree,
  HandCoins,
  LogOut,
  MessageSquare,
} from 'lucide-react';
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

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
    label: '에디터',
    icon: FileEdit,
    children: [
      { label: '새 게시글 작성', href: '/posts/new' },
      { label: '게시글 목록', href: '/dashboard' },
    ],
  },
  {
    label: '카테고리',
    icon: FolderTree,
    children: [
      { label: '카테고리 생성', href: null },
      { label: '카테고리 수정', href: null },
    ],
  },
  {
    label: '부가기능 관리',
    icon: MessageSquare,
    children: [
      { label: '게시글 댓글 조회/삭제', href: null },
      { label: '추천수 관리', href: null },
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

  const isGroupActive = (group: NavGroup) =>
    group.children.some((child) => child.href && pathname === child.href);

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
                <Collapsible key={group.label} defaultOpen={isGroupActive(group) || group.label === '핵심 지표'}>
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton>
                        <group.icon className="h-4 w-4" />
                        <span className="font-bold">{group.label}</span>
                        <ChevronRight className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {group.children.map((child) => (
                          <SidebarMenuSubItem key={child.label}>
                            {child.href ? (
                              <SidebarMenuSubButton asChild isActive={pathname === child.href}>
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
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
          로그아웃
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}
