'use client';

import { createContext, useContext, type KeyboardEvent, type ReactNode } from 'react';
import type { UseFormRegisterReturn } from 'react-hook-form';

import { Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const SearchFilterContext = createContext<{ onSearch: () => void }>({ onSearch: () => {} });

type DateRangeProps = {
  registerFrom: UseFormRegisterReturn;
  registerTo: UseFormRegisterReturn;
  children?: ReactNode;
};

function DateRange({ registerFrom, registerTo, children }: DateRangeProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 max-md:flex-col max-md:items-start max-md:gap-2">
      <span className="w-12 shrink-0 text-sm font-bold text-primary-600 max-md:text-xs">기간</span>
      <div className="flex flex-wrap items-center gap-2">
        <Input type="date" {...registerFrom} className="w-[150px] max-md:h-8 max-md:w-[120px] max-md:text-xs" />
        <span className="text-muted-foreground">&rarr;</span>
        <Input type="date" {...registerTo} className="w-[150px] max-md:h-8 max-md:w-[120px] max-md:text-xs" />
      </div>
      {children && <div className="ml-auto flex items-center gap-2 max-md:ml-0">{children}</div>}
    </div>
  );
}

type QueryProps = {
  register: UseFormRegisterReturn;
  placeholder?: string;
};

function Query({ register, placeholder = '검색어 입력' }: QueryProps) {
  const { onSearch } = useContext(SearchFilterContext);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') onSearch();
  };

  return (
    <div className="flex items-center gap-3 max-md:flex-col max-md:items-start max-md:gap-2">
      <span className="w-12 shrink-0 text-sm font-bold text-primary-600 max-md:text-xs">검색어</span>
      <div className="flex flex-1 items-center gap-3 max-md:gap-2">
        <Input
          type="text"
          placeholder={placeholder}
          {...register}
          onKeyDown={handleKeyDown}
          className="w-full max-w-[330px] max-md:h-8 max-md:text-xs"
        />
        <Button variant="outline" onClick={onSearch} className="max-md:h-8 max-md:px-2.5 max-md:text-xs">
          <Search className="mr-1 h-4 w-4 max-md:h-3.5 max-md:w-3.5" />
          검색
        </Button>
      </div>
    </div>
  );
}

type SearchFilterProps = {
  onSearch: () => void;
  children: ReactNode;
};

function SearchFilter({ onSearch, children }: SearchFilterProps) {
  return (
    <SearchFilterContext value={{ onSearch }}>
      <div className="space-y-3 rounded-lg border bg-card p-4 max-md:space-y-2 max-md:p-3">{children}</div>
    </SearchFilterContext>
  );
}

SearchFilter.DateRange = DateRange;
SearchFilter.Query = Query;

export default SearchFilter;
