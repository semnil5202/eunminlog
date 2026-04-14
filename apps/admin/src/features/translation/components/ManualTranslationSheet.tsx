'use client';

/** 수동 번역 Sheet. 프롬프트 복사 → 외부 AI 결과 붙여넣기 → 파싱 → locale별 미리보기. */

import { useState, useRef, useEffect } from 'react';
import { ClipboardCopy, Check } from 'lucide-react';
import { toast } from 'sonner';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { buildTranslationPrompt } from '@/features/translation/lib/prompt-builder';
import {
  parseTranslationResult,
  type ParsedLocaleResult,
} from '@/features/translation/lib/prompt-parser';
import { LOCALE_FILTER_LABELS } from '@/features/translation/constants/locale';
import type { TranslationLocale } from '@/shared/types/post';
import type { ImageAlt } from '@/features/translation/types';

const LOCALES: TranslationLocale[] = ['en', 'ja', 'zh-CN', 'zh-TW', 'id', 'vi', 'th'];

type ManualTranslationSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formType: 'visit' | 'product-review';
  title: string;
  content: string;
  description: string;
  placeName?: string;
  address?: string;
  pricePrefix?: string;
  productNames?: string[];
  purchaseSources?: string[];
  pricePrefixes?: string[];
  imageAlts?: ImageAlt[];
  thumbnailAlt?: string;
  savedRawText?: string;
  savedResults?: ParsedLocaleResult[];
  isTranslationDirty?: boolean;
  onResultsChange?: (rawText: string, results: ParsedLocaleResult[]) => void;
  onSkipDirtyCheck?: () => void;
};

export function ManualTranslationSheet({
  open,
  onOpenChange,
  formType,
  title,
  content,
  description,
  placeName,
  address,
  pricePrefix,
  productNames,
  purchaseSources,
  pricePrefixes,
  imageAlts,
  thumbnailAlt,
  savedRawText = '',
  savedResults = [],
  isTranslationDirty = false,
  onResultsChange,
  onSkipDirtyCheck,
}: ManualTranslationSheetProps) {
  const [rawText, setRawText] = useState(savedRawText);
  const [results, setResults] = useState<ParsedLocaleResult[]>(savedResults);
  const [activeLocale, setActiveLocale] = useState<TranslationLocale>('en');
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setRawText(savedRawText);
    setResults(savedResults);
  }, [savedRawText, savedResults]);

  const handleCopyPrompt = async () => {
    const prompt = buildTranslationPrompt({
      formType,
      title,
      content,
      description,
      placeName,
      address,
      pricePrefix,
      productNames,
      purchaseSources,
      pricePrefixes,
      imageAlts,
      thumbnailAlt,
    });

    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    toast.success('번역 프롬프트가 클립보드에 복사되었습니다.');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApply = () => {
    if (!rawText.trim()) {
      toast.error('번역 결과를 붙여넣어 주세요.');
      return;
    }

    const parsed = parseTranslationResult(rawText);
    if (parsed.length === 0) {
      toast.error('번역 결과를 파싱할 수 없습니다. 형식을 확인해주세요.');
      return;
    }

    const missing = LOCALES.filter((l) => !parsed.find((r) => r.locale === l));
    if (missing.length > 0) {
      const labels = missing.map((l) => LOCALE_FILTER_LABELS[l]).join(', ');
      toast.warning(`${labels} 번역이 누락되었습니다.`);
    }

    setResults(parsed);
    setActiveLocale(parsed[0]?.locale ?? 'en');
    onResultsChange?.(rawText, parsed);
    toast.success(`${parsed.length}개 언어 번역이 적용되었습니다.`);
  };

  const activeResult = results.find((r) => r.locale === activeLocale);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[688px] flex flex-col">
        <SheetHeader>
          <SheetTitle className="text-lg">수동 번역</SheetTitle>
          <SheetDescription>
            프롬프트를 복사하여 외부 AI에서 번역 결과를 받은 후 아래에 붙여넣으세요.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-900">1. 프롬프트 복사</h3>
              <button
                type="button"
                onClick={handleCopyPrompt}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-input rounded-md hover:bg-accent transition-colors"
              >
                {copied ? <Check className="size-3.5" /> : <ClipboardCopy className="size-3.5" />}
                {copied ? '복사됨' : '프롬프트 복사'}
              </button>
            </div>
            <ul className="mt-2 text-xs text-muted-foreground space-y-1">
              <li>- 복사한 프롬프트를 외부 AI에 붙여넣고 번역 결과를 받으세요.</li>
              <li>- 결과를 붙여넣은 후 영어부터 태국어까지 모든 언어가 보이는지 확인해주세요.</li>
              <li>
                - 일부 언어가 누락되었다면 AI의 복사 아이콘 대신 직접 드래그하여 복사/붙여넣기
                해주세요.
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">2. 번역 결과 붙여넣기</h3>
            <textarea
              ref={textareaRef}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="AI에서 받은 번역 결과를 여기에 붙여넣으세요..."
              className="w-full h-48 p-3 text-sm border border-input rounded-md resize-y focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <div className="mt-2 flex justify-end gap-2">
              {isTranslationDirty && onSkipDirtyCheck && (
                <button
                  type="button"
                  onClick={() => {
                    onSkipDirtyCheck();
                    toast.success('번역 수정 없이 진행합니다.');
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium border border-input rounded-md hover:bg-accent transition-colors"
                >
                  수정 안함
                </button>
              )}
              <button
                type="button"
                onClick={handleApply}
                disabled={!rawText.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                적용하기
              </button>
            </div>
          </div>

          {results.length > 0 && (
            <div>
              <div className="sticky top-0 z-10 bg-white pb-2 pt-1">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">3. 적용 결과</h3>
                <div className="flex gap-1 overflow-x-auto">
                  {results.map((r) => (
                    <button
                      key={r.locale}
                      type="button"
                      onClick={() => setActiveLocale(r.locale)}
                      className={`shrink-0 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                        activeLocale === r.locale
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {LOCALE_FILTER_LABELS[r.locale]}
                    </button>
                  ))}
                </div>
              </div>

              {activeResult && (
                <div className="mt-3 space-y-3 text-sm border border-gray-200 rounded-md p-4 bg-gray-50">
                  <ResultField label="제목" value={activeResult.title} />
                  <ResultField label="3줄 요약" value={activeResult.description} multiline />
                  {activeResult.placeName && (
                    <ResultField label="장소명" value={activeResult.placeName} />
                  )}
                  {activeResult.address && (
                    <ResultField label="주소" value={activeResult.address} />
                  )}
                  {activeResult.pricePrefix && (
                    <ResultField label="가격설명" value={activeResult.pricePrefix} />
                  )}
                  {activeResult.productNames.length > 0 && (
                    <ResultField
                      label="제품명"
                      value={activeResult.productNames.map((n, i) => `${i + 1}. ${n}`).join('\n')}
                      multiline
                    />
                  )}
                  {activeResult.purchaseSources.length > 0 && (
                    <ResultField
                      label="구매처"
                      value={activeResult.purchaseSources
                        .map((s, i) => `${i + 1}. ${s}`)
                        .join('\n')}
                      multiline
                    />
                  )}
                  {activeResult.pricePrefixes.length > 0 && (
                    <ResultField
                      label="가격설명"
                      value={activeResult.pricePrefixes.map((p, i) => `${i + 1}. ${p}`).join('\n')}
                      multiline
                    />
                  )}
                  <ResultField label="썸네일 alt" value={activeResult.thumbnailAlt} />
                  {activeResult.imageAlts.length > 0 && (
                    <ResultField
                      label="이미지 alt"
                      value={activeResult.imageAlts.map((a, i) => `${i + 1}. ${a}`).join('\n')}
                      multiline
                    />
                  )}
                  <div>
                    <span className="text-gray-500 font-medium">본문</span>
                    <div
                      className="mt-1 p-3 bg-white border border-gray-200 rounded-md text-sm prose prose-sm"
                      dangerouslySetInnerHTML={{ __html: activeResult.content }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function ResultField({
  label,
  value,
  multiline,
}: {
  label: string;
  value: string;
  multiline?: boolean;
}) {
  if (!value) return null;
  return (
    <div>
      <span className="text-gray-500 font-medium">{label}</span>
      <p className={`mt-0.5 text-gray-900 ${multiline ? 'whitespace-pre-line' : ''}`}>{value}</p>
    </div>
  );
}
