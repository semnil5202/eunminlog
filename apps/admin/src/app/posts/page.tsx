'use client';

import { Suspense, useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus } from 'lucide-react';

import SearchFilter from '@/shared/components/filter/SearchFilter';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type SortKey = 'publishedAt' | 'updatedAt';

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'publishedAt', label: '최신 발행순' },
  { value: 'updatedAt', label: '최신 수정순' },
];

type FilterFormValues = {
  from: string;
  to: string;
  query: string;
};

type PostItem = {
  id: number;
  title: string;
  publishedAt: string;
  updatedAt: string;
};

const MOCK_DATA: PostItem[] = [
  {
    id: 1,
    title: '강남역 숨은 파스타 맛집 베스트 5',
    publishedAt: '2026-02-28',
    updatedAt: '2026-03-02',
  },
  {
    id: 2,
    title: '제주도 3박 4일 여행 코스 추천',
    publishedAt: '2026-02-25',
    updatedAt: '2026-02-27',
  },
  {
    id: 3,
    title: '홍대 감성 카페 투어',
    publishedAt: '2026-02-22',
    updatedAt: '2026-02-22',
  },
  {
    id: 4,
    title: '을지로 힙한 술집 모음',
    publishedAt: '2026-02-20',
    updatedAt: '2026-02-21',
  },
  {
    id: 5,
    title: '부산 해운대 맛집 리스트',
    publishedAt: '2026-02-18',
    updatedAt: '2026-02-19',
  },
  {
    id: 6,
    title: '성수동 브런치 카페 TOP 7',
    publishedAt: '2026-02-15',
    updatedAt: '2026-02-16',
  },
  {
    id: 7,
    title: '경주 당일치기 여행 코스',
    publishedAt: '2026-02-12',
    updatedAt: '2026-02-12',
  },
  {
    id: 8,
    title: '이태원 이색 레스토랑 추천',
    publishedAt: '2026-02-10',
    updatedAt: '2026-02-11',
  },
  {
    id: 9,
    title: '양양 서핑 스팟 & 카페',
    publishedAt: '2026-02-08',
    updatedAt: '2026-02-08',
  },
  {
    id: 10,
    title: '전주 한옥마을 먹거리 투어',
    publishedAt: '2026-02-05',
    updatedAt: '2026-02-06',
  },
];

function getDefaultDateRange() {
  const now = new Date();
  const monthAgo = new Date(now);
  monthAgo.setMonth(monthAgo.getMonth() - 1);
  return {
    from: monthAgo.toISOString().split('T')[0],
    to: now.toISOString().split('T')[0],
  };
}

export default function PostsPage() {
  return (
    <Suspense>
      <PostsContent />
    </Suspense>
  );
}

function PostsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const defaultRange = getDefaultDateRange();

  const { register, getValues } = useForm<FilterFormValues>({
    defaultValues: {
      from: searchParams.get('from') || defaultRange.from,
      to: searchParams.get('to') || defaultRange.to,
      query: searchParams.get('q') || '',
    },
  });

  const [appliedFilter, setAppliedFilter] = useState<FilterFormValues>(getValues());
  const [sortBy, setSortBy] = useState<SortKey>(
    (searchParams.get('sort') as SortKey) || 'publishedAt',
  );

  const updateQueryParams = useCallback(
    (filter: FilterFormValues, sort: SortKey) => {
      const params = new URLSearchParams();
      if (filter.from) params.set('from', filter.from);
      if (filter.to) params.set('to', filter.to);
      if (filter.query) params.set('q', filter.query);
      if (sort !== 'publishedAt') params.set('sort', sort);
      const qs = params.toString();
      router.replace(qs ? `/posts?${qs}` : '/posts', { scroll: false });
    },
    [router],
  );

  const handleSearch = () => {
    const current = getValues();
    setAppliedFilter(current);
    updateQueryParams(current, sortBy);
  };

  const handleSortChange = (value: string) => {
    const newSort = value as SortKey;
    setSortBy(newSort);
    updateQueryParams(appliedFilter, newSort);
  };

  const filteredData = MOCK_DATA.filter((post) => {
    if (appliedFilter.query) {
      return post.title.toLowerCase().includes(appliedFilter.query.toLowerCase());
    }
    return true;
  })
    .filter((post) => {
      if (appliedFilter.from && post.publishedAt < appliedFilter.from) return false;
      if (appliedFilter.to && post.publishedAt > appliedFilter.to) return false;
      return true;
    })
    .sort((a, b) => (a[sortBy] > b[sortBy] ? -1 : 1));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold">게시글 작성/수정/삭제</h1>
        <p className="mt-1 text-sm text-muted-foreground">게시글을 관리합니다.</p>
      </div>

      <SearchFilter
        registerFrom={register('from')}
        registerTo={register('to')}
        registerQuery={register('query')}
        onSearch={handleSearch}
        searchPlaceholder="게시글 제목 검색"
      />

      <div>
        <div className="mb-3 flex items-center justify-between">
          <Button asChild>
            <Link href="/posts/new">
              <Plus className="mr-1 h-4 w-4" />새 글 작성
            </Link>
          </Button>
          <Select value={sortBy} onValueChange={handleSortChange}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow className="bg-primary-600 hover:bg-primary-600">
                <TableHead className="w-[60%] font-bold text-white">게시글 제목</TableHead>
                <TableHead className="text-center font-bold text-white">발행일</TableHead>
                <TableHead className="text-center font-bold text-white">마지막 수정일</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                    데이터가 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                filteredData.map((post) => (
                  <TableRow key={post.id}>
                    <TableCell className="py-3 font-medium">{post.title}</TableCell>
                    <TableCell className="py-3 text-center">{post.publishedAt}</TableCell>
                    <TableCell className="py-3 text-center">{post.updatedAt}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
