'use client';

import { useState } from 'react';

import SearchFilter, { type DateRange } from '@/shared/components/filter/SearchFilter';
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

type PostMetric = {
  id: number;
  title: string;
  views: number;
  recommendations: number;
  comments: number;
  publishedAt: string;
};

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'views', label: '조회수 많은 순' },
  { value: 'recommendations', label: '추천수 많은 순' },
  { value: 'comments', label: '댓글수 많은 순' },
];

const MOCK_DATA: PostMetric[] = [
  { id: 1, title: '강남역 숨은 파스타 맛집 베스트 5', views: 2341, recommendations: 112, comments: 45, publishedAt: '2026-02-28' },
  { id: 2, title: '제주도 3박 4일 여행 코스 추천', views: 1892, recommendations: 89, comments: 34, publishedAt: '2026-02-25' },
  { id: 3, title: '홍대 감성 카페 투어', views: 1567, recommendations: 76, comments: 28, publishedAt: '2026-02-22' },
  { id: 4, title: '을지로 힙한 술집 모음', views: 1234, recommendations: 54, comments: 19, publishedAt: '2026-02-20' },
  { id: 5, title: '부산 해운대 맛집 리스트', views: 987, recommendations: 43, comments: 15, publishedAt: '2026-02-18' },
  { id: 6, title: '성수동 브런치 카페 TOP 7', views: 876, recommendations: 38, comments: 12, publishedAt: '2026-02-15' },
  { id: 7, title: '경주 당일치기 여행 코스', views: 765, recommendations: 31, comments: 9, publishedAt: '2026-02-12' },
  { id: 8, title: '이태원 이색 레스토랑 추천', views: 654, recommendations: 27, comments: 7, publishedAt: '2026-02-10' },
  { id: 9, title: '양양 서핑 스팟 & 카페', views: 543, recommendations: 22, comments: 5, publishedAt: '2026-02-08' },
  { id: 10, title: '전주 한옥마을 먹거리 투어', views: 432, recommendations: 18, comments: 3, publishedAt: '2026-02-05' },
];

function getDefaultDateRange(): DateRange {
  const now = new Date();
  const monthAgo = new Date(now);
  monthAgo.setMonth(monthAgo.getMonth() - 1);
  return {
    from: monthAgo.toISOString().split('T')[0],
    to: now.toISOString().split('T')[0],
  };
}

export default function MetricsPage() {
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('views');

  const filteredData = MOCK_DATA
    .filter((post) => {
      if (searchQuery) {
        return post.title.toLowerCase().includes(searchQuery.toLowerCase());
      }
      return true;
    })
    .filter((post) => {
      if (dateRange.from && post.publishedAt < dateRange.from) return false;
      if (dateRange.to && post.publishedAt > dateRange.to) return false;
      return true;
    })
    .sort((a, b) => b[sortBy] - a[sortBy]);

  const handleSearch = () => {
    // TODO: GA4 API 연동 후 서버 사이드 검색으로 전환
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold">게시글 조회수/추천수/댓글수</h1>
        <p className="mt-1 text-sm text-muted-foreground">게시글별 핵심 지표를 조회합니다.</p>
      </div>

      <SearchFilter
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        onSearch={handleSearch}
        searchPlaceholder="게시글 제목 검색"
      />

      <div>
        <div className="mb-3 flex items-center justify-end">
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
            <SelectTrigger className="w-[180px]">
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
              {filteredData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    데이터가 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                filteredData.map((post) => (
                  <TableRow key={post.id}>
                    <TableCell className="py-3 font-medium">{post.title}</TableCell>
                    <TableCell className="py-3 text-center">{post.views.toLocaleString()}</TableCell>
                    <TableCell className="py-3 text-center">{post.recommendations.toLocaleString()}</TableCell>
                    <TableCell className="py-3 text-center">{post.comments.toLocaleString()}</TableCell>
                    <TableCell className="py-3 text-center">{post.publishedAt}</TableCell>
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
