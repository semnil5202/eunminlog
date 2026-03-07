'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import SearchFilter from '@/shared/components/filter/SearchFilter';
import Pagination from '@/shared/components/pagination/Pagination';
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

import { deletePosts, fetchPosts, type PostListItem } from '@/features/post-management/api/actions';

type SortKey = 'publishedAt' | 'updatedAt';

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'publishedAt', label: '최신 발행순' },
  { value: 'updatedAt', label: '최신 수정순' },
];

const PAGE_SIZE = 10;

type FilterFormValues = {
  from: string;
  to: string;
  query: string;
};

function getDefaultDateRange() {
  const now = new Date();
  const monthAgo = new Date(now);
  monthAgo.setMonth(monthAgo.getMonth() - 1);
  return {
    from: monthAgo.toISOString().split('T')[0],
    to: now.toISOString().split('T')[0],
  };
}

function truncateTitle(title: string, max = 30) {
  return title.length > max ? title.slice(0, max) + '...' : title;
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

  const [sortBy, setSortBy] = useState<SortKey>(
    (searchParams.get('sort') as SortKey) || 'publishedAt',
  );
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [posts, setPosts] = useState<PostListItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const [currentFilter, setCurrentFilter] = useState<FilterFormValues>(getValues());
  const [currentSort, setCurrentSort] = useState<SortKey>(sortBy);

  const loadPosts = useCallback(async (filter: FilterFormValues, sort: SortKey, p: number) => {
    setIsLoading(true);
    try {
      const result = await fetchPosts({
        page: p,
        pageSize: PAGE_SIZE,
        sortBy: sort,
        from: filter.from || undefined,
        to: filter.to || undefined,
        search: filter.query || undefined,
      });
      setPosts(result.posts);
      setTotalCount(result.totalCount);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '게시글 조회에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPosts(currentFilter, currentSort, page);
  }, [loadPosts, currentFilter, currentSort, page]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const buildQueryString = useCallback((filter: FilterFormValues, sort: SortKey, p: number) => {
    const params = new URLSearchParams();
    if (p > 1) params.set('page', String(p));
    if (filter.from) params.set('from', filter.from);
    if (filter.to) params.set('to', filter.to);
    if (filter.query) params.set('q', filter.query);
    if (sort !== 'publishedAt') params.set('sort', sort);
    const qs = params.toString();
    return qs ? `/posts?${qs}` : '/posts';
  }, []);

  const handleSearch = () => {
    const current = getValues();
    setCurrentFilter(current);
    setCurrentSort(sortBy);
    setPage(1);
    setSelectedIds(new Set());
    router.replace(buildQueryString(current, sortBy, 1), { scroll: false });
  };

  const handleSortChange = (value: string) => {
    const newSort = value as SortKey;
    setSortBy(newSort);
    setCurrentSort(newSort);
    setPage(1);
    setSelectedIds(new Set());
    router.replace(buildQueryString(currentFilter, newSort, 1), { scroll: false });
  };

  const handlePageChange = (p: number) => {
    setPage(p);
    setSelectedIds(new Set());
    router.replace(buildQueryString(currentFilter, currentSort, p), { scroll: false });
  };

  const isAllSelected = posts.length > 0 && posts.every((p) => selectedIds.has(p.id));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(posts.map((p) => p.id)));
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

  const selectedTitles = posts
    .filter((p) => selectedIds.has(p.id))
    .map((p) => truncateTitle(p.title));

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await deletePosts(Array.from(selectedIds));
      if (result.success) {
        toast.success(`${result.deletedCount}개의 게시글이 삭제되었습니다.`);
        setSelectedIds(new Set());
        setIsDeleteDialogOpen(false);
        await loadPosts(currentFilter, currentSort, page);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '게시글 삭제에 실패했습니다.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold">게시글 작성/수정/삭제</h1>
        <p className="mt-1 text-sm text-muted-foreground">게시글을 관리합니다.</p>
      </div>

      <SearchFilter onSearch={handleSearch}>
        <SearchFilter.DateRange registerFrom={register('from')} registerTo={register('to')} />
        <SearchFilter.Query register={register('query')} placeholder="게시글 제목 검색" />
      </SearchFilter>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button asChild className="max-md:h-9 max-md:px-3 max-md:text-xs">
              <Link href="/posts/new">
                <Plus className="mr-1 h-4 w-4 max-md:h-3.5 max-md:w-3.5" />새 글 작성
              </Link>
            </Button>
            {selectedIds.size > 0 && (
              <Button variant="destructive" onClick={() => setIsDeleteDialogOpen(true)} className="max-md:h-8 max-md:px-3 max-md:text-xs">
                <Trash2 className="mr-1 h-4 w-4 max-md:h-3.5 max-md:w-3.5" />
                {selectedIds.size}개 삭제
              </Button>
            )}
          </div>
          <Select value={sortBy} onValueChange={handleSortChange}>
            <SelectTrigger className="w-[150px] max-md:h-8 max-md:w-[130px] max-md:text-xs">
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
                <TableHead className="w-[52px] px-4">
                  <Checkbox
                    checked={isAllSelected}
                    onCheckedChange={toggleSelectAll}
                    disabled={posts.length === 0}
                    className="border-white"
                  />
                </TableHead>
                <TableHead className="w-[55%] font-bold text-white">게시글 제목</TableHead>
                <TableHead className="text-center font-bold text-white">발행일</TableHead>
                <TableHead className="text-center font-bold text-white">마지막 수정일</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                    게시글을 불러오는 중...
                  </TableCell>
                </TableRow>
              ) : posts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                    데이터가 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                posts.map((post) => (
                  <TableRow key={post.id}>
                    <TableCell className="px-4 py-3">
                      <Checkbox
                        checked={selectedIds.has(post.id)}
                        onCheckedChange={() => toggleSelect(post.id)}
                      />
                    </TableCell>
                    <TableCell className="py-3 font-medium">
                      <Link href={`/posts/${post.id}/edit`} className="text-blue-600 underline">
                        {post.title}
                      </Link>
                    </TableCell>
                    <TableCell className="py-3 text-center">
                      {post.created_at.slice(0, 10)}
                    </TableCell>
                    <TableCell className="py-3 text-center">
                      {post.updated_at.slice(0, 10)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />
      </div>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>게시글 삭제</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="text-sm text-muted-foreground">
                정말 총 {selectedIds.size}개의 게시글을 삭제하시겠습니까?
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {selectedTitles.slice(0, 10).map((title, i) => (
                    <li key={i}>{title}</li>
                  ))}
                  {selectedTitles.length > 10 && <li>... 외 {selectedTitles.length - 10}개</li>}
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
