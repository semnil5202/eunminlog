'use client';

/**
 * 고유명사 추출 + 번역 실행 컨테이너. 용어 검토 후 번역을 트리거한다.
 *
 * 현재 비활성화 — 프롬프트 복사 방식으로 대체 예정. 비활성화 사유 및 알려진 버그는 api/client.ts 참조.
 */

import { useState, useEffect, useRef } from 'react';
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

type ConfirmedTermValue = { original: string; confirmed: Record<string, string> };

type TranslationSheetContainerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTranslationComplete: (
    results: TranslationResult[],
    confirmedTerms: ConfirmedTermValue[],
  ) => void;
  initialTerms: FlaggedTerm[];
  initialConfirmedValues?: ConfirmedTermValue[];
  title: string;
  content: string;
  description: string;
  placeName: string;
  address: string;
  productNames?: string[];
  purchaseSources?: string[];
  pricePrefixes?: string[];
  pricePrefix?: string;
  imageAlts?: ImageAlt[];
  thumbnailAlt?: string;
  reviewOnly?: boolean;
  onTermsConfirmed?: (confirmedTerms: ConfirmedTermValue[]) => void;
};

export function TranslationSheetContainer({
  open,
  onOpenChange,
  onTranslationComplete,
  initialTerms,
  initialConfirmedValues,
  title,
  content,
  description,
  placeName,
  address,
  productNames,
  purchaseSources,
  pricePrefixes,
  pricePrefix,
  imageAlts,
  thumbnailAlt,
  reviewOnly,
  onTermsConfirmed,
}: TranslationSheetContainerProps) {
  const [status, setStatus] = useState<TranslationStatus>('reviewing');
  const [confirmedTerms, setConfirmedTerms] = useState<Map<number, Record<string, string>>>(
    new Map(),
  );
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState({ completed: 0, total: 7 });
  const prevTermsKeyRef = useRef('');

  useEffect(() => {
    const termsKey = initialTerms.map((t) => t.original).join('\0');
    if (termsKey === prevTermsKeyRef.current) return;
    prevTermsKeyRef.current = termsKey;

    if (initialTerms.length === 0) {
      setConfirmedTerms(new Map());
      return;
    }

    const prefilled = new Map<number, Record<string, string>>();
    if (initialConfirmedValues && initialConfirmedValues.length > 0) {
      const lookup = new Map<string, Record<string, string>>();
      for (const t of initialConfirmedValues) {
        if (typeof t.confirmed === 'object' && t.confirmed !== null) {
          lookup.set(t.original, t.confirmed);
        }
      }
      initialTerms.forEach((term, i) => {
        const prev = lookup.get(term.original);
        if (prev && Object.keys(prev).length > 0) {
          prefilled.set(i, prev);
        }
      });
    }
    setConfirmedTerms(prefilled);
  }, [initialTerms, initialConfirmedValues]);

  const handleConfirmTerm = (index: number, value: Record<string, string>) => {
    setConfirmedTerms((prev) => {
      const next = new Map(prev);
      next.set(index, value);
      return next;
    });
  };

  const handleReviewConfirm = () => {
    const currentTerms = initialTerms.map((term, i) => ({
      original: term.original,
      confirmed: confirmedTerms.get(i) ?? {},
    }));
    const currentOriginals = new Set(currentTerms.map((t) => t.original));
    const previousTerms = (initialConfirmedValues ?? []).filter(
      (t) => !currentOriginals.has(t.original),
    );
    onTermsConfirmed?.([...currentTerms, ...previousTerms]);
    onOpenChange(false);
  };

  const handleTranslateRequest = async () => {
    setStatus('translating');
    setError(null);
    setProgress({ completed: 0, total: 7 });

    const currentTerms = initialTerms.map((term, i) => ({
      original: term.original,
      confirmed: confirmedTerms.get(i) ?? {},
    }));
    const currentOriginals = new Set(currentTerms.map((t) => t.original));
    const previousTerms = (initialConfirmedValues ?? []).filter(
      (t) => !currentOriginals.has(t.original),
    );
    const terms = [...currentTerms, ...previousTerms];

    try {
      const results = await fetchTranslatePost(
        {
          title,
          content,
          description,
          placeName,
          address,
          productNames,
          purchaseSources,
          pricePrefixes,
          pricePrefix,
          confirmedTerms: terms,
          imageAlts,
          thumbnailAlt,
        },
        undefined,
        (completed, total) => {
          setProgress({ completed, total });
        },
      );

      const failedLocales = results.filter((r) => r.failed);
      for (const r of failedLocales) {
        const label = LOCALE_FILTER_LABELS[r.locale];
        toast.error(`${label} 번역에 실패했습니다. 번역본 확인에서 다시 시도해주세요.`);
      }

      toast.success('번역 완료');
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
      setError(null);
      setProgress({ completed: 0, total: 7 });
    }
    onOpenChange(nextOpen);
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[688px]">
        <SheetHeader>
          <SheetTitle className="text-lg">
            {reviewOnly ? '번역 용어 검토' : '번역본 생성'}
          </SheetTitle>
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
              onTranslateRequest={reviewOnly ? handleReviewConfirm : handleTranslateRequest}
              isTranslating={false}
              submitLabel={reviewOnly ? '용어 확정' : undefined}
            />
          )}

          {status === 'translating' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                번역 중... ({progress.completed}/{progress.total})
              </p>
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
