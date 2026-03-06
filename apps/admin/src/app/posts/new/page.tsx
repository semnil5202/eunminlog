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
import { streamSummary } from '@/features/post-editor/api/client';
import {
  postFormSchema,
  POST_FORM_DEFAULTS,
  TITLE_MAX_LENGTH,
  type PostFormValues,
} from '@/features/post-editor/types/form';
import {
  fetchExtractTerms,
  fetchTranslatePost,
  fetchRetrySingleLocale,
} from '@/features/translation/api/client';
import { LOCALE_FILTER_LABELS } from '@/features/translation/constants/locale';
import { TranslationPreviewSheet } from '@/features/translation/components/TranslationPreviewSheet';
import { TranslationSheetContainer } from '@/features/translation/containers/TranslationSheetContainer';
import { SlugField } from '@/shared/components/slug/SlugField';
import { AiGenerateButton } from '@/shared/components/ui/AiGenerateButton';
import { LoaderIcon, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

import type { Category, PostFormType, SubCategory, TranslationLocale } from '@/shared/types/post';
import type { FlaggedTerm, TranslationResult } from '@/features/translation/types';

export default function NewPostPage() {
  const { register, control, watch, setValue, getValues, trigger, setFocus, formState } =
    useForm<PostFormValues>({
      resolver: zodResolver(postFormSchema),
      defaultValues: POST_FORM_DEFAULTS,
      mode: 'onSubmit',
    });

  const { errors } = formState;

  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isSummarized, setIsSummarized] = useState(false);
  const [isTranslated, setIsTranslated] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [flaggedTerms, setFlaggedTerms] = useState<FlaggedTerm[]>([]);
  const [translationResults, setTranslationResults] = useState<TranslationResult[]>([]);
  const [translationError, setTranslationError] = useState(false);
  const [extractionFailed, setExtractionFailed] = useState(false);
  const [lastConfirmedTerms, setLastConfirmedTerms] = useState<
    { original: string; confirmed: string }[]
  >([]);

  const formType = watch('formType');
  const title = watch('title');
  const description = watch('description');
  const category = watch('category');
  const subCategory = watch('subCategory');

  const needsTranslation = !!(category && subCategory);

  const focusFirstEmptyField = () => {
    const values = getValues();
    const focusable = new Set<string>(['title', 'slug', 'placeName', 'address', 'price', 'description']);

    const checks: [keyof PostFormValues, boolean][] = [
      ['title', !values.title.trim()],
      ['content', !values.content.trim()],
      ['thumbnail', !values.thumbnail],
      ['category', !values.category],
      ['subCategory', !values.subCategory],
    ];

    if (formType === 'visit') {
      checks.push(
        ['placeName', !values.placeName.trim()],
        ['address', !values.address.trim()],
        ['price', !values.price.trim()],
      );
    }

    checks.push(['description', !values.description.trim()]);

    for (const [name, isEmpty] of checks) {
      if (!isEmpty) continue;

      const el = focusable.has(name)
        ? document.querySelector<HTMLElement>(`[name="${name}"]`)
        : document.getElementById(`field-${name}`);

      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });

      if (focusable.has(name)) {
        setTimeout(() => setFocus(name), 300);
      }
      break;
    }
  };

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
    setTranslationError(false);
  };

  const handleGenerateSummary = async () => {
    setIsSummarizing(true);

    try {
      const { title: t, content: c } = getValues();
      const summary = await streamSummary(t, c, (partial) => {
        setValue('description', partial);
      });
      setValue('description', summary, { shouldValidate: true });
      setIsSummarized(true);
    } catch {
      toast.error('요약 생성에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleTranslationStart = async () => {
    setIsExtracting(true);
    setExtractionFailed(false);

    try {
      const { title: t, content: c, description: d, placeName: pn, address: addr } = getValues();

      const terms = await fetchExtractTerms(c, pn || undefined, addr || undefined);

      if (terms.length === 0) {
        const params = {
          title: t,
          content: c,
          description: d,
          placeName: pn || undefined,
          address: addr || undefined,
          confirmedTerms: [] as { original: string; confirmed: string }[],
        };
        const results = await fetchTranslatePost(params);
        setLastConfirmedTerms([]);

        const failedLocales = results.filter((r) => r.failed);
        for (const r of failedLocales) {
          const label = LOCALE_FILTER_LABELS[r.locale];
          toast.error(`${label} 번역에 실패했습니다. 번역본 확인에서 다시 시도해주세요.`);
        }

        setTranslationResults(results);
        setIsTranslated(true);
        setTimeout(() => setIsPreviewOpen(true), 800);
      } else {
        setFlaggedTerms(terms);
        setIsSheetOpen(true);
      }
    } catch {
      setExtractionFailed(true);
      toast.error('번역 용어 추출에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleTranslateClick = async () => {
    if (isExtracting) return;

    const valid = await trigger();
    if (!valid) {
      focusFirstEmptyField();
      return;
    }

    handleTranslationStart();
  };

  const handleSubmitClick = async () => {
    setTranslationError(false);

    const valid = await trigger();
    if (!valid) {
      focusFirstEmptyField();
      return;
    }

    if (needsTranslation && !isTranslated) {
      setTranslationError(true);
      return;
    }

    // TODO: 작성 완료 처리
  };

  const handleTranslationComplete = (
    results: TranslationResult[],
    confirmedTerms: { original: string; confirmed: string }[],
  ) => {
    setTranslationResults(results);
    setLastConfirmedTerms(confirmedTerms);
    setIsTranslated(true);
    setIsSheetOpen(false);
    setTranslationError(false);
    setTimeout(() => setIsPreviewOpen(true), 800);
  };

  const handleRetryLocale = async (locale: TranslationLocale) => {
    const { title: t, content: c, description: d, placeName: pn, address: addr } = getValues();
    const result = await fetchRetrySingleLocale(locale, {
      title: t,
      content: c,
      description: d,
      placeName: pn || undefined,
      address: addr || undefined,
      confirmedTerms: lastConfirmedTerms,
    });
    setTranslationResults((prev) => prev.map((r) => (r.locale === locale ? result : r)));
    return result;
  };

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
          <div id="field-thumbnail">
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
            {errors.thumbnail && (
              <p className="mt-1 text-[14px] text-red-500">{errors.thumbnail.message}</p>
            )}
          </div>
        </div>

        <div id="field-content" className="mt-8">
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
                  {errors.title && (
                    <p className="mt-1 text-[14px] text-red-500">{errors.title.message}</p>
                  )}
                </div>
                <Separator />
              </TiptapEditorContainer>
            )}
          />
          {errors.content && (
            <p className="mt-1 text-[14px] text-red-500">{errors.content.message}</p>
          )}
        </div>

        <div className="mt-8">
          <label className="mb-1 block text-base font-bold">
            슬러그 <span className="text-primary-600">*</span>
          </label>
          <SlugField
            sourceText={title}
            value={watch('slug')}
            onChange={(slug) => setValue('slug', slug, { shouldValidate: true })}
            placeholder="예: gangnam-pasta-review"
          />
          {errors.slug && (
            <p className="mt-1 text-[14px] text-red-500">{errors.slug.message}</p>
          )}
          <p className="mt-1 text-xs text-muted-foreground">
            * 슬러그는 SEO에 직접 반영되는 요소입니다. 신중하게 선택해주세요.
          </p>
        </div>

        <div id="field-category" className="mt-8">
          <label className="mb-1 block text-base font-bold">
            카테고리 <span className="text-primary-600">*</span>
          </label>
          <CategorySelector
            category={(category || '') as Category | ''}
            subCategory={(subCategory || '') as SubCategory | ''}
            onCategoryChange={handleCategoryChange}
            onSubCategoryChange={(value) =>
              setValue('subCategory', value, { shouldValidate: true })
            }
          />
          {(errors.category || errors.subCategory) && (
            <p className="mt-1 text-[14px] text-red-500">
              {errors.category?.message || errors.subCategory?.message}
            </p>
          )}
        </div>

        {formType === 'visit' && <VisitFields register={register} errors={errors} setValue={setValue} />}

        <div className="mt-8">
          <div className="mb-1 flex items-center justify-between">
            <label className="text-base font-bold">
              3줄 요약 <span className="text-primary-600">*</span>
            </label>
            <AiGenerateButton
              onClick={handleGenerateSummary}
              isLoading={isSummarizing}
              isCompleted={isSummarized}
              disabled={!watch('content').trim()}
              hasExistingValue={!!description.trim()}
            />
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
                className={`w-full resize-none border ${errors.description ? 'border-red-500' : 'border-input'} bg-transparent px-3 py-2 text-sm shadow-xs outline-none placeholder:text-muted-foreground`}
              />
            )}
          />
          {errors.description && (
            <p className="mt-1 text-[14px] text-red-500">{errors.description.message}</p>
          )}
        </div>

        <div className="mt-10">
          <div className="flex items-center justify-end gap-3">
            {needsTranslation && !isTranslated && flaggedTerms.length === 0 && (
              <button
                type="button"
                onClick={handleTranslateClick}
                className="inline-flex items-center gap-1.5 h-10 border border-input px-5 text-sm font-semibold shadow-xs transition-colors hover:bg-accent"
              >
                {isExtracting ? (
                  <LoaderIcon className="size-4 animate-spin" />
                ) : (
                  <Sparkles className="size-4" />
                )}
                {extractionFailed ? 'AI 번역본 재생성하기' : 'AI 번역본 생성하기'}
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
              onClick={handleSubmitClick}
              className="h-10 bg-primary-600 px-5 text-sm font-bold text-white shadow-xs transition-colors hover:bg-primary-700"
            >
              작성 완료
            </button>
          </div>
          {translationError && (
            <p className="mt-2 text-end text-[14px] text-red-500">번역본 생성이 먼저 필요합니다.</p>
          )}
        </div>
      </div>

      <TranslationSheetContainer
        open={isSheetOpen}
        onOpenChange={setIsSheetOpen}
        onTranslationComplete={handleTranslationComplete}
        initialTerms={flaggedTerms}
        title={title}
        content={watch('content')}
        description={description}
        placeName={watch('placeName')}
        address={watch('address')}
      />

      <TranslationPreviewSheet
        open={isPreviewOpen}
        onOpenChange={setIsPreviewOpen}
        originalTitle={title}
        originalContent={watch('content')}
        originalPlaceName={watch('placeName') || undefined}
        originalAddress={watch('address') || undefined}
        translations={translationResults}
        onRetryLocale={handleRetryLocale}
      />
    </>
  );
}
