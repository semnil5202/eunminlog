'use client';

/** 번역본 확인 시트. 원문/번역 비교, 수정 감지, 필드별·전체 재번역을 지원한다. */

import { useRef, useState } from 'react';
import { LoaderIcon, RefreshCwIcon, Sparkles } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

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

type FilterLocale = 'ko' | TranslationLocale;
type TranslatableField = 'title' | 'content' | 'description' | 'place_name' | 'address';

const FILTER_KEYS: FilterLocale[] = ['ko', 'en', 'ja', 'zh-CN', 'zh-TW', 'id', 'vi', 'th'];
const TARGET_LOCALES: TranslationLocale[] = ['en', 'ja', 'zh-CN', 'zh-TW', 'id', 'vi', 'th'];

const TRANSLATABLE_FIELD_LABELS: Record<TranslatableField, string> = {
  title: '제목',
  content: '본문',
  description: '3줄 요약',
  place_name: '장소',
  address: '주소',
};

type TranslationSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  originalTitle: string;
  originalContent: string;
  originalDescription?: string;
  originalPlaceName?: string;
  originalAddress?: string;
  originalProductName?: string;
  originalPurchaseSource?: string;
  originalPricePrefix?: string;
  originalImageAlts?: ImageAlt[];
  originalThumbnailAlt?: string;
  originalThumbnail?: string | null;
  translations: TranslationResult[];
  dirtyFields: Set<string>;
  onRetryLocale: (locale: TranslationLocale, signal?: AbortSignal) => Promise<TranslationResult>;
  onRetryAll?: (signal?: AbortSignal) => Promise<void>;
  onEditComplete?: () => void;
  onUpdateTranslationContent?: (locale: TranslationLocale, content: string) => void;
};

const DirtyBadge = () => (
  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700">
    수정됨
  </span>
);

export function TranslationSheet({
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
  originalThumbnail,
  translations,
  dirtyFields,
  onRetryLocale,
  onRetryAll,
  onEditComplete,
  onUpdateTranslationContent,
}: TranslationSheetProps) {
  const [selected, setSelected] = useState<FilterLocale>('en');
  const [retrying, setRetrying] = useState(false);
  const [retryingAll, setRetryingAll] = useState(false);
  const [retranslating, setRetranslating] = useState<Record<string, boolean>>({});
  const [retranslatedLocales, setRetranslatedLocales] = useState<Set<TranslationLocale>>(new Set());
  const [bulkRetranslating, setBulkRetranslating] = useState(false);
  const individualAbortRef = useRef<AbortController | null>(null);
  const suppressAbortToastRef = useRef(false);
  const [directEditLocales, setDirectEditLocales] = useState<Set<TranslationLocale>>(new Set());
  const [directEditContent, setDirectEditContent] = useState<Record<string, string>>({});
  const [manuallyEditedLocales, setManuallyEditedLocales] = useState<Set<TranslationLocale>>(new Set());

  const isAbortError = (e: unknown): boolean =>
    (e instanceof DOMException && e.name === 'AbortError') ||
    (e instanceof Error && e.name === 'AbortError') ||
    (e instanceof Error && e.message === 'Request was aborted.');

  const abortIndividualSilently = () => {
    suppressAbortToastRef.current = true;
    individualAbortRef.current?.abort();
    individualAbortRef.current = null;
    setTimeout(() => { suppressAbortToastRef.current = false; }, 0);
  };

  const selectedTranslation =
    selected !== 'ko' ? translations.find((tr) => tr.locale === selected) : null;

  const allDirtyTranslated =
    dirtyFields.size === 0 ||
    TARGET_LOCALES.every((l) => retranslatedLocales.has(l) || manuallyEditedLocales.has(l));

  const handleRetryLocale = async () => {
    if (selected === 'ko' || retrying) return;
    const controller = new AbortController();
    individualAbortRef.current = controller;
    setRetrying(true);
    try {
      const result = await onRetryLocale(selected, controller.signal);
      setRetranslatedLocales((prev) => new Set(prev).add(selected as TranslationLocale));
      return result;
    } catch (e) {
      if (isAbortError(e)) {
        if (!suppressAbortToastRef.current) {
          toast.info(`${LOCALE_FILTER_LABELS[selected]} 재번역 요청이 취소되었습니다.`);
        }
        return;
      }
      throw e;
    } finally {
      setRetrying(false);
    }
  };

  const handleRetryAll = async () => {
    if (!onRetryAll || retryingAll) return;
    if (retrying) {
      abortIndividualSilently();
      toast.info('개별 재번역 요청을 취소하고 전체 재번역을 시작합니다.');
    }
    setRetrying(false);
    setRetryingAll(true);
    try {
      await onRetryAll();
      setRetranslatedLocales(new Set(TARGET_LOCALES));
    } finally {
      setRetryingAll(false);
    }
  };

  const handleRetranslateLocale = async (locale: TranslationLocale) => {
    const controller = new AbortController();
    individualAbortRef.current = controller;
    setRetranslating((prev) => ({ ...prev, [locale]: true }));
    try {
      await onRetryLocale(locale, controller.signal);
      setRetranslatedLocales((prev) => new Set(prev).add(locale));
    } catch (e) {
      if (isAbortError(e)) {
        if (!suppressAbortToastRef.current) {
          toast.info(`${LOCALE_FILTER_LABELS[locale]} 번역 요청이 취소되었습니다.`);
        }
        return;
      }
      throw e;
    } finally {
      setRetranslating((prev) => ({ ...prev, [locale]: false }));
    }
  };

  const handleBulkRetranslate = async () => {
    const hasIndividual = Object.values(retranslating).some(Boolean);
    if (hasIndividual) {
      abortIndividualSilently();
      toast.info('개별 번역 요청을 취소하고 전체 번역을 시작합니다.');
    }
    setRetranslating({});
    setBulkRetranslating(true);
    try {
      const pending = TARGET_LOCALES.filter((l) => !retranslatedLocales.has(l));
      const results = await Promise.allSettled(
        pending.map((locale) => onRetryLocale(locale)),
      );
      const newSet = new Set(retranslatedLocales);
      results.forEach((r, i) => {
        if (r.status === 'fulfilled') newSet.add(pending[i]);
      });
      setRetranslatedLocales(newSet);
    } finally {
      setBulkRetranslating(false);
    }
  };

  const handleComplete = () => {
    onEditComplete?.();
    onOpenChange(false);
  };

  const handleDirectEditToggle = (locale: TranslationLocale, checked: boolean, currentContent: string) => {
    if (checked) {
      setDirectEditLocales((prev) => new Set(prev).add(locale));
      setDirectEditContent((prev) => ({ ...prev, [locale]: currentContent }));
    } else {
      const edited = directEditContent[locale];
      if (edited !== undefined && edited !== currentContent) {
        onUpdateTranslationContent?.(locale, edited);
        setManuallyEditedLocales((prev) => new Set(prev).add(locale));
      }
      setDirectEditLocales((prev) => {
        const next = new Set(prev);
        next.delete(locale);
        return next;
      });
    }
  };

  const renderEditField = (field: TranslatableField, value: string, locale: TranslationLocale) => {
    const isDirty = dirtyFields.has(field);
    const isLocaleRetranslated = retranslatedLocales.has(locale);
    const isRetranslating = retranslating[locale] || bulkRetranslating;

    const isDirectEditing = field === 'content' && directEditLocales.has(locale);
    const isManuallyEdited = manuallyEditedLocales.has(locale);
    const showTranslated = isLocaleRetranslated || isManuallyEdited;

    return (
      <div key={field} className="py-5 first:pt-0 last:pb-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <label className="text-sm font-semibold text-muted-foreground">
              {TRANSLATABLE_FIELD_LABELS[field]}
            </label>
            {field !== 'content' && isDirty && !showTranslated && <DirtyBadge />}
            {field !== 'content' && isDirty && showTranslated && (
              <span className="rounded bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-700">
                번역 완료
              </span>
            )}
            {field === 'content' && isDirty && !showTranslated && <DirtyBadge />}
            {field === 'content' && (isDirty ? showTranslated : isManuallyEdited) && (
              <span className="rounded bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-700">
                {isManuallyEdited && !isLocaleRetranslated ? '직접 수정됨' : '번역 완료'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {field === 'content' && (
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                직접 수정
                <Switch
                  size="sm"
                  checked={isDirectEditing}
                  onCheckedChange={(checked) => handleDirectEditToggle(locale, checked, value)}
                />
              </label>
            )}
            {field !== 'content' && isDirty && !showTranslated && (
              <button
                type="button"
                disabled={isRetranslating}
                onClick={() => handleRetranslateLocale(locale)}
                className="inline-flex items-center gap-1 bg-primary-600 px-3 py-1 text-[14px] font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
              >
                <Sparkles className={`size-3 ${isRetranslating ? 'animate-spin' : ''}`} />
                AI 번역 요청
              </button>
            )}
            {field === 'content' && isDirty && !showTranslated && !isDirectEditing && (
              <button
                type="button"
                disabled={isRetranslating}
                onClick={() => handleRetranslateLocale(locale)}
                className="inline-flex items-center gap-1 bg-primary-600 px-3 py-1 text-[14px] font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
              >
                <Sparkles className={`size-3 ${isRetranslating ? 'animate-spin' : ''}`} />
                AI 번역 요청
              </button>
            )}
          </div>
        </div>
        {field === 'title' ? (
          <p className="mt-1 text-lg font-bold">{value}</p>
        ) : field === 'content' && isDirectEditing ? (
          <textarea
            className="mt-1 w-full resize-none border border-input bg-transparent p-3 font-mono text-xs outline-none"
            style={{ height: '450px' }}
            value={directEditContent[locale] ?? value}
            onChange={(e) =>
              setDirectEditContent((prev) => ({ ...prev, [locale]: e.target.value }))
            }
          />
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

  const renderKoTab = () => (
    <>
      <div className="pb-5">
        <div className="flex items-center gap-2">
          <label className="text-sm font-semibold text-muted-foreground">제목</label>
          {dirtyFields.has('title') && <DirtyBadge />}
        </div>
        <p className="mt-1 text-lg font-bold">{originalTitle}</p>
      </div>
      {originalPlaceName && (
        <div className="py-5">
          <div className="flex items-center gap-2">
            <label className="text-sm font-semibold text-muted-foreground">장소</label>
            {dirtyFields.has('place_name') && <DirtyBadge />}
          </div>
          <p className="mt-1 text-sm">{originalPlaceName}</p>
        </div>
      )}
      {originalAddress && (
        <div className="py-5">
          <div className="flex items-center gap-2">
            <label className="text-sm font-semibold text-muted-foreground">주소</label>
            {dirtyFields.has('address') && <DirtyBadge />}
          </div>
          <p className="mt-1 text-sm">{originalAddress}</p>
        </div>
      )}
      {originalProductName && (
        <div className="py-5">
          <div className="flex items-center gap-2">
            <label className="text-sm font-semibold text-muted-foreground">제품명</label>
            {dirtyFields.has('product_name') && <DirtyBadge />}
          </div>
          <p className="mt-1 text-sm">{originalProductName}</p>
        </div>
      )}
      {originalPurchaseSource && (
        <div className="py-5">
          <div className="flex items-center gap-2">
            <label className="text-sm font-semibold text-muted-foreground">구매처</label>
            {dirtyFields.has('purchase_source') && <DirtyBadge />}
          </div>
          <p className="mt-1 text-sm">{originalPurchaseSource}</p>
        </div>
      )}
      {originalPricePrefix && (
        <div className="py-5">
          <div className="flex items-center gap-2">
            <label className="text-sm font-semibold text-muted-foreground">가격설명</label>
            {dirtyFields.has('price_prefix') && <DirtyBadge />}
          </div>
          <p className="mt-1 text-sm">{originalPricePrefix}</p>
        </div>
      )}
      {originalDescription !== undefined && (
        <div className="py-5">
          <div className="flex items-center gap-2">
            <label className="text-sm font-semibold text-muted-foreground">3줄 요약</label>
            {dirtyFields.has('description') && <DirtyBadge />}
          </div>
          <p className="mt-1 whitespace-pre-wrap text-sm">{originalDescription}</p>
        </div>
      )}
      <div className="py-5">
        <div className="flex items-center gap-2">
          <label className="text-sm font-semibold text-muted-foreground">본문</label>
          {dirtyFields.has('content') && <DirtyBadge />}
        </div>
        <div
          className="prose prose-sm mt-1 max-w-none"
          dangerouslySetInnerHTML={{ __html: originalContent }}
        />
      </div>
      {(originalThumbnailAlt || (originalImageAlts && originalImageAlts.length > 0)) && (
        <div className="pt-5">
          <div className="flex items-center gap-2">
            <label className="text-sm font-semibold text-muted-foreground">이미지 Alt</label>
            {dirtyFields.has('image_alts') && <DirtyBadge />}
          </div>
          <div className="mt-2 space-y-3">
            {originalThumbnailAlt && (
              <div className="flex items-start gap-3">
                <span className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-600">
                  썸네일
                </span>
                <div className="min-w-0">
                  {originalThumbnail && (
                    <img src={originalThumbnail} alt="" className="mb-1 h-12 w-auto object-cover" />
                  )}
                  <p className="text-sm">{originalThumbnailAlt}</p>
                </div>
              </div>
            )}
            {originalImageAlts?.map((item, i) => (
              <div key={item.src} className="flex items-start gap-3">
                <span className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-600">
                  이미지 {i + 1}
                </span>
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
  );

  const renderTranslationTab = () => {
    if (selectedTranslation?.failed) {
      return (
        <div className="flex flex-col items-center gap-3 py-12">
          <p className="text-sm text-destructive">
            {LOCALE_FILTER_LABELS[selected]} 번역에 실패했습니다.
          </p>
        </div>
      );
    }
    if (!selectedTranslation) {
      return <p className="text-sm text-muted-foreground">번역 데이터가 없습니다.</p>;
    }
    const locale = selected as TranslationLocale;
    const isLocaleRetranslated = retranslatedLocales.has(locale);
    const isRetranslating = retranslating[locale] || bulkRetranslating;
    const imageAltDirty = dirtyFields.has('image_alts');
    return (
      <>
        {renderEditField('title', selectedTranslation.title, locale)}
        {selectedTranslation.place_name &&
          renderEditField('place_name', selectedTranslation.place_name, locale)}
        {selectedTranslation.address &&
          renderEditField('address', selectedTranslation.address, locale)}
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
        {renderEditField('description', selectedTranslation.description, locale)}
        {renderEditField('content', selectedTranslation.content, locale)}
        {(selectedTranslation.thumbnail_alt || selectedTranslation.image_alts.length > 0) && (
          <div className="pt-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <label className="text-sm font-semibold text-muted-foreground">이미지 Alt</label>
                {imageAltDirty && !isLocaleRetranslated && <DirtyBadge />}
                {imageAltDirty && isLocaleRetranslated && (
                  <span className="rounded bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-700">
                    번역 완료
                  </span>
                )}
              </div>
              {imageAltDirty && !isLocaleRetranslated && (
                <button
                  type="button"
                  disabled={isRetranslating}
                  onClick={() => handleRetranslateLocale(locale)}
                  className="inline-flex items-center gap-1 bg-primary-600 px-3 py-1 text-[14px] font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
                >
                  <Sparkles className={`size-3 ${isRetranslating ? 'animate-spin' : ''}`} />
                  AI 번역 요청
                </button>
              )}
            </div>
            <div className="mt-2 space-y-3">
              {selectedTranslation.thumbnail_alt && (
                <div className="flex items-start gap-3">
                  <span className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-600">
                    썸네일
                  </span>
                  <div className="min-w-0">
                    {originalThumbnail && (
                      <img src={originalThumbnail} alt="" className="mb-1 h-12 w-auto object-cover" />
                    )}
                    <p className="text-sm">{selectedTranslation.thumbnail_alt}</p>
                  </div>
                </div>
              )}
              {selectedTranslation.image_alts.map((item, i) => (
                <div key={item.src} className="flex items-start gap-3">
                  <span className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-600">
                    이미지 {i + 1}
                  </span>
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
    );
  };

  const isBulkRunning = retryingAll || bulkRetranslating;

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
            {selected === 'ko' ? renderKoTab() : renderTranslationTab()}
          </div>

        </div>

        {selected !== 'ko' && (
          <div className="grid grid-cols-2 gap-2 border-t px-4 py-4">
            <button
              type="button"
              onClick={handleRetryLocale}
              disabled={retrying || isBulkRunning}
              className="inline-flex items-center justify-center gap-1.5 h-10 border border-input px-5 text-sm font-semibold shadow-xs transition-colors hover:bg-accent disabled:opacity-50"
            >
              <RefreshCwIcon className={`size-3.5 ${retrying ? 'animate-spin' : ''}`} />
              이 언어만 AI 재번역
            </button>
            {onRetryAll ? (
              <button
                type="button"
                onClick={handleRetryAll}
                disabled={isBulkRunning}
                className="inline-flex items-center justify-center gap-1.5 h-10 border border-input px-5 text-sm font-semibold shadow-xs transition-colors hover:bg-accent disabled:opacity-50"
              >
                <RefreshCwIcon className={`size-3.5 ${retryingAll ? 'animate-spin' : ''}`} />
                전체 언어 AI 재번역
              </button>
            ) : (
              <div />
            )}
            {dirtyFields.size > 0 && !allDirtyTranslated ? (
              <button
                type="button"
                disabled={bulkRetranslating}
                onClick={handleBulkRetranslate}
                className="inline-flex items-center justify-center gap-1.5 h-10 border border-input px-5 text-sm font-semibold shadow-xs transition-colors hover:bg-accent disabled:opacity-50"
              >
                {bulkRetranslating ? (
                  <LoaderIcon className="size-4 animate-spin" />
                ) : (
                  <Sparkles className="size-4" />
                )}
                모든 언어 수정 부분 AI 번역 요청
              </button>
            ) : (
              <div />
            )}
            {dirtyFields.size > 0 ? (
              <Button disabled={!allDirtyTranslated} onClick={handleComplete}>
                번역 수정 완료
              </Button>
            ) : (
              <div />
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
