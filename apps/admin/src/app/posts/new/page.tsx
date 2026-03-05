'use client';

import { type ChangeEvent, useState } from 'react';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { CategorySelector } from '@/features/post-editor/components/CategorySelector';
import { ThumbnailUpload } from '@/features/post-editor/components/ThumbnailUpload';
import { VisitFields } from '@/features/post-editor/components/VisitFields';
import { TiptapEditorContainer } from '@/features/post-editor/containers/TiptapEditorContainer';
import { FORM_TYPE_OPTIONS } from '@/features/post-editor/constants/category';
import { generateSummary } from '@/features/post-editor/api/actions';
import { extractFlaggedTerms, translatePost } from '@/features/translation/api/actions';
import { TranslationPreviewSheet } from '@/features/translation/components/TranslationPreviewSheet';
import { TranslationSheetContainer } from '@/features/translation/containers/TranslationSheetContainer';

import type { Category, PostFormType, SubCategory } from '@/shared/types/post';
import type { FlaggedTerm, TranslationResult } from '@/features/translation/types';

const TITLE_MAX_LENGTH = 40;

export default function NewPostPage() {
  const [formType, setFormType] = useState<PostFormType>('visit');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<Category | ''>('');
  const [subCategory, setSubCategory] = useState<SubCategory | ''>('');
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [placeName, setPlaceName] = useState('');
  const [address, setAddress] = useState('');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [description, setDescription] = useState('');
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isSummarized, setIsSummarized] = useState(false);
  const [isTranslated, setIsTranslated] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [flaggedTerms, setFlaggedTerms] = useState<FlaggedTerm[]>([]);
  const [translationResults, setTranslationResults] = useState<TranslationResult[]>([]);

  const handleFormTypeChange = (value: PostFormType) => {
    setFormType(value);
    setPlaceName('');
    setAddress('');
    setPriceMin('');
    setPriceMax('');
  };

  const handleTitleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.length <= TITLE_MAX_LENGTH) {
      setTitle(value);
    }
  };

  const handleCategoryChange = (value: Category) => {
    setCategory(value);
    setSubCategory('');
    setIsTranslated(false);
    setTranslationResults([]);
  };

  const handleGenerateSummary = async () => {
    setIsSummarizing(true);

    try {
      const summary = await generateSummary(title, content);
      setDescription(summary);
      setIsSummarized(true);
    } catch {
      // TODO: 에러 처리 (toast 등)
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleTranslationStart = async () => {
    setIsExtracting(true);

    try {
      const terms = await extractFlaggedTerms(
        content,
        placeName || undefined,
        address || undefined,
      );

      if (terms.length === 0) {
        const results = await translatePost({
          title,
          content,
          placeName: placeName || undefined,
          address: address || undefined,
          confirmedTerms: [],
        });
        setTranslationResults(results);
        setIsTranslated(true);
      } else {
        setFlaggedTerms(terms);
        setIsSheetOpen(true);
      }
    } catch {
      // TODO: 에러 처리 (toast 등)
    } finally {
      setIsExtracting(false);
    }
  };

  const handleTranslationComplete = (results: TranslationResult[]) => {
    setTranslationResults(results);
    setIsTranslated(true);
    setIsSheetOpen(false);
  };

  const needsTranslation = !!(category && subCategory);
  const isSubmitDisabled = needsTranslation && !isTranslated;

  return (
    <>
      <div className="mx-auto mb-6 max-w-[688px]">
        <h1 className="text-xl font-bold">게시글 작성</h1>
        <p className="mt-1 text-sm text-muted-foreground">새로운 게시글을 작성합니다.</p>
      </div>
      <div className="mx-auto max-w-[688px]">
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-base font-bold text-primary-600">폼 형식</label>
            <Select
              value={formType}
              onValueChange={(value) => handleFormTypeChange(value as PostFormType)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FORM_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-base font-bold text-primary-600">썸네일</label>
            <ThumbnailUpload thumbnail={thumbnail} onThumbnailChange={setThumbnail} />
          </div>
        </div>

        <div className="mt-8">
          <label className="mb-1 block text-base font-bold text-primary-600">본문</label>
          <TiptapEditorContainer content={content} onChange={setContent}>
            <div className="p-4">
              <div className="flex items-center justify-between">
                <input
                  type="text"
                  value={title}
                  onChange={handleTitleChange}
                  placeholder="게시글 제목"
                  className="w-full text-title2 font-bold outline-none placeholder:text-muted-foreground"
                />
                <span className="shrink-0 pl-3 text-caption1 text-muted-foreground">
                  {title.length}/{TITLE_MAX_LENGTH}
                </span>
              </div>
            </div>
            <Separator />
          </TiptapEditorContainer>
        </div>

        <div className="mt-8">
          <label className="mb-1 block text-base font-bold text-primary-600">카테고리</label>
          <CategorySelector
            category={category}
            subCategory={subCategory}
            onCategoryChange={handleCategoryChange}
            onSubCategoryChange={setSubCategory}
          />
        </div>

        {formType === 'visit' && (
          <VisitFields
            placeName={placeName}
            address={address}
            priceMin={priceMin}
            priceMax={priceMax}
            onPlaceNameChange={setPlaceName}
            onAddressChange={setAddress}
            onPriceMinChange={setPriceMin}
            onPriceMaxChange={setPriceMax}
          />
        )}

        <div className="mt-8">
          <div className="mb-1 flex items-center justify-between">
            <label className="text-base font-bold text-primary-600">3줄 요약</label>
            <button
              type="button"
              onClick={handleGenerateSummary}
              disabled={isSummarized || isSummarizing}
              className="inline-flex items-center gap-1.5 border border-input px-3 py-1 text-xs font-semibold shadow-xs transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSummarized ? '요약 완료' : '요약 생성'}
              {isSummarizing && (
                <span className="inline-block h-3 w-3 animate-pulse bg-muted-foreground" />
              )}
            </button>
          </div>
          <textarea
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              setIsSummarized(false);
            }}
            placeholder="3줄 요약을 입력해주세요."
            rows={3}
            className="w-full resize-none border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none placeholder:text-muted-foreground"
          />
        </div>

        <div className="mt-10 flex items-center justify-end gap-3">
          {needsTranslation && !isTranslated && (
            <button
              type="button"
              onClick={handleTranslationStart}
              disabled={isExtracting}
              className="h-10 border border-input px-5 text-sm font-semibold shadow-xs transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isExtracting ? '분석 중...' : '번역본 생성'}
            </button>
          )}
          {isTranslated && (
            <button
              type="button"
              onClick={() => setIsPreviewOpen(true)}
              className="h-10 border border-input px-5 text-sm font-semibold shadow-xs transition-colors hover:bg-accent"
            >
              번역본 확인하기
            </button>
          )}
          <button
            type="button"
            disabled={isSubmitDisabled}
            className="h-10 bg-primary-600 px-5 text-sm font-bold text-white shadow-xs transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            작성 완료
          </button>
        </div>
      </div>

      <TranslationSheetContainer
        open={isSheetOpen}
        onOpenChange={setIsSheetOpen}
        onTranslationComplete={handleTranslationComplete}
        initialTerms={flaggedTerms}
        title={title}
        content={content}
        placeName={placeName || undefined}
        address={address || undefined}
      />

      <TranslationPreviewSheet
        open={isPreviewOpen}
        onOpenChange={setIsPreviewOpen}
        originalTitle={title}
        originalContent={content}
        translations={translationResults}
      />
    </>
  );
}
