'use client';

import { useState } from 'react';
import { LoaderIcon, RefreshCwIcon, Sparkles } from 'lucide-react';

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';

import type { TranslationLocale } from '@/shared/types/post';
import type { ImageAlt, TranslationResult } from '../types';
import { LOCALE_FILTER_LABELS } from '../constants/locale';

type TranslationField = 'title' | 'content' | 'description' | 'place_name' | 'address';

type FilterLocale = 'ko' | TranslationLocale;

const FILTER_KEYS: FilterLocale[] = ['ko', 'en', 'ja', 'zh-CN', 'zh-TW', 'id', 'vi', 'th'];

const TARGET_LOCALES: TranslationLocale[] = ['en', 'ja', 'zh-CN', 'zh-TW', 'id', 'vi', 'th'];

const FIELD_LABELS: Record<TranslationField, string> = {
  title: '제목',
  content: '본문',
  description: '3줄 요약',
  place_name: '장소',
  address: '주소',
};

type TranslationEditSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  originalTitle: string;
  originalContent: string;
  originalDescription: string;
  originalPlaceName?: string;
  originalAddress?: string;
  originalProductName?: string;
  originalPurchaseSource?: string;
  originalPricePrefix?: string;
  originalImageAlts?: ImageAlt[];
  originalThumbnailAlt?: string;
  translations: TranslationResult[];
  dirtyFields: Set<TranslationField>;
  onRetranslateLocale: (locale: TranslationLocale) => Promise<TranslationResult>;
  onRetryAll?: () => Promise<void>;
  onTranslationEditComplete: () => void;
};

export type { TranslationField };

export function TranslationEditSheet({
  open,
  onOpenChange,
  originalTitle,
  originalContent,
  originalDescription,
  originalPlaceName,
  originalAddress,
  originalProductName,
  originalPurchaseSource,
  originalPricePrefix,
  originalImageAlts,
  originalThumbnailAlt,
  translations,
  dirtyFields,
  onRetranslateLocale,
  onRetryAll,
  onTranslationEditComplete,
}: TranslationEditSheetProps) {
  const [selected, setSelected] = useState<FilterLocale>('en');
  const [retranslating, setRetranslating] = useState<Record<string, boolean>>({});
  const [retranslatedLocales, setRetranslatedLocales] = useState<Set<TranslationLocale>>(new Set());
  const [bulkRetranslating, setBulkRetranslating] = useState(false);
  const [retryingAll, setRetryingAll] = useState(false);

  const selectedTranslation =
    selected !== 'ko' ? translations.find((tr) => tr.locale === selected) : null;

  const allDirtyTranslated =
    dirtyFields.size === 0 || TARGET_LOCALES.every((l) => retranslatedLocales.has(l));

  const handleRetranslate = async (locale: TranslationLocale) => {
    setRetranslating((prev) => ({ ...prev, [locale]: true }));
    try {
      await onRetranslateLocale(locale);
      setRetranslatedLocales((prev) => new Set(prev).add(locale));
    } finally {
      setRetranslating((prev) => ({ ...prev, [locale]: false }));
    }
  };

  const handleBulkRetranslate = async () => {
    setBulkRetranslating(true);
    try {
      const results = await Promise.allSettled(
        TARGET_LOCALES.filter((l) => !retranslatedLocales.has(l)).map((locale) =>
          onRetranslateLocale(locale),
        ),
      );

      const newSet = new Set(retranslatedLocales);
      const pending = TARGET_LOCALES.filter((l) => !retranslatedLocales.has(l));
      results.forEach((r, i) => {
        if (r.status === 'fulfilled') newSet.add(pending[i]);
      });
      setRetranslatedLocales(newSet);
    } finally {
      setBulkRetranslating(false);
    }
  };

  const handleRetryAll = async () => {
    if (!onRetryAll || retryingAll) return;
    setRetryingAll(true);
    try {
      await onRetryAll();
      setRetranslatedLocales(new Set(TARGET_LOCALES));
    } finally {
      setRetryingAll(false);
    }
  };

  const handleComplete = () => {
    onTranslationEditComplete();
    onOpenChange(false);
  };

  const renderField = (field: TranslationField, value: string, locale: TranslationLocale) => {
    const isDirty = dirtyFields.has(field);
    const isLocaleRetranslated = retranslatedLocales.has(locale);
    const isRetranslating = retranslating[locale] || bulkRetranslating;

    const showRetranslateBtn = isDirty && !isLocaleRetranslated;

    return (
      <div key={field} className="py-5 first:pt-0 last:pb-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <label className="text-sm font-semibold text-muted-foreground">
              {FIELD_LABELS[field]}
            </label>
            {isDirty && !isLocaleRetranslated && (
              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700">
                수정됨
              </span>
            )}
            {isDirty && isLocaleRetranslated && (
              <span className="rounded bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-700">
                번역 완료
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {showRetranslateBtn && (
              <button
                type="button"
                disabled={isRetranslating}
                onClick={() => handleRetranslate(locale)}
                className="inline-flex items-center gap-1 bg-primary-600 px-3 py-1 text-[14px] font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
              >
                {isRetranslating ? (
                  <Sparkles className="size-3 animate-spin" />
                ) : (
                  <Sparkles className="size-3" />
                )}
                AI 번역 요청
              </button>
            )}
          </div>
        </div>
        {field === 'title' ? (
          <p className="mt-1 text-lg font-bold">{value}</p>
        ) : field === 'content' ? (
          <div
            className="prose prose-sm mt-1 max-w-none"
            dangerouslySetInnerHTML={{ __html: value }}
          />
        ) : (
          <p className="mt-1 whitespace-pre-wrap text-sm">{value}</p>
        )}
      </div>
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-[688px]">
        <SheetHeader>
          <SheetTitle className="text-lg">번역본 확인</SheetTitle>
          <SheetDescription className="text-base">
            한국어 원문과 다국어 번역본을 확인합니다.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <div className="flex flex-wrap gap-2">
            {FILTER_KEYS.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setSelected(key)}
                className={`px-3 py-1 text-sm font-semibold transition-colors ${
                  selected === key
                    ? 'bg-primary-600 text-white'
                    : 'border border-input text-muted-foreground hover:bg-accent'
                }`}
              >
                {LOCALE_FILTER_LABELS[key]}
              </button>
            ))}
          </div>

          <div className="mt-6 divide-y divide-gray-200">
            {selected === 'ko' ? (
              <>
                <div className="pb-5">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-semibold text-muted-foreground">제목</label>
                    {dirtyFields.has('title') && (
                      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700">
                        수정됨
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-lg font-bold">{originalTitle}</p>
                </div>
                {originalPlaceName && (
                  <div className="py-5">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-semibold text-muted-foreground">장소</label>
                      {dirtyFields.has('place_name') && (
                        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700">
                          수정됨
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm">{originalPlaceName}</p>
                  </div>
                )}
                {originalAddress && (
                  <div className="py-5">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-semibold text-muted-foreground">주소</label>
                      {dirtyFields.has('address') && (
                        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700">
                          수정됨
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm">{originalAddress}</p>
                  </div>
                )}
                {originalProductName && (
                  <div className="py-5">
                    <label className="text-sm font-semibold text-muted-foreground">제품명</label>
                    <p className="mt-1 text-sm">{originalProductName}</p>
                  </div>
                )}
                {originalPurchaseSource && (
                  <div className="py-5">
                    <label className="text-sm font-semibold text-muted-foreground">구매처</label>
                    <p className="mt-1 text-sm">{originalPurchaseSource}</p>
                  </div>
                )}
                {originalPricePrefix && (
                  <div className="py-5">
                    <label className="text-sm font-semibold text-muted-foreground">가격설명</label>
                    <p className="mt-1 text-sm">{originalPricePrefix}</p>
                  </div>
                )}
                <div className="py-5">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-semibold text-muted-foreground">
                      3줄 요약
                    </label>
                    {dirtyFields.has('description') && (
                      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700">
                        수정됨
                      </span>
                    )}
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm">{originalDescription}</p>
                </div>
                <div className="py-5">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-semibold text-muted-foreground">본문</label>
                    {dirtyFields.has('content') && (
                      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700">
                        수정됨
                      </span>
                    )}
                  </div>
                  <div
                    className="prose prose-sm mt-1 max-w-none"
                    dangerouslySetInnerHTML={{ __html: originalContent }}
                  />
                </div>
                {(originalThumbnailAlt || (originalImageAlts && originalImageAlts.length > 0)) && (
                  <div className="pt-5">
                    <label className="text-sm font-semibold text-muted-foreground">이미지 Alt</label>
                    <div className="mt-2 space-y-3">
                      {originalThumbnailAlt && (
                        <div className="flex items-start gap-3">
                          <span className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-600">썸네일</span>
                          <p className="text-sm">{originalThumbnailAlt}</p>
                        </div>
                      )}
                      {originalImageAlts?.map((item, i) => (
                        <div key={item.src} className="flex items-start gap-3">
                          <span className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-600">이미지 {i + 1}</span>
                          <div className="min-w-0">
                            <img src={item.src} alt="" className="mb-1 h-12 w-auto object-cover" />
                            <p className="text-sm">{item.alt}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : selectedTranslation ? (
              <>
                {renderField('title', selectedTranslation.title, selected as TranslationLocale)}
                {selectedTranslation.place_name &&
                  renderField(
                    'place_name',
                    selectedTranslation.place_name,
                    selected as TranslationLocale,
                  )}
                {selectedTranslation.address &&
                  renderField(
                    'address',
                    selectedTranslation.address,
                    selected as TranslationLocale,
                  )}
                {selectedTranslation.product_name && (
                  <div className="py-5">
                    <label className="text-sm font-semibold text-muted-foreground">제품명</label>
                    <p className="mt-1 text-sm">{selectedTranslation.product_name}</p>
                  </div>
                )}
                {selectedTranslation.purchase_source && (
                  <div className="py-5">
                    <label className="text-sm font-semibold text-muted-foreground">구매처</label>
                    <p className="mt-1 text-sm">{selectedTranslation.purchase_source}</p>
                  </div>
                )}
                {selectedTranslation.price_prefix && (
                  <div className="py-5">
                    <label className="text-sm font-semibold text-muted-foreground">가격설명</label>
                    <p className="mt-1 text-sm">{selectedTranslation.price_prefix}</p>
                  </div>
                )}
                {renderField(
                  'description',
                  selectedTranslation.description,
                  selected as TranslationLocale,
                )}
                {renderField('content', selectedTranslation.content, selected as TranslationLocale)}
                {(selectedTranslation.thumbnail_alt || selectedTranslation.image_alts.length > 0) && (
                  <div className="pt-5">
                    <label className="text-sm font-semibold text-muted-foreground">이미지 Alt</label>
                    <div className="mt-2 space-y-3">
                      {selectedTranslation.thumbnail_alt && (
                        <div className="flex items-start gap-3">
                          <span className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-600">썸네일</span>
                          <p className="text-sm">{selectedTranslation.thumbnail_alt}</p>
                        </div>
                      )}
                      {selectedTranslation.image_alts.map((item, i) => (
                        <div key={item.src} className="flex items-start gap-3">
                          <span className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-600">이미지 {i + 1}</span>
                          <div className="min-w-0">
                            <img src={item.src} alt="" className="mb-1 h-12 w-auto object-cover" />
                            <p className="text-sm">{item.alt}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">번역 데이터가 없습니다.</p>
            )}
          </div>

          {selected !== 'ko' && onRetryAll && (
            <div className="mt-[40px] flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleRetranslate(selected as TranslationLocale)}
                disabled={retranslating[selected] || bulkRetranslating || retryingAll}
                className="inline-flex items-center gap-1.5 h-9 bg-gray-900 px-4 text-sm font-semibold text-white transition-colors hover:bg-gray-800 disabled:opacity-50"
              >
                <RefreshCwIcon
                  className={`size-3.5 ${retranslating[selected] ? 'animate-spin' : ''}`}
                />
                이 언어만 AI 재번역
              </button>
              <button
                type="button"
                onClick={handleRetryAll}
                disabled={retryingAll || bulkRetranslating}
                className="inline-flex items-center gap-1.5 h-9 bg-gray-900 px-4 text-sm font-semibold text-white transition-colors hover:bg-gray-800 disabled:opacity-50"
              >
                <RefreshCwIcon className={`size-3.5 ${retryingAll ? 'animate-spin' : ''}`} />
                전체 언어 AI 재번역
              </button>
            </div>
          )}
        </div>

        {dirtyFields.size > 0 && (
          <div className="flex items-center justify-end gap-3 border-t px-4 py-4">
            {!allDirtyTranslated && (
              <button
                type="button"
                disabled={bulkRetranslating}
                onClick={handleBulkRetranslate}
                className="inline-flex items-center gap-1.5 h-10 border border-input px-5 text-sm font-semibold shadow-xs transition-colors hover:bg-accent disabled:opacity-50"
              >
                {bulkRetranslating ? (
                  <LoaderIcon className="size-4 animate-spin" />
                ) : (
                  <Sparkles className="size-4" />
                )}
                모든 언어 수정 부분 AI 번역 요청
              </button>
            )}
            <Button disabled={!allDirtyTranslated} onClick={handleComplete}>
              번역 수정 완료
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
