'use client';

import type { KeyboardEvent, ReactNode } from 'react';

import { Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export type DateRange = {
  from: string;
  to: string;
};

type SearchFilterProps = {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  onSearch: () => void;
  searchPlaceholder?: string;
  children?: ReactNode;
};

export default function SearchFilter({
  dateRange,
  onDateRangeChange,
  searchQuery,
  onSearchQueryChange,
  onSearch,
  searchPlaceholder = '검색어 입력',
  children,
}: SearchFilterProps) {
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') onSearch();
  };

  return (
    <div className="space-y-3 rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-center gap-3 max-md:flex-col max-md:items-start">
        <span className="w-12 shrink-0 text-sm font-bold text-primary-600">기간</span>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="date"
            value={dateRange.from}
            onChange={(e) => onDateRangeChange({ ...dateRange, from: e.target.value })}
            className="w-[150px]"
          />
          <span className="text-muted-foreground">&rarr;</span>
          <Input
            type="date"
            value={dateRange.to}
            onChange={(e) => onDateRangeChange({ ...dateRange, to: e.target.value })}
            className="w-[150px]"
          />
        </div>
        {children && <div className="ml-auto flex items-center gap-2 max-md:ml-0">{children}</div>}
      </div>

      <div className="flex items-center gap-3 max-md:flex-col max-md:items-start">
        <span className="w-12 shrink-0 text-sm font-bold text-primary-600">검색어</span>
        <div className="flex flex-1 items-center gap-3">
          <Input
            type="text"
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full max-w-[330px]"
          />
          <Button onClick={onSearch}>
            <Search className="mr-1 h-4 w-4" />
            검색
          </Button>
        </div>
      </div>
    </div>
  );
}
