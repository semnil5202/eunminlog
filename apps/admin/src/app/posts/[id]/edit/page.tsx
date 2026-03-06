'use client';

import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { ChevronLeft, LoaderIcon, Save } from 'lucide-react';
import { toast } from 'sonner';

import { fetchDraft } from '@/features/draft/api';
import { useAutoSaveDraft } from '@/features/draft/hooks/useAutoSaveDraft';

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
import { SlugField } from '@/shared/components/slug/SlugField';
import { AiGenerateButton } from '@/shared/components/ui/AiGenerateButton';

import type { Category, PostFormType, SubCategory, TranslationLocale } from '@/shared/types/post';
import type { TranslationResult } from '@/features/translation/types';

const MOCK_POST = {
  id: '1',
  title: '강남역 숨은 파스타 맛집 베스트 5',
  slug: 'gangnam-pasta-best-5',
  content: '<p>강남역 주변에는 정말 맛있는 파스타 집이 많습니다.</p>',
  description: '강남역 파스타 맛집을 소개합니다.\n숨겨진 보석 같은 곳들을 모았습니다.\n가격 대비 최고의 맛을 자랑합니다.',
  category: 'delicious' as Category,
  subCategory: 'western' as SubCategory,
  thumbnail: 'https://media.eunminlog.site/mock-thumbnail.webp',
  formType: 'visit' as PostFormType,
  placeName: '파스타공방',
  address: '서울특별시 강남구 강남대로 123',
  pricePrefix: '메인 메뉴 평균 가격: ',
  price: '2',
  isMultilingual: true,
};

const MOCK_TRANSLATIONS: TranslationResult[] = [
  { locale: 'en', title: 'Top 5 Hidden Pasta Restaurants Near Gangnam Station', content: '<p>There are many delicious pasta restaurants near Gangnam Station.</p>', description: 'Introducing pasta restaurants near Gangnam Station.\nHidden gems collected for you.\nBest taste for the price.', place_name: 'Pasta Workshop', address: '123 Gangnam-daero, Gangnam-gu, Seoul' },
  { locale: 'ja', title: '江南駅の隠れたパスタ名店ベスト5', content: '<p>江南駅周辺には本当に美味しいパスタ屋さんがたくさんあります。</p>', description: '江南駅のパスタ名店をご紹介します。\n隠れた宝石のようなお店を集めました。\nコスパ最高の味を誇ります。', place_name: 'パスタ工房', address: 'ソウル特別市江南区江南大路123' },
  { locale: 'zh-CN', title: '江南站隐藏意面美食店Top 5', content: '<p>江南站周围有很多好吃的意面店。</p>', description: '介绍江南站的意面美食店。\n收集了隐藏的宝石般的店铺。\n性价比最高的美味。', place_name: '意面工坊', address: '首尔特别市江南区江南大路123号' },
  { locale: 'zh-TW', title: '江南站隱藏義大利麵美食店Top 5', content: '<p>江南站周圍有很多好吃的義大利麵店。</p>', description: '介紹江南站的義大利麵美食店。\n收集了隱藏的寶石般的店鋪。\n性價比最高的美味。', place_name: '義大利麵工坊', address: '首爾特別市江南區江南大路123號' },
  { locale: 'id', title: 'Top 5 Restoran Pasta Tersembunyi di Stasiun Gangnam', content: '<p>Ada banyak restoran pasta yang lezat di sekitar Stasiun Gangnam.</p>', description: 'Memperkenalkan restoran pasta di Stasiun Gangnam.\nPermata tersembunyi dikumpulkan untuk Anda.\nRasa terbaik untuk harganya.', place_name: 'Pasta Workshop', address: '123 Gangnam-daero, Gangnam-gu, Seoul' },
  { locale: 'vi', title: 'Top 5 Nhà hàng Pasta Ẩn giấu Gần Ga Gangnam', content: '<p>Xung quanh ga Gangnam có rất nhiều nhà hàng pasta ngon.</p>', description: 'Giới thiệu các nhà hàng pasta gần ga Gangnam.\nNhững viên ngọc ẩn giấu được thu thập cho bạn.\nHương vị tuyệt vời nhất với giá cả.', place_name: 'Pasta Workshop', address: '123 Gangnam-daero, Gangnam-gu, Seoul' },
  { locale: 'th', title: 'Top 5 ร้านพาสต้าลับใกล้สถานีคังนัม', content: '<p>บริเวณสถานีคังนัมมีร้านพาสต้าอร่อยมากมาย</p>', description: 'แนะนำร้านพาสต้าใกล้สถานีคังนัม\nรวบรวมร้านเด็ดที่ซ่อนอยู่\nรสชาติดีที่สุดคุ้มราคา', place_name: 'พาสต้าเวิร์คช็อป', address: '123 คังนัมแดโร, คังนัม-กู, โซล' },
];

export default function EditPostPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();

  // TODO: getPost(id) Server Action 호출로 교체
  const post = { ...MOCK_POST, id };

  const initialValues = useMemo<PostFormValues>(
    () => ({
      formType: post.formType,
      title: post.title,
      content: post.content,
      category: post.category,
      subCategory: post.subCategory,
      thumbnail: post.thumbnail,
      slug: post.slug,
      description: post.description,
      placeName: post.placeName,
      address: post.address,
      pricePrefix: post.pricePrefix,
      price: post.price,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- post data only changes when id changes
    [post.id],
  );

  const { register, control, watch, setValue, getValues, reset, trigger, setFocus, formState } =
    useForm<PostFormValues>({
      resolver: zodResolver(postFormSchema),
      defaultValues: initialValues,
      mode: 'onSubmit',
    });

  const { errors } = formState;

  const { lastSavedAt, isSaving, saveManual, loadDraftId } = useAutoSaveDraft({
    getValues,
    postId: id,
  });

  useEffect(() => {
    const draftParam = searchParams.get('draft');
    if (!draftParam) return;

    fetchDraft(draftParam).then((draft) => {
      reset(draft.form_data);
      loadDraftId(draft.id);
    });
  }, [searchParams, reset, loadDraftId]);

  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isSummarized, setIsSummarized] = useState(false);
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
  const [translationResults, setTranslationResults] = useState<TranslationResult[]>(MOCK_TRANSLATIONS);
  const [translationEditCompleted, setTranslationEditCompleted] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);

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

  const isMultilingual = post.isMultilingual;

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

  const handleConfirmSubmit = () => {
    setShowSubmitDialog(false);
    // TODO: updatePost + saveTranslations Server Action 호출
    toast.success('게시글이 수정되었습니다.');
  };

  return (
    <>
      <div className="mx-auto mb-6 max-w-[688px]">
        <Link
          href="/posts"
          className="mb-3 inline-flex text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-5" />
        </Link>
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
              onClick={handleSubmitClick}
              disabled={submitDisabled}
              className="h-10 bg-primary-600 px-5 text-sm font-bold text-white shadow-xs transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
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
            <AlertDialogAction onClick={handleConfirmSubmit}>확인</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
