'use client';

import { useId, useRef } from 'react';
import { Images, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { IMAGE_FILE_ACCEPT } from '@/features/media/lib/upload-image';
import type { MediaIntakeItem, MediaIntakeMode } from '../hooks/useMediaIntake';

type Props = {
  mode: MediaIntakeMode;
  items: MediaIntakeItem[];
  busy: boolean;
  error?: string;
  onClose: () => void;
  onFiles: (files: File[]) => void;
  onRemove: (id: string) => void;
  onSubmit: () => void;
};
const labels = { images: '이미지 추가', carousel: '캐러셀 만들기', append: '캐러셀에 이미지 추가' };
const statuses = { waiting: '대기', uploading: '업로드 중', success: '완료', error: '실패' };

/** 캐러셀 생성·추가용 파일 미리보기와 파일별 업로드 상태를 표시한다. */
export function MediaIntakeDialog({
  mode,
  items,
  busy,
  error,
  onClose,
  onFiles,
  onRemove,
  onSubmit,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const hintId = useId();
  const minimum = mode === 'carousel' ? 2 : 1;
  const selectionHint =
    items.length < minimum
      ? items.length === 0
        ? `${minimum}장 이상 선택하면 ${mode === 'carousel' ? '만들' : '추가할'} 수 있어요.`
        : `${minimum - items.length}장 더 선택해주세요.`
      : '아래 번호 순서대로 추가됩니다.';
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="flex max-h-[90dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
        <DialogHeader className="shrink-0 px-6 pt-6 pb-4 text-left">
          <DialogTitle>{labels[mode]}</DialogTitle>
          <DialogDescription>
            {mode === 'carousel'
              ? '여러 이미지를 하나로 묶어 넘겨볼 수 있어요.'
              : mode === 'append'
                ? '선택한 이미지를 이 캐러셀의 마지막에 추가합니다.'
                : '선택한 이미지를 각각 독립된 이미지로 추가합니다.'}
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 overflow-y-auto px-6 pb-5">
          <input
            ref={inputRef}
            className="hidden"
            aria-label="이미지 파일 선택"
            type="file"
            accept={IMAGE_FILE_ACCEPT}
            multiple
            disabled={busy}
            onChange={(event) => {
              onFiles(Array.from(event.currentTarget.files ?? []));
              event.currentTarget.value = '';
            }}
          />
          {items.length === 0 && (
            <button
              type="button"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
              aria-label="이미지 선택"
              aria-describedby={hintId}
              className="flex min-h-44 w-full cursor-pointer flex-col items-center justify-center gap-3 border border-primary/30 bg-primary/5 px-4 py-6 text-center transition-colors hover:border-primary hover:bg-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-default disabled:opacity-50"
            >
              <Images aria-hidden="true" className="size-8 text-primary" />
              <span className="inline-flex min-h-11 items-center gap-2 bg-primary px-5 text-sm font-medium text-primary-foreground">
                <Plus aria-hidden="true" className="size-4" /> 이미지 선택
              </span>
              <span className="text-sm text-muted-foreground">
                여러 장을 한 번에 선택할 수 있어요
              </span>
            </button>
          )}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium" aria-live="polite">
              선택한 이미지 {items.length}장
            </p>
            {items.length > 0 && (
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                className="min-h-11"
                onClick={() => inputRef.current?.click()}
              >
                <Plus aria-hidden="true" /> 이미지 더 선택
              </Button>
            )}
          </div>
          <p id={hintId} className="mt-1 text-sm text-muted-foreground" aria-live="polite">
            {selectionHint}
          </p>
          <ol className="mt-4 flex flex-col gap-3">
            {items.map((item, index) => (
              <li key={item.id} className="flex items-center gap-3 border border-input p-3">
                <span className="text-sm font-medium text-muted-foreground">{index + 1}</span>
                <img
                  src={item.preview}
                  alt={`${index + 1}번 이미지 미리보기`}
                  className="size-16 shrink-0 rounded-none object-cover"
                />
                <div className="min-w-0 grow">
                  <p className="truncate text-sm" title={item.file.name}>
                    {item.file.name}
                  </p>
                  <p className="text-xs" role="status">
                    {statuses[item.status]}
                  </p>
                  {item.error && <p className="text-xs text-destructive">{item.error}</p>}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={busy}
                  onClick={() => onRemove(item.id)}
                  aria-label={`${item.file.name} 제거`}
                  className="size-11 shrink-0"
                >
                  <X aria-hidden="true" />
                </Button>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-xs text-muted-foreground">
            파일당 최대 50MB · 여러 파일 합산 제한 없음
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            GIF는 정지 이미지로 변환됩니다. HEIC는 미리보기가 표시되지 않을 수 있습니다.
          </p>
          {error && (
            <p role="alert" className="mt-3 text-sm text-destructive">
              {error}
            </p>
          )}
        </div>
        <DialogFooter className="shrink-0 flex-row justify-end border-t border-input px-6 py-4">
          <Button type="button" variant="outline" onClick={onClose} className="min-h-11">
            취소
          </Button>
          <Button
            type="button"
            onClick={onSubmit}
            disabled={busy || items.length < minimum || !!error}
            className="min-h-11 min-w-24"
          >
            {busy ? '업로드 중…' : mode === 'carousel' ? '생성' : '추가'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
