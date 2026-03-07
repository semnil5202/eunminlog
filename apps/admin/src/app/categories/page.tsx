'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import SearchFilter from '@/shared/components/filter/SearchFilter';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import {
  deleteCategories,
  fetchCategories,
  type CategoryWithCount,
} from '@/features/category-management/api/actions';

type QueryFormValues = {
  query: string;
};

type ParentRow = {
  id: string;
  slug: string;
  name: string;
  postCount: number;
  createdAt: string;
};

type ChildRow = {
  id: string;
  parentSlug: string;
  slug: string;
  name: string;
  postCount: number;
  isMultilingual: boolean;
  createdAt: string;
};

function buildRows(categories: CategoryWithCount[]) {
  const parents: ParentRow[] = [];
  const children: ChildRow[] = [];
  const parentSlugMap = new Map<string, string>();

  for (const c of categories) {
    if (!c.parent_id) {
      parentSlugMap.set(c.id, c.slug);
      parents.push({
        id: c.id,
        slug: c.slug,
        name: c.name,
        postCount: c.post_count,
        createdAt: c.created_at.slice(0, 10),
      });
    }
  }

  for (const c of categories) {
    if (c.parent_id) {
      children.push({
        id: c.id,
        parentSlug: parentSlugMap.get(c.parent_id) ?? '',
        slug: c.slug,
        name: c.name,
        postCount: c.post_count,
        isMultilingual: c.is_multilingual,
        createdAt: c.created_at.slice(0, 10),
      });
    }
  }

  return { parents, children };
}

function truncateTitle(title: string, max = 30) {
  return title.length > max ? title.slice(0, max) + '...' : title;
}

export default function CategoriesPage() {
  return (
    <Suspense>
      <CategoriesContent />
    </Suspense>
  );
}

function CategoriesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const { register, getValues } = useForm<QueryFormValues>({
    defaultValues: {
      query: searchParams.get('q') || '',
    },
  });

  const [appliedQuery, setAppliedQuery] = useState(getValues().query);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [parents, setParents] = useState<ParentRow[]>([]);
  const [children, setChildren] = useState<ChildRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadCategories = useCallback(async () => {
    try {
      const data = await fetchCategories();
      const rows = buildRows(data);
      setParents(rows.parents);
      setChildren(rows.children);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '카테고리 조회에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const handleSearch = () => {
    const current = getValues().query;
    setAppliedQuery(current);
    setSelectedIds(new Set());
    const params = new URLSearchParams();
    if (current) params.set('q', current);
    const qs = params.toString();
    router.replace(qs ? `/categories?${qs}` : '/categories', { scroll: false });
  };

  const groupedData = useMemo(() => {
    const groups: { parent: ParentRow; children: ChildRow[] }[] = [];

    for (const p of parents) {
      if (appliedQuery && !p.name.includes(appliedQuery)) {
        const subs = children.filter(
          (c) => c.parentSlug === p.slug && c.name.includes(appliedQuery),
        );
        if (subs.length > 0) groups.push({ parent: p, children: subs });
      } else {
        const subs = children.filter((c) => c.parentSlug === p.slug);
        groups.push({ parent: p, children: subs });
      }
    }

    return groups;
  }, [appliedQuery, parents, children]);

  const selectableItems = useMemo(() => {
    const items: { id: string }[] = [];
    for (const g of groupedData) {
      if (g.children.length === 0 && g.parent.postCount === 0) {
        items.push({ id: g.parent.id });
      }
      for (const c of g.children) {
        if (c.postCount === 0) items.push({ id: c.id });
      }
    }
    return items;
  }, [groupedData]);

  const isAllSelected =
    selectableItems.length > 0 && selectableItems.every((item) => selectedIds.has(item.id));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(selectableItems.map((item) => item.id)));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedNames = [
    ...parents.filter((p) => selectedIds.has(p.id)).map((p) => truncateTitle(p.name)),
    ...children.filter((c) => selectedIds.has(c.id)).map((c) => truncateTitle(c.name)),
  ];

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await deleteCategories(Array.from(selectedIds));
      if (result.success) {
        toast.success(`${result.deletedCount}개의 카테고리가 삭제되었습니다.`);
        setSelectedIds(new Set());
        setIsDeleteDialogOpen(false);
        await loadCategories();
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '카테고리 삭제에 실패했습니다.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center text-muted-foreground">
        카테고리를 불러오는 중...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold">카테고리 생성/수정/삭제</h1>
        <p className="mt-1 text-sm text-muted-foreground">카테고리를 관리합니다.</p>
      </div>

      <SearchFilter onSearch={handleSearch}>
        <SearchFilter.Query register={register('query')} placeholder="카테고리명 검색" />
      </SearchFilter>

      <div>
        <div className="mb-3 flex items-center gap-2">
          <Button asChild className="max-md:h-9 max-md:px-3 max-md:text-xs">
            <Link href="/categories/new">
              <Plus className="mr-1 h-4 w-4 max-md:h-3.5 max-md:w-3.5" />새 카테고리 생성
            </Link>
          </Button>
          {selectedIds.size > 0 && (
            <Button variant="destructive" onClick={() => setIsDeleteDialogOpen(true)} className="max-md:h-8 max-md:px-3 max-md:text-xs">
              <Trash2 className="mr-1 h-4 w-4 max-md:h-3.5 max-md:w-3.5" />
              {selectedIds.size}개 삭제
            </Button>
          )}
        </div>

        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow className="bg-primary-600 hover:bg-primary-600">
                <TableHead className="w-[52px] px-4">
                  <Checkbox
                    checked={isAllSelected}
                    onCheckedChange={toggleSelectAll}
                    disabled={selectableItems.length === 0}
                    className="border-white"
                  />
                </TableHead>
                <TableHead className="w-[18%] font-bold text-white">대분류 카테고리명</TableHead>
                <TableHead className="w-[18%] font-bold text-white">소분류 카테고리명</TableHead>
                <TableHead className="text-center font-bold text-white">포함된 글</TableHead>
                <TableHead className="text-center font-bold text-white">다국어 지원 여부</TableHead>
                <TableHead className="text-center font-bold text-white">생성일</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groupedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    데이터가 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                groupedData.flatMap((group) => [
                  <TableRow key={group.parent.id} className="bg-muted/50">
                    <TableCell className="px-4 py-3">
                      {group.children.length > 0 ? (
                        <Checkbox disabled title="하위 소분류가 존재하여 삭제할 수 없습니다" />
                      ) : (
                        <Checkbox
                          checked={selectedIds.has(group.parent.id)}
                          onCheckedChange={() => toggleSelect(group.parent.id)}
                          disabled={group.parent.postCount > 0}
                          title={
                            group.parent.postCount > 0
                              ? '게시글이 포함되어 삭제할 수 없습니다'
                              : undefined
                          }
                        />
                      )}
                    </TableCell>
                    <TableCell className="py-3 font-medium">
                      <Link
                        href={`/categories/${group.parent.id}/edit`}
                        className="text-blue-600 underline"
                      >
                        {group.parent.name}
                      </Link>
                    </TableCell>
                    <TableCell />
                    <TableCell className="py-3 text-center">{group.parent.postCount}</TableCell>
                    <TableCell />
                    <TableCell className="py-3 text-center">{group.parent.createdAt}</TableCell>
                  </TableRow>,
                  ...group.children.map((child) => {
                    const canDelete = child.postCount === 0;
                    return (
                      <TableRow key={child.id}>
                        <TableCell className="px-4 py-3">
                          <Checkbox
                            checked={selectedIds.has(child.id)}
                            onCheckedChange={() => toggleSelect(child.id)}
                            disabled={!canDelete}
                            title={canDelete ? undefined : '게시글이 포함되어 삭제할 수 없습니다'}
                          />
                        </TableCell>
                        <TableCell />
                        <TableCell className="py-3">
                          <Link
                            href={`/categories/${child.id}/edit`}
                            className="text-blue-600 underline"
                          >
                            {child.name}
                          </Link>
                        </TableCell>
                        <TableCell className="py-3 text-center">{child.postCount}</TableCell>
                        <TableCell className="py-3 text-center">
                          {child.isMultilingual ? '지원' : '미지원'}
                        </TableCell>
                        <TableCell className="py-3 text-center">{child.createdAt}</TableCell>
                      </TableRow>
                    );
                  }),
                ])
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>카테고리 삭제</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="text-sm text-muted-foreground">
                정말 총 {selectedIds.size}개의 카테고리를 삭제하시겠습니까?
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {selectedNames.slice(0, 10).map((name, i) => (
                    <li key={i}>{name}</li>
                  ))}
                  {selectedNames.length > 10 && <li>... 외 {selectedNames.length - 10}개</li>}
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? '삭제 중...' : '삭제'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
