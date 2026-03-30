'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
  Check,
  ChevronLeft,
  ClipboardCopy,
  ImageIcon,
  Languages,
  LoaderIcon,
  Save,
} from 'lucide-react';
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
import { ProductReviewFields } from '@/features/post-editor/components/ProductReviewFields';
import { VisitFields } from '@/features/post-editor/components/VisitFields';
import { TiptapEditorContainer } from '@/features/post-editor/containers/TiptapEditorContainer';
import { FORM_TYPE_OPTIONS } from '@/features/post-editor/constants/category';
import { SUMMARY_SYSTEM_PROMPT } from '@/shared/constants/prompts';
import {
  postFormSchema,
  TITLE_MAX_LENGTH,
  type PostFormValues,
} from '@/features/post-editor/types/form';
import { ImageAltSheet } from '@/features/post-editor/components/ImageAltSheet';
import { SlugField } from '@/shared/components/slug/SlugField';

import type { PostFormType } from '@/shared/types/post';
import type { ImageAlt, TranslationResult } from '@/features/translation/types';
import { ManualTranslationSheet } from '@/features/translation/components/ManualTranslationSheet';
import {
  toTranslationResults,
  type ParsedLocaleResult,
} from '@/features/translation/lib/prompt-parser';

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
      price_prefix: string[] | null;
      price: number[] | null;
      product_name: string[] | null;
      purchase_source: string[] | null;
      purchase_link: string[] | null;
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
        <Link href="/posts" className="inline-flex text-muted-foreground hover:text-foreground">
          <ChevronLeft className="size-5" />
        </Link>
        <p className="text-muted-foreground">게시글을 찾을 수 없습니다.</p>
      </div>
    );
  }

  return (
    <EditPostForm postData={postData} postId={id} router={router} searchParams={searchParams} />
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
      price_prefix: string[] | null;
      price: number[] | null;
      product_name: string[] | null;
      purchase_source: string[] | null;
      purchase_link: string[] | null;
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
      formType: (post.product_name && post.product_name.length > 0
        ? 'product-review'
        : 'visit') as PostFormType,
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
      pricePrefix: Array.isArray(post.price_prefix)
        ? (post.price_prefix[0] ?? '')
        : (post.price_prefix ?? ''),
      price:
        Array.isArray(post.price) && !post.product_name?.length
          ? post.price[0] != null
            ? String(post.price[0])
            : ''
          : '',
      products:
        post.product_name && post.product_name.length > 0
          ? post.product_name.map((name, i) => ({
              name,
              source: post.purchase_source?.[i] ?? '',
              link: post.purchase_link?.[i] ?? '',
              pricePrefix: post.price_prefix?.[i] ?? '',
              price: post.price?.[i] != null ? String(post.price[i]) : '',
            }))
          : [{ name: '', source: '', link: '', pricePrefix: '', price: '' }],
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

  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageAlts, setImageAlts] = useState<ImageAlt[]>(postData.imageAlts ?? []);
  const [isAltSheetOpen, setIsAltSheetOpen] = useState(false);
  const [isManualTranslationOpen, setIsManualTranslationOpen] = useState(false);
  const [manualTranslationRaw, setManualTranslationRaw] = useState('');
  const [manualTranslationResults, setManualTranslationResults] = useState<ParsedLocaleResult[]>(
    [],
  );

  const getTranslationData = useCallback(() => {
    if (manualTranslationResults.length === 0) return null;
    return {
      confirmedTerms: [],
      results: toTranslationResults(manualTranslationResults),
    };
  }, [manualTranslationResults]);

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
      const formData = draft.form_data as PostFormValues & {
        productName?: string;
        purchaseSource?: string;
        purchaseLink?: string;
      };
      if (!formData.products) {
        formData.products = formData.productName
          ? [
              {
                name: formData.productName,
                source: formData.purchaseSource ?? '',
                link: formData.purchaseLink ?? '',
                pricePrefix: '',
                price: '',
              },
            ]
          : [{ name: '', source: '', link: '', pricePrefix: '', price: '' }];
      } else {
        formData.products = formData.products.map((p) => ({
          ...p,
          pricePrefix: (p as { pricePrefix?: string }).pricePrefix ?? '',
          price: (p as { price?: string }).price ?? '',
        }));
      }
      reset(formData);
      loadDraftId(draft.id);
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
  const watchedProducts = watch('products');

  const currentValidProducts = watchedProducts.filter((p) => p.name.trim());

  const isMultilingual = post.is_multilingual;

  const needsTranslation = isMultilingual && !!(category && subCategory);

  const focusFirstEmptyField = () => {
    const values = getValues();
    const focusable = new Set<string>([
      'title',
      'slug',
      'placeName',
      'address',
      'price',
      'description',
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
      checks.push(['price', !values.price.trim()]);
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
    setValue('products', [{ name: '', source: '', link: '', pricePrefix: '', price: '' }]);
  };

  const handleCategoryChange = (value: string) => {
    setValue('category', value, { shouldValidate: true });
    setValue('subCategory', '', { shouldValidate: true });
  };

  const handleCopySummaryPrompt = async () => {
    const contentText = watchedContent.replace(/<[^>]*>/g, '').trim();
    if (!contentText) {
      toast.error('본문을 먼저 입력해주세요.');
      return;
    }
    const prompt = `${SUMMARY_SYSTEM_PROMPT}\n\n제목: ${title}\n\n본문:\n${contentText}\n\n위 내용을 바탕으로 3줄 요약을 작성해주세요. 각 줄은 줄바꿈(\\n)으로 구분해주세요.`;
    await navigator.clipboard.writeText(prompt);
    toast.success('3줄 요약 프롬프트가 복사되었습니다.');
  };

  const handleSubmitClick = async () => {
    const valid = await trigger();
    if (!valid) {
      focusFirstEmptyField();
      return;
    }

    if (needsTranslation && manualTranslationResults.length === 0) {
      toast.error('번역을 먼저 완료해주세요.');
      return;
    }

    setShowSubmitDialog(true);
  };

  const handleConfirmSubmit = async () => {
    setIsSubmitting(true);
    try {
      await updatePost({
        id: postId,
        formValues: getValues(),
        translations: toTranslationResults(manualTranslationResults),
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
        <a href="/posts" className="mb-3 inline-flex text-muted-foreground hover:text-foreground">
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
          {errors.slug && <p className="mt-1 text-[14px] text-red-500">{errors.slug.message}</p>}
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
          <ProductReviewFields control={control} setValue={setValue} />
        )}

        <div className="mt-8">
          <div className="mb-1 flex items-center justify-between">
            <label className="text-base font-bold">
              3줄 요약 <span className="text-primary-600">*</span>
            </label>
            <button
              type="button"
              onClick={handleCopySummaryPrompt}
              disabled={!watchedContent.trim()}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ClipboardCopy className="size-3.5" />
              3줄 요약 프롬프트 복사
            </button>
          </div>
          <Controller
            name="description"
            control={control}
            render={({ field }) => (
              <textarea
                value={field.value}
                onChange={field.onChange}
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
            {needsTranslation && (
              <button
                type="button"
                onClick={() => setIsManualTranslationOpen(true)}
                className="inline-flex items-center justify-center gap-1.5 h-10 border border-input px-5 text-sm font-semibold shadow-xs transition-colors hover:bg-accent"
              >
                <Languages className="size-4" />
                번역하기
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
              {isSubmitting ? '수정 중...' : '수정 완료'}
            </button>
          </div>
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
        onThumbnailAltChange={(alt) =>
          setValue('thumbnailAlt', alt, { shouldValidate: !!errors.thumbnailAlt })
        }
      />

      <ManualTranslationSheet
        open={isManualTranslationOpen}
        onOpenChange={setIsManualTranslationOpen}
        formType={formType as 'visit' | 'product-review'}
        title={title}
        content={watchedContent}
        description={description}
        placeName={watch('placeName') || undefined}
        address={watch('address') || undefined}
        pricePrefix={watch('pricePrefix') || undefined}
        productNames={currentValidProducts.map((p) => p.name).filter(Boolean)}
        purchaseSources={currentValidProducts.map((p) => p.source).filter(Boolean)}
        pricePrefixes={currentValidProducts.map((p) => p.pricePrefix).filter(Boolean)}
        imageAlts={imageAlts}
        thumbnailAlt={watch('thumbnailAlt') || undefined}
        savedRawText={manualTranslationRaw}
        savedResults={manualTranslationResults}
        onResultsChange={(raw, results) => {
          setManualTranslationRaw(raw);
          setManualTranslationResults(results);
        }}
      />

      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>게시글 수정</AlertDialogTitle>
            <AlertDialogDescription>수정하시겠습니까?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmSubmit}
              onSelect={(e) => e.preventDefault()}
              disabled={isSubmitting}
            >
              {isSubmitting ? '수정 중...' : '확인'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
