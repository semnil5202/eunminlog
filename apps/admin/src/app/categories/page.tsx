'use client';

import { Suspense, useMemo, useState } from 'react';
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

import type { Category, SubCategory } from '@/shared/types/post';

type QueryFormValues = {
  query: string;
};

type CategoryRow = {
  category: Category;
  label: string;
  postCount: number;
  createdAt: string;
};

type SubCategoryRow = {
  category: Category;
  subCategory: SubCategory;
  subCategoryLabel: string;
  postCount: number;
  isMultilingual: boolean;
  createdAt: string;
};

const MOCK_CATEGORIES: CategoryRow[] = [
  { category: 'delicious', label: '맛집', postCount: 28, createdAt: '2026-01-05' },
  { category: 'cafe', label: '카페', postCount: 11, createdAt: '2026-01-05' },
  { category: 'travel', label: '여행', postCount: 18, createdAt: '2026-01-05' },
];

const MOCK_SUB_CATEGORIES: SubCategoryRow[] = [
  { category: 'delicious', subCategory: 'korean', subCategoryLabel: '한식', postCount: 12, isMultilingual: true, createdAt: '2026-01-10' },
  { category: 'delicious', subCategory: 'western', subCategoryLabel: '양식', postCount: 8, isMultilingual: true, createdAt: '2026-01-10' },
  { category: 'delicious', subCategory: 'japanese', subCategoryLabel: '일식', postCount: 5, isMultilingual: true, createdAt: '2026-01-10' },
  { category: 'delicious', subCategory: 'pub', subCategoryLabel: '주점', postCount: 0, isMultilingual: false, createdAt: '2026-01-15' },
  { category: 'cafe', subCategory: 'hotplace', subCategoryLabel: '핫플', postCount: 7, isMultilingual: true, createdAt: '2026-01-10' },
  { category: 'cafe', subCategory: 'study', subCategoryLabel: '카공', postCount: 4, isMultilingual: true, createdAt: '2026-01-12' },
  { category: 'travel', subCategory: 'domestic', subCategoryLabel: '국내', postCount: 10, isMultilingual: true, createdAt: '2026-01-10' },
  { category: 'travel', subCategory: 'overseas', subCategoryLabel: '해외', postCount: 6, isMultilingual: true, createdAt: '2026-01-10' },
  { category: 'travel', subCategory: 'accommodation', subCategoryLabel: '숙소', postCount: 0, isMultilingual: false, createdAt: '2026-01-20' },
];

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
  const [selectedSlugs, setSelectedSlugs] = useState<Set<string>>(new Set());
  const [deletedSlugs, setDeletedSlugs] = useState<Set<string>>(new Set());
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const handleSearch = () => {
    const current = getValues().query;
    setAppliedQuery(current);
    setSelectedSlugs(new Set());
    const params = new URLSearchParams();
    if (current) params.set('q', current);
    const qs = params.toString();
    router.replace(qs ? `/categories?${qs}` : '/categories', { scroll: false });
  };

  const groupedData = useMemo(() => {
    const groups: {
      category: CategoryRow;
      subCategories: SubCategoryRow[];
    }[] = [];

    for (const cat of MOCK_CATEGORIES) {
      if (appliedQuery && !cat.label.includes(appliedQuery)) {
        const subs = MOCK_SUB_CATEGORIES.filter(
          (r) =>
            r.category === cat.category &&
            r.subCategoryLabel.includes(appliedQuery) &&
            !deletedSlugs.has(r.subCategory),
        );
        if (subs.length > 0) groups.push({ category: cat, subCategories: subs });
      } else {
        const subs = MOCK_SUB_CATEGORIES.filter(
          (r) => r.category === cat.category && !deletedSlugs.has(r.subCategory),
        );
        if (subs.length > 0) groups.push({ category: cat, subCategories: subs });
      }
    }

    return groups;
  }, [appliedQuery, deletedSlugs]);

  const selectableSubs = useMemo(
    () => groupedData.flatMap((g) => g.subCategories).filter((s) => s.postCount === 0),
    [groupedData],
  );

  const isAllSelected =
    selectableSubs.length > 0 && selectableSubs.every((s) => selectedSlugs.has(s.subCategory));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedSlugs(new Set());
    } else {
      setSelectedSlugs(new Set(selectableSubs.map((s) => s.subCategory)));
    }
  };

  const toggleSelect = (slug: string) => {
    setSelectedSlugs((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  };

  const selectedNames = MOCK_SUB_CATEGORIES.filter((s) => selectedSlugs.has(s.subCategory)).map(
    (s) => truncateTitle(s.subCategoryLabel),
  );

  const handleDelete = () => {
    // TODO: deleteCategories(Array.from(selectedSlugs)) — DB 연동 시 활성화
    setDeletedSlugs((prev) => new Set([...prev, ...selectedSlugs]));
    toast.success(`${selectedSlugs.size}개의 카테고리가 삭제되었습니다.`);
    setSelectedSlugs(new Set());
    setIsDeleteDialogOpen(false);
  };

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
          <Button asChild>
            <Link href="/categories/new">
              <Plus className="mr-1 h-4 w-4" />새 카테고리 생성
            </Link>
          </Button>
          {selectedSlugs.size > 0 && (
            <Button variant="destructive" onClick={() => setIsDeleteDialogOpen(true)}>
              <Trash2 className="mr-1 h-4 w-4" />
              {selectedSlugs.size}개 삭제
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
                    disabled={selectableSubs.length === 0}
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
                  <TableRow key={group.category.category} className="bg-muted/50">
                    <TableCell className="px-4 py-3">
                      <Checkbox
                        disabled
                        title="하위 소분류가 존재하여 삭제할 수 없습니다"
                      />
                    </TableCell>
                    <TableCell className="py-3 font-bold">
                      <Link
                        href={`/categories/${group.category.category}/edit`}
                        className="text-blue-600 underline"
                      >
                        {group.category.label}
                      </Link>
                    </TableCell>
                    <TableCell />
                    <TableCell className="py-3 text-center">{group.category.postCount}</TableCell>
                    <TableCell />
                    <TableCell className="py-3 text-center">{group.category.createdAt}</TableCell>
                  </TableRow>,
                  ...group.subCategories.map((sub) => {
                    const canDelete = sub.postCount === 0;
                    return (
                      <TableRow key={`${group.category.category}-${sub.subCategory}`}>
                        <TableCell className="px-4 py-3">
                          <Checkbox
                            checked={selectedSlugs.has(sub.subCategory)}
                            onCheckedChange={() => toggleSelect(sub.subCategory)}
                            disabled={!canDelete}
                            title={canDelete ? undefined : '게시글이 포함되어 삭제할 수 없습니다'}
                          />
                        </TableCell>
                        <TableCell />
                        <TableCell className="py-3">
                          <Link
                            href={`/categories/${sub.subCategory}/edit`}
                            className="text-blue-600 underline"
                          >
                            {sub.subCategoryLabel}
                          </Link>
                        </TableCell>
                        <TableCell className="py-3 text-center">{sub.postCount}</TableCell>
                        <TableCell className="py-3 text-center">
                          {sub.isMultilingual ? '지원' : '미지원'}
                        </TableCell>
                        <TableCell className="py-3 text-center">{sub.createdAt}</TableCell>
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
                정말 총 {selectedSlugs.size}개의 카테고리를 삭제하시겠습니까?
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
            <AlertDialogAction variant="destructive" onClick={handleDelete}>
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
