'use client';

/** 번역본 확인 시트. 원문/번역 비교, 섹션별 체크박스, 선택적 재번역을 지원한다. */

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { LoaderIcon, RefreshCwIcon, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';

import type { TranslationLocale } from '@/shared/types/post';
import type { CheckableField, FlaggedTerm, ImageAlt, SelectiveTranslateOptions, TranslationResult } from '../types';
import { LOCALE_FILTER_LABELS } from '../constants/locale';
import { splitHtmlIntoSections, isTranslatableSection, reassembleSections, type ContentSection } from '../lib/html-sections';
import { useTranslationCheckState } from '../hooks/useTranslationCheckState';

type FilterLocale = 'ko' | TranslationLocale;

const FILTER_KEYS: FilterLocale[] = ['ko', 'en', 'ja', 'zh-CN', 'zh-TW', 'id', 'vi', 'th'];
const TARGET_LOCALES: TranslationLocale[] = ['en', 'ja', 'zh-CN', 'zh-TW', 'id', 'vi', 'th'];

const FIELD_LABELS: Record<CheckableField, string> = {
  title: '제목',
  description: '3줄 요약',
  place_name: '장소',
  address: '주소',
  product_name: '제품명',
  purchase_source: '구매처',
  price_prefix: '가격설명',
  image_alts: '이미지 Alt',
};

type ConfirmedTerm = { original: string; confirmed: string | Record<string, string> };

type TranslationSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  originalTitle: string;
  originalContent: string;
  originalDescription?: string;
  originalPlaceName?: string;
  originalAddress?: string;
  originalProductNames?: string[];
  originalPurchaseSources?: string[];
  originalPricePrefixes?: string[];
  originalPricePrefix?: string;
  originalImageAlts?: ImageAlt[];
  originalThumbnailAlt?: string;
  originalThumbnail?: string | null;
  translations: TranslationResult[];
  dirtyFields: Set<string>;
  onRetryLocale: (
    locale: TranslationLocale,
    signal?: AbortSignal,
    selectiveOptions?: SelectiveTranslateOptions,
    confirmedTerms?: ConfirmedTerm[],
  ) => Promise<TranslationResult>;
  onRetryAll?: (signal?: AbortSignal) => Promise<void>;
  onEditComplete?: () => void;
  onUpdateTranslationContent?: (locale: TranslationLocale, content: string) => void;
  onUpdateTranslation?: (locale: TranslationLocale, partial: Partial<TranslationResult>) => void;
  onExtractTerms?: (dirtyFields: Set<string>) => Promise<FlaggedTerm[]>;
  onRequestTermReview?: (terms: FlaggedTerm[], pendingLocales: TranslationLocale[]) => void;
  pendingRetranslation?: {
    confirmedTerms: ConfirmedTerm[];
    locales: TranslationLocale[];
  } | null;
  onPendingRetranslationConsumed?: () => void;
};

const DirtyBadge = () => (
  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700">
    수정됨
  </span>
);

const TranslatedBadge = ({ label = '번역 완료' }: { label?: string }) => (
  <span className="rounded bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-700">
    {label}
  </span>
);

const UntranslatedBadge = () => (
  <span className="rounded bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-700">
    미번역
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
  originalProductNames,
  originalPurchaseSources,
  originalPricePrefixes,
  originalPricePrefix,
  originalImageAlts,
  originalThumbnailAlt,
  originalThumbnail,
  translations,
  dirtyFields,
  onRetryLocale,
  onEditComplete,
  onUpdateTranslationContent,
  onUpdateTranslation,
  onExtractTerms,
  onRequestTermReview,
  pendingRetranslation,
  onPendingRetranslationConsumed,
}: TranslationSheetProps) {
  const [selected, setSelected] = useState<FilterLocale>('en');
  const [retranslating, setRetranslating] = useState<Record<string, boolean>>({});
  const [retranslatedLocales, setRetranslatedLocales] = useState<Set<TranslationLocale>>(new Set());
  const [bulkRetranslating, setBulkRetranslating] = useState(false);
  const individualAbortRef = useRef<AbortController | null>(null);
  const suppressAbortToastRef = useRef(false);
  const [directEditSections, setDirectEditSections] = useState<Record<string, string>>({});
  const [directEditingSections, setDirectEditingSections] = useState<Set<string>>(new Set());
  const [directEditFields, setDirectEditFields] = useState<Record<string, string>>({});
  const [directEditingFields, setDirectEditingFields] = useState<Set<string>>(new Set());
  const [manuallyEditedLocales, setManuallyEditedLocales] = useState<Set<TranslationLocale>>(new Set());

  const [extractingTerms, setExtractingTerms] = useState(false);
  const prevDirtyKeyRef = useRef('');

  useEffect(() => {
    const currentKey = [...dirtyFields].sort().join(',');
    if (currentKey === prevDirtyKeyRef.current) return;
    const hadStatus = retranslatedLocales.size > 0 || manuallyEditedLocales.size > 0;
    prevDirtyKeyRef.current = currentKey;
    if (hadStatus && currentKey) {
      setRetranslatedLocales(new Set());
      setManuallyEditedLocales(new Set());
    }
  }, [dirtyFields, retranslatedLocales.size, manuallyEditedLocales.size]);

  const selectedTranslation =
    selected !== 'ko' ? translations.find((tr) => tr.locale === selected) : null;

  const originalSections = useMemo(
    () => splitHtmlIntoSections(originalContent),
    [originalContent],
  );

  const translatedSections = useMemo(
    () => (selectedTranslation ? splitHtmlIntoSections(selectedTranslation.content) : []),
    [selectedTranslation],
  );

  const availableFields = useMemo(() => {
    const fields: CheckableField[] = ['title'];
    if (originalPlaceName) fields.push('place_name');
    if (originalAddress) fields.push('address');
    if (originalProductNames && originalProductNames.length > 0) fields.push('product_name');
    if (originalPurchaseSources && originalPurchaseSources.length > 0) fields.push('purchase_source');
    if ((originalPricePrefixes && originalPricePrefixes.some(Boolean)) || originalPricePrefix) fields.push('price_prefix');
    if (originalDescription !== undefined) fields.push('description');
    if (originalThumbnailAlt || (originalImageAlts && originalImageAlts.length > 0))
      fields.push('image_alts');
    return fields;
  }, [originalPlaceName, originalAddress, originalProductNames, originalPurchaseSources, originalPricePrefixes, originalPricePrefix, originalDescription, originalThumbnailAlt, originalImageAlts]);

  const checkState = useTranslationCheckState(availableFields, originalSections.length);

  const translatableDirtyFields = new Set([...dirtyFields].filter((f) => f !== 'content_image_only'));
  const allDirtyTranslated =
    translatableDirtyFields.size === 0 ||
    TARGET_LOCALES.every((l) => retranslatedLocales.has(l) || manuallyEditedLocales.has(l));

  const abortIndividualSilently = () => {
    suppressAbortToastRef.current = true;
    individualAbortRef.current?.abort();
    individualAbortRef.current = null;
    setTimeout(() => { suppressAbortToastRef.current = false; }, 0);
  };

  const buildSelectiveOptions = (): SelectiveTranslateOptions | undefined => {
    if (!checkState.hasAnyChecked) return undefined;
    const targetFields = [...checkState.checkedFields];
    const targetSectionIndices = [...checkState.checkedSections];
    if (targetFields.length === 0 && targetSectionIndices.length === 0) return undefined;
    return { targetFields, targetSectionIndices };
  };

  const handleSelectiveRetranslate = async (locales: TranslationLocale[], confirmedTerms?: ConfirmedTerm[]) => {
    const selectiveOptions = buildSelectiveOptions();
    const hasIndividual = Object.values(retranslating).some(Boolean);
    if (hasIndividual) {
      abortIndividualSilently();
    }
    setRetranslating({});
    setBulkRetranslating(true);
    const total = locales.length;
    let completed = 0;
    const toastId = toast.loading(`번역 중... (0/${total})`);
    try {
      const results = await Promise.allSettled(
        locales.map((locale) =>
          onRetryLocale(locale, undefined, selectiveOptions, confirmedTerms).then((r) => {
            completed++;
            toast.loading(`번역 중... (${completed}/${total})`, { id: toastId });
            return r;
          }),
        ),
      );
      const successLocales = results
        .map((r, i) => (r.status === 'fulfilled' ? locales[i] : null))
        .filter((l): l is TranslationLocale => l !== null);
      setRetranslatedLocales((prev) => {
        const next = new Set(prev);
        for (const l of successLocales) next.add(l);
        return next;
      });
      toast.success('번역 완료', { id: toastId });
    } catch {
      toast.error('번역 중 오류가 발생했습니다.', { id: toastId });
    } finally {
      setBulkRetranslating(false);
    }
  };

  const startRetranslateWithTerms = async (locales: TranslationLocale[]) => {
    if (!onExtractTerms) {
      await handleSelectiveRetranslate(locales);
      return;
    }
    setExtractingTerms(true);
    const toastId = toast.loading('번역 용어 검토중...');
    try {
      const terms = await onExtractTerms(dirtyFields);
      if (terms.length === 0) {
        toast.dismiss(toastId);
        await handleSelectiveRetranslate(locales);
      } else {
        toast.success('용어 검토가 필요합니다.', { id: toastId });
        onRequestTermReview?.(terms, locales);
      }
    } catch {
      toast.error('용어 추출에 실패했습니다. 다시 시도해주세요.', { id: toastId });
    } finally {
      setExtractingTerms(false);
    }
  };

  useEffect(() => {
    if (!open || !pendingRetranslation) return;
    onPendingRetranslationConsumed?.();
    handleSelectiveRetranslate(pendingRetranslation.locales, pendingRetranslation.confirmedTerms)
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps -- trigger once when sheet reopens with pending data
  }, [open, pendingRetranslation]);

  const handleSelectiveThisLocale = async () => {
    if (selected === 'ko') return;
    await startRetranslateWithTerms([selected as TranslationLocale]);
  };

  const handleSelectiveAllLocales = async () => {
    await startRetranslateWithTerms(TARGET_LOCALES);
  };

  const handleComplete = () => {
    onEditComplete?.();
    onOpenChange(false);
  };

  const sectionEditKey = (locale: TranslationLocale, index: number) => `${locale}-${index}`;

  const handleSectionDirectEditToggle = (
    locale: TranslationLocale,
    sectionIndex: number,
    currentHtml: string,
  ) => {
    const key = sectionEditKey(locale, sectionIndex);
    if (directEditingSections.has(key)) {
      const edited = directEditSections[key];
      if (edited !== undefined && edited !== currentHtml) {
        const baseSections = translatedSections.length > 0 ? translatedSections : originalSections;
        const updatedSections = baseSections.map((s, i) => {
          if (i === sectionIndex) return { ...s, html: edited };
          return s;
        });
        const newContent = reassembleSections(updatedSections);
        onUpdateTranslationContent?.(locale, newContent);
        setManuallyEditedLocales((prev) => new Set(prev).add(locale));
      }
      setDirectEditingSections((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    } else {
      setDirectEditingSections((prev) => new Set(prev).add(key));
      setDirectEditSections((prev) => ({ ...prev, [key]: currentHtml }));
    }
  };

  const fieldEditKey = (locale: TranslationLocale, field: string) => `${locale}-field-${field}`;

  const handleFieldDirectEditToggle = (
    locale: TranslationLocale,
    field: keyof TranslationResult,
    currentValue: string,
  ) => {
    const key = fieldEditKey(locale, field);
    if (directEditingFields.has(key)) {
      const edited = directEditFields[key];
      if (edited !== undefined && edited !== currentValue) {
        onUpdateTranslation?.(locale, { [field]: edited });
        setManuallyEditedLocales((prev) => new Set(prev).add(locale));
      }
      setDirectEditingFields((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    } else {
      setDirectEditingFields((prev) => new Set(prev).add(key));
      setDirectEditFields((prev) => ({ ...prev, [key]: currentValue }));
    }
  };

  const handleArrayFieldDirectEditToggle = (
    locale: TranslationLocale,
    field: keyof TranslationResult,
    currentValues: string[],
  ) => {
    const key = fieldEditKey(locale, field);
    const joinedCurrent = currentValues.join('\n');
    if (directEditingFields.has(key)) {
      const edited = directEditFields[key];
      if (edited !== undefined && edited !== joinedCurrent) {
        const newValues = edited.split('\n');
        onUpdateTranslation?.(locale, { [field]: newValues });
        setManuallyEditedLocales((prev) => new Set(prev).add(locale));
      }
      setDirectEditingFields((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    } else {
      setDirectEditingFields((prev) => new Set(prev).add(key));
      setDirectEditFields((prev) => ({ ...prev, [key]: joinedCurrent }));
    }
  };

  const isBulkRunning = bulkRetranslating || extractingTerms;

  const renderFieldRow = (
    field: CheckableField,
    value: string | undefined,
    options?: {
      isBold?: boolean;
      isHtml?: boolean;
      children?: ReactNode;
      directEditField?: keyof TranslationResult;
      directEditArrayField?: keyof TranslationResult;
      directEditArrayValues?: string[];
      hasUntranslatedChild?: boolean;
    },
  ) => {
    if (value === undefined && !options?.children) return null;

    const isContentImageOnly = dirtyFields.has('content_image_only');
    const fieldDirtyKey = field === 'image_alts' ? 'image_alts' : field;
    const isDirty = dirtyFields.has(fieldDirtyKey) || (field === 'description' && isContentImageOnly);
    const locale = selected as TranslationLocale;
    const isLocaleRetranslated = retranslatedLocales.has(locale);
    const isManuallyEdited = manuallyEditedLocales.has(locale);
    const showTranslated = isLocaleRetranslated || isManuallyEdited;

    const isKo = selected === 'ko';
    const editFieldKey = options?.directEditField
      ? fieldEditKey(locale, options.directEditField)
      : options?.directEditArrayField
        ? fieldEditKey(locale, options.directEditArrayField)
        : null;
    const isDirectEditing = editFieldKey !== null && directEditingFields.has(editFieldKey);
    const showDirectEditSwitch = !isKo && (options?.directEditField !== undefined || options?.directEditArrayField !== undefined);

    return (
      <div className="py-5 first:pt-0 last:pb-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {selected !== 'ko' && (
              <Checkbox
                checked={checkState.checkedFields.has(field)}
                onCheckedChange={() => checkState.toggleField(field)}
              />
            )}
            <label className="text-sm font-semibold text-muted-foreground">
              {FIELD_LABELS[field]}
            </label>
            {isDirty && (!showTranslated || options?.hasUntranslatedChild) && <DirtyBadge />}
            {isDirty && showTranslated && !options?.hasUntranslatedChild && <TranslatedBadge />}
          </div>
          {showDirectEditSwitch && (
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              직접 수정
              <Switch
                size="sm"
                checked={isDirectEditing}
                onCheckedChange={() => {
                  if (options?.directEditArrayField && options?.directEditArrayValues) {
                    handleArrayFieldDirectEditToggle(locale, options.directEditArrayField, options.directEditArrayValues);
                  } else if (options?.directEditField) {
                    handleFieldDirectEditToggle(locale, options.directEditField, value ?? '');
                  }
                }}
              />
            </label>
          )}
        </div>
        {isDirectEditing && editFieldKey !== null ? (
          <textarea
            className="mt-1 w-full resize-none border border-input bg-transparent p-2 font-mono text-xs outline-none"
            style={{ height: '80px' }}
            value={directEditFields[editFieldKey] ?? (options?.directEditArrayValues ? options.directEditArrayValues.join('\n') : (value ?? ''))}
            onChange={(e) =>
              setDirectEditFields((prev) => ({ ...prev, [editFieldKey]: e.target.value }))
            }
          />
        ) : (
          options?.children ?? (
            options?.isHtml ? (
              <div
                className="prose prose-sm mt-1 max-w-none"
                dangerouslySetInnerHTML={{ __html: value! }}
              />
            ) : (
              <p className={`mt-1 ${options?.isBold ? 'text-lg font-bold' : 'whitespace-pre-wrap text-sm'}`}>
                {value}
              </p>
            )
          )
        )}
      </div>
    );
  };

  const renderSectionRow = (origSection: ContentSection, locale: TranslationLocale) => {
    const translated = translatedSections[origSection.index];
    const hasTranslation = !!translated;
    const displaySection = translated ?? origSection;
    const key = sectionEditKey(locale, origSection.index);
    const isDirectEditing = directEditingSections.has(key);
    const translatable = isTranslatableSection(origSection);

    return (
      <div key={origSection.index} className="border-l-2 border-gray-200 py-3 pl-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={checkState.checkedSections.has(origSection.index)}
              onCheckedChange={() => checkState.toggleSection(origSection.index)}
            />
            <span className="text-xs text-muted-foreground">
              {origSection.label}
            </span>
            {!hasTranslation && translatable && (
              <span className="rounded bg-rose-100 px-1.5 py-0.5 text-xs font-medium text-rose-700">
                미번역
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {translatable && hasTranslation && (
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                직접 수정
                <Switch
                  size="sm"
                  checked={isDirectEditing}
                  onCheckedChange={() =>
                    handleSectionDirectEditToggle(locale, origSection.index, displaySection.html)
                  }
                />
              </label>
            )}
          </div>
        </div>
        {isDirectEditing ? (
          <textarea
            className="mt-1 w-full resize-none border border-input bg-transparent p-2 font-mono text-xs outline-none"
            style={{ height: '120px' }}
            value={directEditSections[key] ?? displaySection.html}
            onChange={(e) =>
              setDirectEditSections((prev) => ({ ...prev, [key]: e.target.value }))
            }
          />
        ) : (
          <div
            className="prose prose-sm mt-1 max-w-none"
            dangerouslySetInnerHTML={{ __html: displaySection.html }}
          />
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
      {originalProductNames && originalProductNames.length > 0 && (
        <div className="py-5">
          <div className="flex items-center gap-2">
            <label className="text-sm font-semibold text-muted-foreground">제품명</label>
            {dirtyFields.has('product_name') && <DirtyBadge />}
          </div>
          <ul className="mt-1 space-y-0.5 text-sm">
            {originalProductNames.map((name, i) => (
              <li key={i}>{originalProductNames.length > 1 ? `${i + 1}. ` : ''}{name}</li>
            ))}
          </ul>
        </div>
      )}
      {originalPurchaseSources && originalPurchaseSources.length > 0 && (
        <div className="py-5">
          <div className="flex items-center gap-2">
            <label className="text-sm font-semibold text-muted-foreground">구매처</label>
            {dirtyFields.has('purchase_source') && <DirtyBadge />}
          </div>
          <ul className="mt-1 space-y-0.5 text-sm">
            {originalPurchaseSources.map((source, i) => (
              <li key={i}>{originalPurchaseSources.length > 1 ? `${i + 1}. ` : ''}{source}</li>
            ))}
          </ul>
        </div>
      )}
      {originalPricePrefixes && originalPricePrefixes.some(Boolean) && (
        <div className="py-5">
          <div className="flex items-center gap-2">
            <label className="text-sm font-semibold text-muted-foreground">가격설명</label>
            {dirtyFields.has('price_prefix') && <DirtyBadge />}
          </div>
          <ul className="mt-1 space-y-0.5 text-sm">
            {originalPricePrefixes.map((prefix, i) => (
              <li key={i}>{originalPricePrefixes.length > 1 ? `${i + 1}. ` : ''}{prefix}</li>
            ))}
          </ul>
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
          {(dirtyFields.has('content') || dirtyFields.has('content_image_only')) && <DirtyBadge />}
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
    const isManuallyEdited = manuallyEditedLocales.has(locale);
    const showTranslated = isLocaleRetranslated || isManuallyEdited;
    const contentDirty = dirtyFields.has('content') || dirtyFields.has('content_image_only');

    const contentCheckboxState = checkState.isContentAllChecked
      ? true
      : checkState.isContentIndeterminate
        ? ('indeterminate' as const)
        : false;

    const hasUntranslatedSection = originalSections.some(
      (s, i) => isTranslatableSection(s) && !translatedSections[i],
    );

    return (
      <>
        {/* 전체 선택 */}
        <div className="flex items-center gap-2 pb-4">
          <Checkbox
            checked={checkState.isAllChecked}
            onCheckedChange={checkState.toggleAll}
          />
          <span className="text-sm font-semibold text-muted-foreground">전체 선택</span>
        </div>

        {renderFieldRow('title', selectedTranslation.title, { isBold: true, directEditField: 'title' })}

        {selectedTranslation.place_name &&
          renderFieldRow('place_name', selectedTranslation.place_name, { directEditField: 'place_name' })}
        {selectedTranslation.address &&
          renderFieldRow('address', selectedTranslation.address, { directEditField: 'address' })}
        {selectedTranslation.product_name.length > 0 &&
          renderFieldRow('product_name', undefined, {
            directEditArrayField: 'product_name',
            directEditArrayValues: selectedTranslation.product_name,
            children: (() => {
              const key = fieldEditKey(locale, 'product_name');
              if (directEditingFields.has(key)) return null;
              return (
                <ul className="mt-1 space-y-0.5 text-sm">
                  {selectedTranslation.product_name.map((name, i) => (
                    <li key={i}>{selectedTranslation.product_name.length > 1 ? `${i + 1}. ` : ''}{name}</li>
                  ))}
                </ul>
              );
            })(),
          })}
        {selectedTranslation.purchase_source.length > 0 &&
          renderFieldRow('purchase_source', undefined, {
            directEditArrayField: 'purchase_source',
            directEditArrayValues: selectedTranslation.purchase_source,
            children: (() => {
              const key = fieldEditKey(locale, 'purchase_source');
              if (directEditingFields.has(key)) return null;
              return (
                <ul className="mt-1 space-y-0.5 text-sm">
                  {selectedTranslation.purchase_source.map((source, i) => (
                    <li key={i}>{selectedTranslation.purchase_source.length > 1 ? `${i + 1}. ` : ''}{source}</li>
                  ))}
                </ul>
              );
            })(),
          })}
        {selectedTranslation.price_prefix.length > 0 &&
          renderFieldRow('price_prefix', undefined, {
            directEditArrayField: 'price_prefix',
            directEditArrayValues: selectedTranslation.price_prefix,
            children: (() => {
              const key = fieldEditKey(locale, 'price_prefix');
              if (directEditingFields.has(key)) return null;
              return (
                <ul className="mt-1 space-y-0.5 text-sm">
                  {selectedTranslation.price_prefix.map((prefix, i) => (
                    <li key={i}>{selectedTranslation.price_prefix.length > 1 ? `${i + 1}. ` : ''}{prefix}</li>
                  ))}
                </ul>
              );
            })(),
          })}

        {renderFieldRow('description', selectedTranslation.description, { directEditField: 'description' })}

        {/* 본문 — 섹션 리스트 */}
        <div className="py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={contentCheckboxState}
                onCheckedChange={checkState.toggleAllContent}
              />
              <label className="text-sm font-semibold text-muted-foreground">본문</label>
              {contentDirty && (!showTranslated || hasUntranslatedSection) && <DirtyBadge />}
              {contentDirty && showTranslated && !hasUntranslatedSection && (
                <TranslatedBadge label={isManuallyEdited && !isLocaleRetranslated ? '직접 수정됨' : '번역 완료'} />
              )}
            </div>
          </div>
          <div className="mt-2 space-y-1">
            {originalSections.map((section) => renderSectionRow(section, locale))}
          </div>
        </div>

        {/* 이미지 Alt */}
        {(originalThumbnailAlt || (originalImageAlts && originalImageAlts.length > 0)) &&
          renderFieldRow('image_alts', undefined, {
            hasUntranslatedChild:
              (originalThumbnailAlt ? !selectedTranslation.thumbnail_alt : false) ||
              (originalImageAlts ?? []).some((orig) => !selectedTranslation.image_alts.find((t) => t.src === orig.src)),
            children: (
              <div className="mt-2 space-y-3">
                {originalThumbnailAlt && (() => {
                  const thumbKey = fieldEditKey(locale, 'thumbnail_alt');
                  const isEditingThumb = directEditingFields.has(thumbKey);
                  const currentThumbAlt = selectedTranslation.thumbnail_alt || originalThumbnailAlt;
                  return (
                    <div className="flex items-start gap-3">
                      <div className="flex shrink-0 items-center gap-1.5">
                        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-600">
                          썸네일
                        </span>
                        {!selectedTranslation.thumbnail_alt && <UntranslatedBadge />}
                      </div>
                      <div className="min-w-0 grow">
                        {originalThumbnail && (
                          <img src={originalThumbnail} alt="" className="mb-1 h-12 w-auto object-cover" />
                        )}
                        {isEditingThumb ? (
                          <textarea
                            className="w-full resize-none border border-input bg-transparent p-2 font-mono text-xs outline-none"
                            style={{ height: '60px' }}
                            value={directEditFields[thumbKey] ?? currentThumbAlt}
                            onChange={(e) =>
                              setDirectEditFields((prev) => ({ ...prev, [thumbKey]: e.target.value }))
                            }
                          />
                        ) : (
                          <p className="text-sm">{currentThumbAlt}</p>
                        )}
                      </div>
                      <label className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
                        직접 수정
                        <Switch
                          size="sm"
                          checked={isEditingThumb}
                          onCheckedChange={() => {
                            if (isEditingThumb) {
                              const edited = directEditFields[thumbKey];
                              if (edited !== undefined && edited !== currentThumbAlt) {
                                onUpdateTranslation?.(locale, { thumbnail_alt: edited });
                                setManuallyEditedLocales((prev) => new Set(prev).add(locale));
                              }
                              setDirectEditingFields((prev) => {
                                const next = new Set(prev);
                                next.delete(thumbKey);
                                return next;
                              });
                            } else {
                              setDirectEditingFields((prev) => new Set(prev).add(thumbKey));
                              setDirectEditFields((prev) => ({ ...prev, [thumbKey]: currentThumbAlt }));
                            }
                          }}
                        />
                      </label>
                    </div>
                  );
                })()}
                {(originalImageAlts ?? []).map((origItem, i) => {
                  const translated = selectedTranslation.image_alts.find((t) => t.src === origItem.src);
                  const imgKey = fieldEditKey(locale, `image_alt_${origItem.src}`);
                  const isEditingImg = directEditingFields.has(imgKey);
                  const currentAlt = translated?.alt || origItem.alt;
                  return (
                    <div key={origItem.src} className="flex items-start gap-3">
                      <div className="flex shrink-0 items-center gap-1.5">
                        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-600">
                          이미지 {i + 1}
                        </span>
                        {!translated && <UntranslatedBadge />}
                      </div>
                      <div className="min-w-0 grow">
                        <img src={origItem.src} alt="" className="mb-1 h-12 w-auto object-cover" />
                        {isEditingImg ? (
                          <textarea
                            className="w-full resize-none border border-input bg-transparent p-2 font-mono text-xs outline-none"
                            style={{ height: '60px' }}
                            value={directEditFields[imgKey] ?? currentAlt}
                            onChange={(e) =>
                              setDirectEditFields((prev) => ({ ...prev, [imgKey]: e.target.value }))
                            }
                          />
                        ) : (
                          <p className="text-sm">{currentAlt}</p>
                        )}
                      </div>
                      <label className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
                        직접 수정
                        <Switch
                          size="sm"
                          checked={isEditingImg}
                          onCheckedChange={() => {
                            if (isEditingImg) {
                              const edited = directEditFields[imgKey];
                              if (edited !== undefined && edited !== currentAlt) {
                                const newImageAlts = selectedTranslation.image_alts.map((a) =>
                                  a.src === origItem.src ? { ...a, alt: edited } : a,
                                );
                                if (!translated) {
                                  newImageAlts.push({ src: origItem.src, alt: edited });
                                }
                                onUpdateTranslation?.(locale, { image_alts: newImageAlts });
                                setManuallyEditedLocales((prev) => new Set(prev).add(locale));
                              }
                              setDirectEditingFields((prev) => {
                                const next = new Set(prev);
                                next.delete(imgKey);
                                return next;
                              });
                            } else {
                              setDirectEditingFields((prev) => new Set(prev).add(imgKey));
                              setDirectEditFields((prev) => ({ ...prev, [imgKey]: currentAlt }));
                            }
                          }}
                        />
                      </label>
                    </div>
                  );
                })}
              </div>
            ),
          })}
      </>
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

        <div className="flex flex-wrap gap-2 px-4 pb-3">
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

        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <div className="divide-y divide-gray-200">
            {selected === 'ko' ? renderKoTab() : renderTranslationTab()}
          </div>
        </div>

        {selected !== 'ko' && (
          <div className="flex flex-col gap-2 border-t px-4 py-4">
            {checkState.hasAnyChecked && (
              <>
                <button
                  type="button"
                  disabled={isBulkRunning}
                  onClick={handleSelectiveThisLocale}
                  className="inline-flex items-center justify-center gap-1.5 h-10 border border-input px-5 text-sm font-semibold shadow-xs transition-colors hover:bg-accent disabled:opacity-50"
                >
                  {isBulkRunning ? (
                    <LoaderIcon className="size-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="size-3.5" />
                  )}
                  선택 항목 AI 번역 ({LOCALE_FILTER_LABELS[selected]})
                </button>
                <button
                  type="button"
                  disabled={isBulkRunning}
                  onClick={handleSelectiveAllLocales}
                  className="inline-flex items-center justify-center gap-1.5 h-10 border border-input px-5 text-sm font-semibold shadow-xs transition-colors hover:bg-accent disabled:opacity-50"
                >
                  {isBulkRunning ? (
                    <LoaderIcon className="size-3.5 animate-spin" />
                  ) : (
                    <RefreshCwIcon className="size-3.5" />
                  )}
                  선택 항목 AI 번역 (전체 언어)
                </button>
              </>
            )}
            {dirtyFields.size > 0 && (
              <Button disabled={!allDirtyTranslated} onClick={handleComplete}>
                번역 수정 완료
              </Button>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
