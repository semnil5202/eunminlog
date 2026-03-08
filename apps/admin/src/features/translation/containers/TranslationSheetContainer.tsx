'use client';

import { useState } from 'react';
import { CheckIcon } from 'lucide-react';
import { toast } from 'sonner';

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';

import type { FlaggedTerm, ImageAlt, TranslationResult, TranslationStatus } from '../types';
import { fetchTranslatePost } from '../api/client';
import { LOCALE_FILTER_LABELS } from '../constants/locale';
import { TermReviewList } from '../components/TermReviewList';

type TranslationSheetContainerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTranslationComplete: (
    results: TranslationResult[],
    confirmedTerms: { original: string; confirmed: string }[],
  ) => void;
  initialTerms: FlaggedTerm[];
  title: string;
  content: string;
  description: string;
  placeName: string;
  address: string;
  productName?: string;
  purchaseSource?: string;
  pricePrefix?: string;
  imageAlts?: ImageAlt[];
  thumbnailAlt?: string;
};

export function TranslationSheetContainer({
  open,
  onOpenChange,
  onTranslationComplete,
  initialTerms,
  title,
  content,
  description,
  placeName,
  address,
  productName,
  purchaseSource,
  pricePrefix,
  imageAlts,
  thumbnailAlt,
}: TranslationSheetContainerProps) {
  const [status, setStatus] = useState<TranslationStatus>('reviewing');
  const [confirmedTerms, setConfirmedTerms] = useState<Map<number, string>>(new Map());
  const [error, setError] = useState<string | null>(null);

  const handleConfirmTerm = (index: number, value: string) => {
    setConfirmedTerms((prev) => {
      const next = new Map(prev);
      next.set(index, value);
      return next;
    });
  };

  const handleTranslateRequest = async () => {
    setStatus('translating');
    setError(null);

    const terms = initialTerms.map((term, i) => ({
      original: term.original,
      confirmed: confirmedTerms.get(i) ?? '',
    }));

    try {
      const results = await fetchTranslatePost({
        title,
        content,
        description,
        placeName,
        address,
        productName,
        purchaseSource,
        pricePrefix,
        confirmedTerms: terms,
        imageAlts,
        thumbnailAlt,
      });

      const failedLocales = results.filter((r) => r.failed);
      for (const r of failedLocales) {
        const label = LOCALE_FILTER_LABELS[r.locale];
        toast.error(`${label} 번역에 실패했습니다. 번역본 확인에서 다시 시도해주세요.`);
      }

      setStatus('success');
      setTimeout(() => {
        onTranslationComplete(results, terms);
      }, 800);
    } catch {
      setError('번역 중 오류가 발생했습니다.');
      setStatus('error');
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setStatus('reviewing');
      setConfirmedTerms(new Map());
      setError(null);
    }
    onOpenChange(nextOpen);
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[688px]">
        <SheetHeader>
          <SheetTitle className="text-lg">번역본 생성</SheetTitle>
          <SheetDescription className="text-base">
            번역이 어려운 용어를 검토하고 확정 번역을 입력해주세요.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {status === 'reviewing' && (
            <TermReviewList
              terms={initialTerms}
              confirmedTerms={confirmedTerms}
              onConfirmTerm={handleConfirmTerm}
              onTranslateRequest={handleTranslateRequest}
              isTranslating={false}
            />
          )}

          {status === 'translating' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">번역 중...</p>
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-4 w-full" />
              ))}
            </div>
          )}

          {status === 'success' && (
            <div className="flex flex-col items-center gap-3 py-12">
              <div className="flex size-12 items-center justify-center bg-primary-600">
                <CheckIcon className="size-6 text-white" />
              </div>
              <p className="text-sm font-semibold">번역이 완료되었습니다.</p>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center gap-3 py-12">
              <p className="text-sm text-destructive">{error}</p>
              <button
                type="button"
                onClick={handleTranslateRequest}
                className="h-9 border border-input px-4 text-sm shadow-xs transition-colors hover:bg-accent"
              >
                다시 시도
              </button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
