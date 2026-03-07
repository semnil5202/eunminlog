'use client';

import { Suspense, useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';

import { useRouter, useSearchParams } from 'next/navigation';

import SearchFilter from '@/shared/components/filter/SearchFilter';
import Pagination from '@/shared/components/pagination/Pagination';
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

type SortKey = 'views' | 'recommendations' | 'comments';

type FilterFormValues = {
  from: string;
  to: string;
  query: string;
};

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'views', label: '조회수 많은 순' },
  { value: 'recommendations', label: '추천수 많은 순' },
  { value: 'comments', label: '댓글수 많은 순' },
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

export default function MetricsPage() {
  return (
    <Suspense>
      <MetricsContent />
    </Suspense>
  );
}

function MetricsContent() {
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

  const [sortBy, setSortBy] = useState<SortKey>((searchParams.get('sort') as SortKey) || 'views');
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);

  const buildQueryString = useCallback((filter: FilterFormValues, sort: SortKey, p: number) => {
    const params = new URLSearchParams();
    if (p > 1) params.set('page', String(p));
    if (filter.from) params.set('from', filter.from);
    if (filter.to) params.set('to', filter.to);
    if (filter.query) params.set('q', filter.query);
    if (sort !== 'views') params.set('sort', sort);
    const qs = params.toString();
    return qs ? `/?${qs}` : '/';
  }, []);

  const handleSearch = () => {
    const current = getValues();
    setPage(1);
    router.replace(buildQueryString(current, sortBy, 1), { scroll: false });
  };

  const handleSortChange = (value: string) => {
    const newSort = value as SortKey;
    setSortBy(newSort);
    setPage(1);
    router.replace(buildQueryString(getValues(), newSort, 1), { scroll: false });
  };

  const handlePageChange = (p: number) => {
    setPage(p);
    router.replace(buildQueryString(getValues(), sortBy, p), { scroll: false });
  };

  // TODO: GA4 연동 후 실제 데이터로 교체
  const totalPages = 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold">게시글 조회수/추천수/댓글수</h1>
        <p className="mt-1 text-sm text-muted-foreground">게시글별 핵심 지표를 조회합니다.</p>
      </div>

      <SearchFilter onSearch={handleSearch}>
        <SearchFilter.DateRange registerFrom={register('from')} registerTo={register('to')} />
        <SearchFilter.Query register={register('query')} placeholder="게시글 제목 검색" />
      </SearchFilter>

      <div>
        <div className="mb-3 flex items-center justify-end">
          <Select value={sortBy} onValueChange={handleSortChange}>
            <SelectTrigger className="w-[180px] max-md:h-8 max-md:w-[150px] max-md:text-xs">
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
                <TableHead className="w-[50%] font-bold text-white">게시글 제목</TableHead>
                <TableHead className="text-center font-bold text-white">조회수</TableHead>
                <TableHead className="text-center font-bold text-white">추천수</TableHead>
                <TableHead className="text-center font-bold text-white">댓글수</TableHead>
                <TableHead className="text-center font-bold text-white">발행일</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  GA4 연동 후 데이터가 표시됩니다.
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />
      </div>
    </div>
  );
}
