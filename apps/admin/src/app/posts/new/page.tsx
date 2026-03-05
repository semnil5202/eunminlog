'use client';

import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

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
import {
  postFormSchema,
  POST_FORM_DEFAULTS,
  TITLE_MAX_LENGTH,
  type PostFormValues,
} from '@/features/post-editor/types/form';
import { extractFlaggedTerms, translatePost } from '@/features/translation/api/actions';
import { TranslationPreviewSheet } from '@/features/translation/components/TranslationPreviewSheet';
import { TranslationSheetContainer } from '@/features/translation/containers/TranslationSheetContainer';
import { LoaderIcon } from 'lucide-react';

import type { Category, PostFormType, SubCategory } from '@/shared/types/post';
import type { FlaggedTerm, TranslationResult } from '@/features/translation/types';

export default function NewPostPage() {
  const {
    register,
    control,
    watch,
    setValue,
    getValues,
    trigger,
    formState: { isValid },
  } = useForm<PostFormValues>({
    resolver: zodResolver(postFormSchema),
    defaultValues: POST_FORM_DEFAULTS,
    mode: 'onChange',
  });

  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isSummarized, setIsSummarized] = useState(false);
  const [isTranslated, setIsTranslated] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [flaggedTerms, setFlaggedTerms] = useState<FlaggedTerm[]>([]);
  const [translationResults, setTranslationResults] = useState<TranslationResult[]>([]);

  const formType = watch('formType');
  const title = watch('title');
  const category = watch('category');
  const subCategory = watch('subCategory');
  const description = watch('description');

  const handleFormTypeChange = (value: PostFormType) => {
    setValue('formType', value);
    setValue('placeName', '');
    setValue('address', '');
    setValue('pricePrefix', '');
    setValue('price', '');
    trigger();
  };

  const handleCategoryChange = (value: Category) => {
    setValue('category', value, { shouldValidate: true });
    setValue('subCategory', '', { shouldValidate: true });
    setIsTranslated(false);
    setTranslationResults([]);
  };

  const handleGenerateSummary = async () => {
    setIsSummarizing(true);

    try {
      const { title: t, content: c } = getValues();
      const summary = await generateSummary(t, c);
      setValue('description', summary, { shouldValidate: true });
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
      const { title: t, content: c, placeName: pn, address: addr } = getValues();

      const terms = await extractFlaggedTerms(
        c,
        pn || undefined,
        addr || undefined,
      );

      if (terms.length === 0) {
        const results = await translatePost({
          title: t,
          content: c,
          placeName: pn || undefined,
          address: addr || undefined,
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
  const isSubmitDisabled = !isValid || (needsTranslation && !isTranslated);

  return (
    <>
      <div className="mx-auto mb-6 max-w-[688px]">
        <h1 className="text-xl font-bold">게시글 작성</h1>
        <p className="mt-1 text-sm text-muted-foreground">새로운 게시글을 작성합니다.</p>
      </div>
      <div className="mx-auto max-w-[688px]">
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-base font-bold">
              폼 형식 <span className="text-primary-600">*</span>
            </label>
            <Controller
              name="formType"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value}
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
              )}
            />
          </div>
          <div>
            <label className="mb-1 block text-base font-bold">
              썸네일 <span className="text-primary-600">*</span>
            </label>
            <Controller
              name="thumbnail"
              control={control}
              render={({ field }) => (
                <ThumbnailUpload
                  thumbnail={field.value || null}
                  onThumbnailChange={(url) => field.onChange(url ?? '')}
                />
              )}
            />
          </div>
        </div>

        <div className="mt-8">
          <label className="mb-1 block text-base font-bold">
            본문 <span className="text-primary-600">*</span>
          </label>
          <Controller
            name="content"
            control={control}
            render={({ field }) => (
              <TiptapEditorContainer content={field.value} onChange={field.onChange}>
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <input
                      type="text"
                      {...register('title')}
                      maxLength={TITLE_MAX_LENGTH}
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
            )}
          />
        </div>

        <div className="mt-8">
          <label className="mb-1 block text-base font-bold">
            카테고리 <span className="text-primary-600">*</span>
          </label>
          <CategorySelector
            category={(category || '') as Category | ''}
            subCategory={(subCategory || '') as SubCategory | ''}
            onCategoryChange={handleCategoryChange}
            onSubCategoryChange={(value) => setValue('subCategory', value, { shouldValidate: true })}
          />
        </div>

        {formType === 'visit' && <VisitFields register={register} />}

        <div className="mt-8">
          <div className="mb-1 flex items-center justify-between">
            <label className="text-base font-bold">
              3줄 요약 <span className="text-primary-600">*</span>
            </label>
            <button
              type="button"
              onClick={handleGenerateSummary}
              disabled={isSummarized || isSummarizing}
              className="inline-flex items-center gap-1.5 border border-input px-3 py-1 text-xs font-semibold shadow-xs transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSummarized ? '요약 완료' : '요약 생성'}
              {isSummarizing && (
                <LoaderIcon className="size-3 animate-spin" />
              )}
            </button>
          </div>
          <Controller
            name="description"
            control={control}
            render={({ field }) => (
              <textarea
                value={field.value}
                onChange={(e) => {
                  field.onChange(e.target.value);
                  setIsSummarized(false);
                }}
                onBlur={field.onBlur}
                ref={field.ref}
                placeholder="3줄 요약을 입력해주세요."
                rows={3}
                className="w-full resize-none border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none placeholder:text-muted-foreground"
              />
            )}
          />
        </div>

        <div className="mt-10 flex items-center justify-end gap-3">
          {needsTranslation && !isTranslated && flaggedTerms.length === 0 && (
            <button
              type="button"
              onClick={handleTranslationStart}
              disabled={isExtracting || !description.trim()}
              className="inline-flex items-center gap-1.5 h-10 border border-input px-5 text-sm font-semibold shadow-xs transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
            >
              번역본 생성하기
              {isExtracting && (
                <LoaderIcon className="size-4 animate-spin" />
              )}
            </button>
          )}
          {needsTranslation && !isTranslated && flaggedTerms.length > 0 && (
            <button
              type="button"
              onClick={() => setIsSheetOpen(true)}
              className="h-10 border border-input px-5 text-sm font-semibold shadow-xs transition-colors hover:bg-accent"
            >
              용어 검토 계속하기
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
        content={watch('content')}
        placeName={watch('placeName') || undefined}
        address={watch('address') || undefined}
      />

      <TranslationPreviewSheet
        open={isPreviewOpen}
        onOpenChange={setIsPreviewOpen}
        originalTitle={title}
        originalContent={watch('content')}
        originalPlaceName={watch('placeName') || undefined}
        originalAddress={watch('address') || undefined}
        translations={translationResults}
      />
    </>
  );
}
