'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useSearchParams } from 'next/navigation';

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
import { ProductReviewFields } from '@/features/post-editor/components/ProductReviewFields';
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
import { fetchDraft } from '@/features/draft/api';
import { useAutoSaveDraft } from '@/features/draft/hooks/useAutoSaveDraft';
import { createPost } from '@/features/post-management/api/actions';
import {
  fetchCategoryOptions,
  type CategoryOption,
} from '@/features/category-management/api/actions';
import { ImageAltSheet, extractImageSrcs } from '@/features/post-editor/components/ImageAltSheet';
import { Check, ChevronLeft, ImageIcon, Languages, LoaderIcon, Save, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

import type { PostFormType, TranslationLocale } from '@/shared/types/post';
import type { FlaggedTerm, ImageAlt, TranslationResult } from '@/features/translation/types';

export default function NewPostPage() {
  return (
    <Suspense>
      <NewPostContent />
    </Suspense>
  );
}

function NewPostContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { register, control, watch, setValue, getValues, reset, trigger, setFocus, formState } =
    useForm<PostFormValues>({
      resolver: zodResolver(postFormSchema),
      defaultValues: POST_FORM_DEFAULTS,
      mode: 'onSubmit',
    });

  const { errors, isDirty } = formState;

  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const [categoryOptions, setCategoryOptions] = useState<CategoryOption[]>([]);
  const [subCategoryMap, setSubCategoryMap] = useState<Record<string, CategoryOption[]>>({});

  useEffect(() => {
    fetchCategoryOptions().then(({ parents, subMap }) => {
      setCategoryOptions(parents);
      setSubCategoryMap(subMap);
    });
  }, []);

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastConfirmedTerms, setLastConfirmedTerms] = useState<
    { original: string; confirmed: string }[]
  >([]);
  const [imageAlts, setImageAlts] = useState<ImageAlt[]>([]);
  const [isAltSheetOpen, setIsAltSheetOpen] = useState(false);
  const [imageAltError, setImageAltError] = useState(false);

  const getTranslationData = useCallback(() => {
    if (translationResults.length === 0) return null;
    return {
      confirmedTerms: lastConfirmedTerms.map((t) => ({
        original: t.original,
        translation: t.confirmed,
      })),
      results: translationResults,
    };
  }, [translationResults, lastConfirmedTerms]);

  const getImageAltsCallback = useCallback(() => imageAlts, [imageAlts]);

  const { draftId, lastSavedAt, isSaving, saveManual, loadDraftId } = useAutoSaveDraft({
    getValues,
    getTranslationData,
    getImageAlts: getImageAltsCallback,
  });

  useEffect(() => {
    const draftParam = searchParams.get('draft');
    if (!draftParam) return;

    fetchDraft(draftParam).then((draft) => {
      reset(draft.form_data);
      loadDraftId(draft.id);
      if (draft.translation_data) {
        setTranslationResults(draft.translation_data.results);
        setLastConfirmedTerms(
          draft.translation_data.confirmedTerms.map((t) => ({
            original: t.original,
            confirmed: t.translation,
          })),
        );
        setIsTranslated(true);
      }
      if (draft.image_alts.length > 0) {
        setImageAlts(draft.image_alts);
      }
    });
  }, [searchParams, reset, loadDraftId]);

  const formType = watch('formType');
  const title = watch('title');
  const description = watch('description');
  const category = watch('category');
  const subCategory = watch('subCategory');

  const isMultilingual =
    !!(category && subCategory) &&
    (subCategoryMap[category]?.find((opt) => opt.value === subCategory)?.isMultilingual ?? false);
  const needsTranslation = isMultilingual;

  const focusFirstEmptyField = () => {
    const values = getValues();
    const focusable = new Set<string>([
      'title',
      'slug',
      'placeName',
      'address',
      'price',
      'description',
      'productName',
      'purchaseSource',
    ]);

    const checks: [keyof PostFormValues, boolean][] = [
      ['title', !values.title.trim()],
      ['content', !values.content.trim()],
      ['thumbnail', !values.thumbnail],
      ['thumbnailAlt', !values.thumbnailAlt.trim()],
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

    if (formType === 'product-review') {
      checks.push(
        ['productName', !values.productName.trim()],
        ['purchaseSource', !values.purchaseSource.trim()],
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
    setValue('productName', '');
    setValue('purchaseSource', '');
    setValue('purchaseLink', '');
  };

  const handleCategoryChange = (value: string) => {
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

      const altTexts = imageAlts.length > 0 ? imageAlts.map((a) => a.alt) : undefined;
      const terms = await fetchExtractTerms(c, pn || undefined, addr || undefined, altTexts);

      if (terms.length === 0) {
        const params = {
          title: t,
          content: c,
          description: d,
          placeName: pn || undefined,
          address: addr || undefined,
          confirmedTerms: [] as { original: string; confirmed: string }[],
          imageAlts: imageAlts.length > 0 ? imageAlts : undefined,
          thumbnailAlt: getValues('thumbnailAlt') || undefined,
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
    setImageAltError(false);

    const thumbnailAltFilled = !getValues('thumbnail') || getValues('thumbnailAlt').trim();
    const srcs = extractImageSrcs(getValues('content'));
    const contentAltsFilled = srcs.every((src) => {
      const found = imageAlts.find((a) => a.src === src);
      return found && found.alt.trim();
    });
    if (!thumbnailAltFilled || !contentAltsFilled) {
      setImageAltError(true);
      return;
    }

    const valid = await trigger();
    if (!valid) {
      focusFirstEmptyField();
      return;
    }

    handleTranslationStart();
  };

  const handleSubmitClick = async () => {
    setTranslationError(false);
    setImageAltError(false);

    const valid = await trigger();
    if (!valid) {
      focusFirstEmptyField();
      return;
    }

    if (needsTranslation && !isTranslated) {
      setTranslationError(true);
      return;
    }

    setIsSubmitting(true);
    try {
      await createPost({
        formValues: getValues(),
        translations: translationResults,
        imageAlts,
        draftId: draftId,
      });
      toast.success('게시글이 작성되었습니다.');
      router.push('/posts');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '게시글 작성에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
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
      imageAlts: imageAlts.length > 0 ? imageAlts : undefined,
      thumbnailAlt: getValues('thumbnailAlt') || undefined,
    });
    setTranslationResults((prev) => prev.map((r) => (r.locale === locale ? result : r)));
    return result;
  };

  const handleRetryAll = async () => {
    const { title: t, content: c, description: d, placeName: pn, address: addr } = getValues();
    const results = await fetchTranslatePost({
      title: t,
      content: c,
      description: d,
      placeName: pn || undefined,
      address: addr || undefined,
      confirmedTerms: lastConfirmedTerms,
      imageAlts: imageAlts.length > 0 ? imageAlts : undefined,
      thumbnailAlt: getValues('thumbnailAlt') || undefined,
    });
    setTranslationResults(results);
  };

  return (
    <>
      <div className="mx-auto mb-6 max-w-[688px]">
        <a href="/posts" className="mb-3 inline-flex text-muted-foreground hover:text-foreground">
          <ChevronLeft className="size-5" />
        </a>
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
                  onThumbnailChange={(url) => {
                    field.onChange(url ?? '');
                    if (!url) setValue('thumbnailAlt', '');
                  }}
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
          {errors.slug && <p className="mt-1 text-[14px] text-red-500">{errors.slug.message}</p>}
          <p className="mt-1 text-xs text-muted-foreground">
            * 슬러그는 SEO에 직접 반영되는 요소입니다. 신중하게 선택해주세요.
          </p>
        </div>

        <div id="field-category" className="mt-8">
          <label className="mb-1 block text-base font-bold">
            카테고리 <span className="text-primary-600">*</span>
          </label>
          <CategorySelector
            category={category || ''}
            subCategory={subCategory || ''}
            onCategoryChange={handleCategoryChange}
            onSubCategoryChange={(value) =>
              setValue('subCategory', value, { shouldValidate: true })
            }
            categoryOptions={categoryOptions}
            subCategoryMap={subCategoryMap}
          />
          {(errors.category || errors.subCategory) && (
            <p className="mt-1 text-[14px] text-red-500">
              {errors.category?.message || errors.subCategory?.message}
            </p>
          )}
        </div>

        {formType === 'visit' && (
          <VisitFields register={register} errors={errors} setValue={setValue} />
        )}
        {formType === 'product-review' && (
          <ProductReviewFields register={register} errors={errors} setValue={setValue} />
        )}

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
          {lastSavedAt && (
            <p className="mb-2 text-end text-xs text-muted-foreground">
              마지막 임시저장:{' '}
              {lastSavedAt.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:justify-end sm:gap-3">
            <button
              type="button"
              onClick={() => setIsAltSheetOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 h-10 border border-input px-5 text-sm font-semibold shadow-xs transition-colors hover:bg-accent"
            >
              <ImageIcon className="size-4" />
              이미지 alt 입력
            </button>
            {needsTranslation && !isTranslated && flaggedTerms.length === 0 && (
              <button
                type="button"
                onClick={handleTranslateClick}
                className="inline-flex items-center justify-center gap-1.5 h-10 border border-input px-5 text-sm font-semibold shadow-xs transition-colors hover:bg-accent"
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
                className="inline-flex items-center justify-center h-10 border border-input px-5 text-sm font-semibold shadow-xs transition-colors hover:bg-accent"
              >
                용어 검토 계속하기
              </button>
            )}
            {isTranslated && (
              <button
                type="button"
                onClick={() => setIsPreviewOpen(true)}
                className="inline-flex items-center justify-center gap-1.5 h-10 border border-input px-5 text-sm font-semibold shadow-xs transition-colors hover:bg-accent"
              >
                <Languages className="size-4" />
                번역본 확인하기
              </button>
            )}
            <button
              type="button"
              onClick={saveManual}
              disabled={isSaving}
              className="inline-flex items-center justify-center gap-1.5 h-10 border border-input px-5 text-sm font-semibold shadow-xs transition-colors hover:bg-accent disabled:opacity-50"
            >
              {isSaving ? (
                <LoaderIcon className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              임시저장
            </button>
            <button
              type="button"
              onClick={handleSubmitClick}
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-1.5 h-10 bg-primary px-5 text-sm font-medium text-primary-foreground shadow-xs transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? (
                <LoaderIcon className="size-4 animate-spin" />
              ) : (
                <Check className="size-4" />
              )}
              {isSubmitting ? '작성 중...' : '작성 완료'}
            </button>
          </div>
          {imageAltError && (
            <p className="mt-2 text-end text-[14px] text-red-500">
              이미지 alt 입력이 먼저 필요합니다.
            </p>
          )}
          {translationError && (
            <p className="mt-2 text-end text-[14px] text-red-500">번역본 생성이 먼저 필요합니다.</p>
          )}
        </div>
      </div>

      <ImageAltSheet
        open={isAltSheetOpen}
        onOpenChange={setIsAltSheetOpen}
        content={watch('content')}
        imageAlts={imageAlts}
        onComplete={setImageAlts}
        thumbnail={watch('thumbnail') || null}
        thumbnailAlt={watch('thumbnailAlt')}
        onThumbnailAltChange={(alt) =>
          setValue('thumbnailAlt', alt, { shouldValidate: !!errors.thumbnailAlt })
        }
      />

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
        imageAlts={imageAlts}
        thumbnailAlt={watch('thumbnailAlt') || undefined}
      />

      <TranslationPreviewSheet
        open={isPreviewOpen}
        onOpenChange={setIsPreviewOpen}
        originalTitle={title}
        originalContent={watch('content')}
        originalPlaceName={watch('placeName') || undefined}
        originalAddress={watch('address') || undefined}
        originalImageAlts={imageAlts.length > 0 ? imageAlts : undefined}
        originalThumbnailAlt={watch('thumbnailAlt') || undefined}
        translations={translationResults}
        onRetryLocale={handleRetryLocale}
        onRetryAll={handleRetryAll}
      />
    </>
  );
}
