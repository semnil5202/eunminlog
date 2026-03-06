'use client';

import { useCallback, useEffect, useState } from 'react';

import Link from 'next/link';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';

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
import { Button } from '@/components/ui/button';
import { deleteDraft, fetchDrafts } from '@/features/draft/api';

import type { DraftListItem } from '@/features/draft/types';

export default function DraftsPage() {
  const [drafts, setDrafts] = useState<DraftListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<DraftListItem | null>(null);

  const loadDrafts = useCallback(async () => {
    try {
      const data = await fetchDrafts();
      setDrafts(data);
    } catch {
      toast.error('임시저장 목록을 불러오지 못했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDrafts();
  }, [loadDrafts]);

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      await deleteDraft(deleteTarget.id);
      setDrafts((prev) => prev.filter((d) => d.id !== deleteTarget.id));
      toast.success('임시저장이 삭제되었습니다.');
    } catch {
      toast.error('삭제에 실패했습니다.');
    } finally {
      setDeleteTarget(null);
    }
  };

  const getDraftHref = (draft: DraftListItem) => {
    if (draft.post_id) return `/posts/${draft.post_id}/edit?draft=${draft.id}`;
    return `/posts/new?draft=${draft.id}`;
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold">임시저장 글</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          자동 저장된 글 목록입니다. 최대 10개까지 보관됩니다.
        </p>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="bg-primary-600 hover:bg-primary-600">
              <TableHead className="w-[60%] font-bold text-white">제목</TableHead>
              <TableHead className="text-center font-bold text-white">유형</TableHead>
              <TableHead className="text-center font-bold text-white">저장일</TableHead>
              <TableHead className="w-[60px] text-center font-bold text-white">삭제</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                  불러오는 중...
                </TableCell>
              </TableRow>
            ) : drafts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                  임시저장된 글이 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              drafts.map((draft) => (
                <TableRow key={draft.id}>
                  <TableCell className="py-3 font-medium">
                    <Link href={getDraftHref(draft)} className="text-blue-600 underline">
                      {draft.title || '제목 없음'}
                    </Link>
                  </TableCell>
                  <TableCell className="py-3 text-center text-sm text-muted-foreground">
                    {draft.post_id ? '수정 중' : '새 글'}
                  </TableCell>
                  <TableCell className="py-3 text-center">{formatDate(draft.updated_at)}</TableCell>
                  <TableCell className="py-3 text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteTarget(draft)}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>임시저장 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{deleteTarget?.title || '제목 없음'}&quot; 임시저장을 삭제하시겠습니까?
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
