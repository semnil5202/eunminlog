'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ImageIcon, LoaderIcon, Save } from 'lucide-react';
import { toast } from 'sonner';

import { fetchDraft } from '@/features/draft/api';
import { useAutoSaveDraft } from '@/features/draft/hooks/useAutoSaveDraft';
import { fetchPost, updatePost } from '@/features/post-management/api/actions';
import {
  fetchCategoryOptions,
  type CategoryOption,
} from '@/features/category-management/api/actions';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
  TITLE_MAX_LENGTH,
  type PostFormValues,
} from '@/features/post-editor/types/form';
import { fetchRetrySingleLocale } from '@/features/translation/api/client';
import {
  TranslationEditSheet,
  type TranslationField,
} from '@/features/translation/components/TranslationEditSheet';
import { ImageAltSheet } from '@/features/post-editor/components/ImageAltSheet';
import { SlugField } from '@/shared/components/slug/SlugField';
import { AiGenerateButton } from '@/shared/components/ui/AiGenerateButton';

import type { PostFormType, TranslationLocale } from '@/shared/types/post';
import type { ImageAlt, TranslationResult } from '@/features/translation/types';

export default function EditPostPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [postData, setPostData] = useState<{
    post: {
      id: string;
      slug: string;
      title: string;
      description: string;
      content: string;
      category: string;
      sub_category: string;
      thumbnail: string;
      thumbnail_alt: string | null;
      is_multilingual: boolean;
      place_name: string | null;
      address: string | null;
      price_prefix: string | null;
      price: number | null;
    };
    translations: TranslationResult[];
    imageAlts?: ImageAlt[];
  } | null>(null);
  const [isLoadingPost, setIsLoadingPost] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetchPost(id)
      .then(setPostData)
      .catch(() => setNotFound(true))
      .finally(() => setIsLoadingPost(false));
  }, [id]);

  if (isLoadingPost) {
    return (
      <div className="flex h-40 items-center justify-center text-muted-foreground">
        게시글을 불러오는 중...
      </div>
    );
  }

  if (notFound || !postData) {
    return (
      <div className="space-y-4">
        <Link
          href="/posts"
          className="inline-flex text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-5" />
        </Link>
        <p className="text-muted-foreground">게시글을 찾을 수 없습니다.</p>
      </div>
    );
  }

  return (
    <EditPostForm
      postData={postData}
      postId={id}
      router={router}
      searchParams={searchParams}
    />
  );
}

function EditPostForm({
  postData,
  postId,
  router,
  searchParams,
}: {
  postData: {
    post: {
      id: string;
      slug: string;
      title: string;
      description: string;
      content: string;
      category: string;
      sub_category: string;
      thumbnail: string;
      thumbnail_alt: string | null;
      is_multilingual: boolean;
      place_name: string | null;
      address: string | null;
      price_prefix: string | null;
      price: number | null;
    };
    translations: TranslationResult[];
    imageAlts?: ImageAlt[];
  };
  postId: string;
  router: ReturnType<typeof useRouter>;
  searchParams: ReturnType<typeof useSearchParams>;
}) {
  const post = postData.post;

  const initialValues = useMemo<PostFormValues>(
    () => ({
      formType: (post.place_name ? 'visit' : 'product-review') as PostFormType,
      title: post.title,
      content: post.content,
      category: post.category,
      subCategory: post.sub_category,
      thumbnail: post.thumbnail,
      thumbnailAlt: post.thumbnail_alt ?? '',
      slug: post.slug,
      description: post.description,
      placeName: post.place_name ?? '',
      address: post.address ?? '',
      pricePrefix: post.price_prefix ?? '',
      price: post.price != null ? String(post.price) : '',
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- post data only changes when id changes
    [postId],
  );

  const { register, control, watch, setValue, getValues, reset, trigger, setFocus, formState } =
    useForm<PostFormValues>({
      resolver: zodResolver(postFormSchema),
      defaultValues: initialValues,
      mode: 'onSubmit',
    });

  const { errors, isDirty: isFormDirty } = formState;

  useEffect(() => {
    if (!isFormDirty) return;
    const handler = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isFormDirty]);

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
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
  const [translationResults, setTranslationResults] = useState<TranslationResult[]>(postData.translations);
  const [translationEditCompleted, setTranslationEditCompleted] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageAlts, setImageAlts] = useState<ImageAlt[]>(postData.imageAlts ?? []);
  const [isAltSheetOpen, setIsAltSheetOpen] = useState(false);

  const getTranslationData = useCallback(() => {
    if (translationResults.length === 0) return null;
    return { confirmedTerms: [], results: translationResults };
  }, [translationResults]);

  const getImageAltsCallback = useCallback(() => imageAlts, [imageAlts]);

  const { lastSavedAt, isSaving, saveManual, loadDraftId } = useAutoSaveDraft({
    getValues,
    getTranslationData,
    getImageAlts: getImageAltsCallback,
    postId,
  });

  useEffect(() => {
    const draftParam = searchParams.get('draft');
    if (!draftParam) return;

    fetchDraft(draftParam).then((draft) => {
      reset(draft.form_data);
      loadDraftId(draft.id);
      if (draft.translation_data) {
        setTranslationResults(draft.translation_data.results);
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
  const watchedContent = watch('content');
  const watchedPlaceName = watch('placeName');
  const watchedAddress = watch('address');
  const watchedPricePrefix = watch('pricePrefix');
  const watchedPrice = watch('price');

  const isMultilingual = post.is_multilingual;

  const dirtyTranslationFields = useMemo(() => {
    const fields = new Set<TranslationField>();
    if (title !== initialValues.title) fields.add('title');
    if (watchedContent !== initialValues.content) fields.add('content');
    if (description !== initialValues.description) fields.add('description');
    if (watchedPlaceName !== initialValues.placeName) fields.add('place_name');
    if (watchedAddress !== initialValues.address) fields.add('address');
    return fields;
  }, [title, watchedContent, description, watchedPlaceName, watchedAddress, initialValues]);

  const isDirty = dirtyTranslationFields.size > 0 ||
    watch('slug') !== initialValues.slug ||
    category !== initialValues.category ||
    subCategory !== initialValues.subCategory ||
    watch('thumbnail') !== initialValues.thumbnail ||
    watchedPricePrefix !== initialValues.pricePrefix ||
    watchedPrice !== initialValues.price;

  const needsTranslation = isMultilingual && !!(category && subCategory);
  const needsRetranslation = needsTranslation && dirtyTranslationFields.size > 0;
  const submitDisabled = needsRetranslation && !translationEditCompleted;

  const focusFirstEmptyField = () => {
    const values = getValues();
    const focusable = new Set<string>(['title', 'slug', 'placeName', 'address', 'price', 'description']);

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

  const handleCategoryChange = (value: string) => {
    setValue('category', value, { shouldValidate: true });
    setValue('subCategory', '', { shouldValidate: true });
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

  const handleRetranslateLocale = async (locale: TranslationLocale): Promise<TranslationResult> => {
    const { title: t, content: c, description: d, placeName: pn, address: addr } = getValues();
    const result = await fetchRetrySingleLocale(locale, {
      title: t,
      content: c,
      description: d,
      placeName: pn || undefined,
      address: addr || undefined,
      confirmedTerms: [],
      imageAlts: imageAlts.length > 0 ? imageAlts : undefined,
      thumbnailAlt: getValues('thumbnailAlt') || undefined,
    });
    setTranslationResults((prev) => prev.map((r) => (r.locale === locale ? result : r)));
    return result;
  };

  const handleTranslationEditComplete = () => {
    setTranslationEditCompleted(true);
  };

  const handleSubmitClick = async () => {
    const valid = await trigger();
    if (!valid) {
      focusFirstEmptyField();
      return;
    }

    if (submitDisabled) return;

    setShowSubmitDialog(true);
  };

  const handleConfirmSubmit = async () => {
    setIsSubmitting(true);
    try {
      await updatePost({
        id: postId,
        formValues: getValues(),
        translations: translationResults,
        imageAlts,
      });
      setShowSubmitDialog(false);
      toast.success('게시글이 수정되었습니다.');
      router.push('/posts');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '게시글 수정에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="mx-auto mb-6 max-w-[688px]">
        <a
          href="/posts"
          className="mb-3 inline-flex text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-5" />
        </a>
        <h1 className="text-xl font-bold">게시글 수정</h1>
        <p className="mt-1 text-sm text-muted-foreground">게시글을 수정합니다.</p>
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
            excludeId={postId}
          />
          {errors.slug && (
            <p className="mt-1 text-[14px] text-red-500">{errors.slug.message}</p>
          )}
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
                  setTranslationEditCompleted(false);
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
              마지막 임시저장: {lastSavedAt.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsAltSheetOpen(true)}
              className="inline-flex items-center gap-1.5 h-10 border border-input px-5 text-sm font-semibold shadow-xs transition-colors hover:bg-accent"
            >
              <ImageIcon className="size-4" />
              이미지 alt 입력
            </button>
            {needsTranslation && (
              <button
                type="button"
                onClick={() => setIsEditSheetOpen(true)}
                className="h-10 border border-input px-5 text-sm font-semibold shadow-xs transition-colors hover:bg-accent"
              >
                번역본 확인하기
              </button>
            )}
            <button
              type="button"
              onClick={saveManual}
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 h-10 border border-input px-5 text-sm font-semibold shadow-xs transition-colors hover:bg-accent disabled:opacity-50"
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
              disabled={submitDisabled}
              className="h-10 bg-primary px-5 text-sm font-medium text-primary-foreground shadow-xs transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              수정 완료
            </button>
          </div>
          {submitDisabled && isDirty && (
            <p className="mt-2 text-end text-[14px] text-red-500">
              수정된 번역 영역의 번역 요청이 먼저 필요합니다.
            </p>
          )}
        </div>
      </div>

      <ImageAltSheet
        open={isAltSheetOpen}
        onOpenChange={setIsAltSheetOpen}
        content={watchedContent}
        imageAlts={imageAlts}
        onComplete={setImageAlts}
        thumbnail={watch('thumbnail') || null}
        thumbnailAlt={watch('thumbnailAlt')}
        onThumbnailAltChange={(alt) => setValue('thumbnailAlt', alt, { shouldValidate: !!errors.thumbnailAlt })}
      />

      {needsTranslation && (
        <TranslationEditSheet
          open={isEditSheetOpen}
          onOpenChange={setIsEditSheetOpen}
          originalTitle={title}
          originalContent={watchedContent}
          originalDescription={description}
          originalPlaceName={watchedPlaceName || undefined}
          originalAddress={watchedAddress || undefined}
          translations={translationResults}
          dirtyFields={dirtyTranslationFields}
          onRetranslateLocale={handleRetranslateLocale}
          onTranslationEditComplete={handleTranslationEditComplete}
        />
      )}

      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>게시글 수정</AlertDialogTitle>
            <AlertDialogDescription>수정하시겠습니까?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSubmit} disabled={isSubmitting}>
              {isSubmitting ? '수정 중...' : '확인'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
