'use client';

import { Suspense, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';

import { useRouter, useSearchParams } from 'next/navigation';
import { Plus } from 'lucide-react';

import SearchFilter from '@/shared/components/filter/SearchFilter';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { CATEGORY_OPTIONS } from '@/features/post-editor/constants/category';

import type { Category, SubCategory } from '@/shared/types/post';

type QueryFormValues = {
  query: string;
};

type SubCategoryRow = {
  category: Category;
  categoryLabel: string;
  subCategory: SubCategory;
  subCategoryLabel: string;
  postCount: number;
  isMultilingual: boolean;
  createdAt: string;
};

const MOCK_DATA: SubCategoryRow[] = [
  {
    category: 'delicious',
    categoryLabel: '맛집',
    subCategory: 'korean',
    subCategoryLabel: '한식',
    postCount: 12,
    isMultilingual: true,
    createdAt: '2026-01-10',
  },
  {
    category: 'delicious',
    categoryLabel: '맛집',
    subCategory: 'western',
    subCategoryLabel: '양식',
    postCount: 8,
    isMultilingual: true,
    createdAt: '2026-01-10',
  },
  {
    category: 'delicious',
    categoryLabel: '맛집',
    subCategory: 'japanese',
    subCategoryLabel: '일식',
    postCount: 5,
    isMultilingual: true,
    createdAt: '2026-01-10',
  },
  {
    category: 'delicious',
    categoryLabel: '맛집',
    subCategory: 'pub',
    subCategoryLabel: '주점',
    postCount: 3,
    isMultilingual: false,
    createdAt: '2026-01-15',
  },
  {
    category: 'cafe',
    categoryLabel: '카페',
    subCategory: 'hotplace',
    subCategoryLabel: '핫플',
    postCount: 7,
    isMultilingual: true,
    createdAt: '2026-01-10',
  },
  {
    category: 'cafe',
    categoryLabel: '카페',
    subCategory: 'study',
    subCategoryLabel: '카공',
    postCount: 4,
    isMultilingual: true,
    createdAt: '2026-01-12',
  },
  {
    category: 'travel',
    categoryLabel: '여행',
    subCategory: 'domestic',
    subCategoryLabel: '국내',
    postCount: 10,
    isMultilingual: true,
    createdAt: '2026-01-10',
  },
  {
    category: 'travel',
    categoryLabel: '여행',
    subCategory: 'overseas',
    subCategoryLabel: '해외',
    postCount: 6,
    isMultilingual: true,
    createdAt: '2026-01-10',
  },
  {
    category: 'travel',
    categoryLabel: '여행',
    subCategory: 'accommodation',
    subCategoryLabel: '숙소',
    postCount: 2,
    isMultilingual: false,
    createdAt: '2026-01-20',
  },
];

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

  const handleSearch = () => {
    const current = getValues().query;
    setAppliedQuery(current);
    const params = new URLSearchParams();
    if (current) params.set('q', current);
    const qs = params.toString();
    router.replace(qs ? `/categories?${qs}` : '/categories', { scroll: false });
  };

  const groupedData = useMemo(() => {
    const filtered = appliedQuery
      ? MOCK_DATA.filter(
          (row) =>
            row.categoryLabel.includes(appliedQuery) || row.subCategoryLabel.includes(appliedQuery),
        )
      : MOCK_DATA;

    const groups: {
      category: Category;
      label: string;
      subCategories: SubCategoryRow[];
    }[] = [];

    for (const opt of CATEGORY_OPTIONS) {
      const subs = filtered.filter((r) => r.category === opt.value);
      if (subs.length > 0) {
        groups.push({ category: opt.value, label: opt.label, subCategories: subs });
      }
    }

    return groups;
  }, [appliedQuery]);

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
        <div className="mb-3">
          <Button>
            <Plus className="mr-1 h-4 w-4" />새 카테고리 생성
          </Button>
        </div>

        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow className="bg-primary-600 hover:bg-primary-600">
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
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    데이터가 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                groupedData.map((group) =>
                  group.subCategories.map((sub, i) => (
                    <TableRow key={`${group.category}-${sub.subCategory}`}>
                      <TableCell className="py-3 font-bold">{i === 0 ? group.label : ''}</TableCell>
                      <TableCell className="py-3">{sub.subCategoryLabel}</TableCell>
                      <TableCell className="py-3 text-center">{sub.postCount}</TableCell>
                      <TableCell className="py-3 text-center">
                        {sub.isMultilingual ? '지원' : '미지원'}
                      </TableCell>
                      <TableCell className="py-3 text-center">{sub.createdAt}</TableCell>
                    </TableRow>
                  )),
                )
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
