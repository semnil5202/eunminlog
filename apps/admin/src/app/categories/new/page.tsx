'use client';

import { useEffect, useState } from 'react';

import Link from 'next/link';
import { ChevronLeft, LoaderIcon, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { SlugField } from '@/shared/components/slug/SlugField';
import { LOCALE_LABELS } from '@/features/translation/constants/locale';

import {
  createChildCategory,
  createParentCategory,
  fetchParentCategories,
} from '@/features/category-management/api/actions';
import { translateCategoryName } from '@/features/category-management/api/client';

import type { TranslationLocale } from '@/shared/types/post';

const LOCALES = Object.keys(LOCALE_LABELS) as TranslationLocale[];

export default function NewCategoryPage() {
  const [parentOptions, setParentOptions] = useState<{ slug: string; name: string }[]>([]);

  const [categoryName, setCategoryName] = useState('');
  const [categorySlug, setCategorySlug] = useState('');
  const [parentMultilingual, setParentMultilingual] = useState(false);
  const [parentTranslations, setParentTranslations] = useState<Record<string, string>>({});
  const [isParentTranslating, setIsParentTranslating] = useState(false);
  const [isCreatingParent, setIsCreatingParent] = useState(false);
  const [parentErrors, setParentErrors] = useState<Record<string, string>>({});

  const [subParent, setSubParent] = useState('');
  const [subName, setSubName] = useState('');
  const [subSlug, setSubSlug] = useState('');
  const [subMultilingual, setSubMultilingual] = useState(false);
  const [subTranslations, setSubTranslations] = useState<Record<string, string>>({});
  const [isTranslating, setIsTranslating] = useState(false);
  const [isCreatingChild, setIsCreatingChild] = useState(false);
  const [childErrors, setChildErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchParentCategories()
      .then(setParentOptions)
      .catch(() => toast.error('대분류 목록을 불러오지 못했습니다.'));
  }, []);

  const handleCreateParent = async () => {
    const errors: Record<string, string> = {};
    if (!categoryName.trim()) errors.name = '카테고리명을 입력해주세요.';
    if (!categorySlug.trim()) errors.slug = '슬러그를 입력해주세요.';
    if (parentMultilingual) {
      const missing = LOCALES.filter((l) => !parentTranslations[l]?.trim());
      if (missing.length > 0) errors.translations = '모든 다국어 카테고리명을 입력해주세요.';
    }
    if (Object.keys(errors).length > 0) {
      setParentErrors(errors);
      return;
    }
    setParentErrors({});
    setIsCreatingParent(true);
    try {
      await createParentCategory({
        name: categoryName,
        slug: categorySlug,
        isMultilingual: parentMultilingual,
        translations:
          parentMultilingual && Object.keys(parentTranslations).length > 0
            ? parentTranslations
            : undefined,
      });
      toast.success('대분류 카테고리가 생성되었습니다.');
      setCategoryName('');
      setCategorySlug('');
      setParentMultilingual(false);
      setParentTranslations({});
      const updated = await fetchParentCategories();
      setParentOptions(updated);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '카테고리 생성에 실패했습니다.');
    } finally {
      setIsCreatingParent(false);
    }
  };

  const handleParentTranslate = async () => {
    if (!categoryName.trim()) return;
    setIsParentTranslating(true);
    try {
      const result = await translateCategoryName(categoryName);
      setParentTranslations(result);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '번역에 실패했습니다.');
    } finally {
      setIsParentTranslating(false);
    }
  };

  const handleCreateChild = async () => {
    const errors: Record<string, string> = {};
    if (!subParent) errors.parent = '대분류를 선택해주세요.';
    if (!subName.trim()) errors.name = '카테고리명을 입력해주세요.';
    if (!subSlug.trim()) errors.slug = '슬러그를 입력해주세요.';
    if (subMultilingual) {
      const missing = LOCALES.filter((l) => !subTranslations[l]?.trim());
      if (missing.length > 0) errors.translations = '모든 다국어 카테고리명을 입력해주세요.';
    }
    if (Object.keys(errors).length > 0) {
      setChildErrors(errors);
      return;
    }
    setChildErrors({});
    setIsCreatingChild(true);
    try {
      await createChildCategory({
        parentSlug: subParent,
        name: subName,
        slug: subSlug,
        isMultilingual: subMultilingual,
        translations:
          subMultilingual && Object.keys(subTranslations).length > 0 ? subTranslations : undefined,
      });
      toast.success('소분류 카테고리가 생성되었습니다.');
      setSubParent('');
      setSubName('');
      setSubSlug('');
      setSubMultilingual(false);
      setSubTranslations({});
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '카테고리 생성에 실패했습니다.');
    } finally {
      setIsCreatingChild(false);
    }
  };

  const handleTranslate = async () => {
    if (!subName.trim()) return;
    setIsTranslating(true);
    try {
      const result = await translateCategoryName(subName);
      setSubTranslations(result);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '번역에 실패했습니다.');
    } finally {
      setIsTranslating(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/categories"
          className="mb-3 inline-flex text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-5" />
        </Link>
        <h1 className="text-xl font-bold">새 카테고리 생성</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          대분류 또는 소분류 카테고리를 추가합니다.
        </p>
      </div>

      <div className="space-y-6 rounded-lg border bg-card p-6">
        <h2 className="text-base font-bold">대분류 카테고리 추가</h2>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">
              카테고리명 <span className="text-primary-600">*</span>
            </label>
            <Input
              placeholder="예: 맛집"
              value={categoryName}
              onChange={(e) => {
                setCategoryName(e.target.value);
                if (parentErrors.name) setParentErrors((prev) => ({ ...prev, name: '' }));
              }}
            />
            {parentErrors.name && <p className="text-xs text-red-500">{parentErrors.name}</p>}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-muted-foreground">
            슬러그 <span className="text-primary-600">*</span>
          </label>
          <SlugField
            sourceText={categoryName}
            value={categorySlug}
            onChange={(v) => {
              setCategorySlug(v);
              if (parentErrors.slug) setParentErrors((prev) => ({ ...prev, slug: '' }));
            }}
            placeholder="예: delicious"
            table="categories"
          />
          {parentErrors.slug && <p className="text-xs text-red-500">{parentErrors.slug}</p>}
          <p className="text-xs text-muted-foreground">
            * 슬러그는 SEO에 직접 반영되는 요소입니다. 신중하게 선택해주세요.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="parent-multilingual-check"
            className="size-4 cursor-pointer accent-primary-600"
            checked={parentMultilingual}
            onChange={(e) => {
              setParentMultilingual(e.target.checked);
              if (e.target.checked) {
                toast.info(
                  '한 번 설정하면 현재는 변경이 불가합니다. 추후 변경 기능이 지원될 예정입니다.',
                );
              }
            }}
          />
          <label
            htmlFor="parent-multilingual-check"
            className="cursor-pointer text-sm font-medium text-muted-foreground"
          >
            다국어 지원
          </label>
        </div>

        {parentMultilingual && (
          <div className="space-y-4">
            <label className="text-sm font-bold">다국어 카테고리명 <span className="text-primary-600">*</span></label>
            <div className="grid grid-cols-2 gap-4">
              {LOCALES.map((locale) => (
                <div key={locale} className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    {locale} ({LOCALE_LABELS[locale]}) <span className="text-primary-600">*</span>
                  </label>
                  <Input
                    placeholder={LOCALE_LABELS[locale]}
                    value={parentTranslations[locale] ?? ''}
                    onChange={(e) =>
                      setParentTranslations((prev) => ({ ...prev, [locale]: e.target.value }))
                    }
                  />
                </div>
              ))}
            </div>
            {parentErrors.translations && (
              <p className="text-xs text-red-500">{parentErrors.translations}</p>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2">
          {parentMultilingual && (
            <button
              type="button"
              onClick={handleParentTranslate}
              disabled={!categoryName.trim() || isParentTranslating}
              className="inline-flex items-center gap-1.5 h-9 rounded-md border border-input px-4 text-sm font-medium shadow-xs transition-colors hover:bg-accent disabled:opacity-50"
            >
              {isParentTranslating ? (
                <LoaderIcon className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              AI 카테고리 번역
            </button>
          )}
          <Button disabled={isCreatingParent} onClick={handleCreateParent}>
            {isCreatingParent ? '생성 중...' : '추가'}
          </Button>
        </div>
      </div>

      <Separator />

      <div className="space-y-6 rounded-lg border bg-card p-6">
        <h2 className="text-base font-bold">소분류 카테고리 추가</h2>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">
              대분류 <span className="text-primary-600">*</span>
            </label>
            <Select
              value={subParent}
              onValueChange={(v) => {
                setSubParent(v);
                if (childErrors.parent) setChildErrors((prev) => ({ ...prev, parent: '' }));
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="선택" />
              </SelectTrigger>
              <SelectContent>
                {parentOptions.map((opt) => (
                  <SelectItem key={opt.slug} value={opt.slug}>
                    {opt.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {childErrors.parent && <p className="text-xs text-red-500">{childErrors.parent}</p>}
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">
              카테고리명 <span className="text-primary-600">*</span>
            </label>
            <Input
              placeholder="예: 한식"
              value={subName}
              onChange={(e) => {
                setSubName(e.target.value);
                if (childErrors.name) setChildErrors((prev) => ({ ...prev, name: '' }));
              }}
            />
            {childErrors.name && <p className="text-xs text-red-500">{childErrors.name}</p>}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-muted-foreground">
            슬러그 <span className="text-primary-600">*</span>
          </label>
          <SlugField
            sourceText={subName}
            value={subSlug}
            onChange={(v) => {
              setSubSlug(v);
              if (childErrors.slug) setChildErrors((prev) => ({ ...prev, slug: '' }));
            }}
            placeholder="예: korean"
            table="categories"
          />
          {childErrors.slug && <p className="text-xs text-red-500">{childErrors.slug}</p>}
          <p className="text-xs text-muted-foreground">
            * 슬러그는 SEO에 직접 반영되는 요소입니다. 신중하게 선택해주세요.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="multilingual-check"
            className="size-4 cursor-pointer accent-primary-600"
            checked={subMultilingual}
            onChange={(e) => {
              setSubMultilingual(e.target.checked);
              if (e.target.checked) {
                toast.info(
                  '한 번 설정하면 현재는 변경이 불가합니다. 추후 변경 기능이 지원될 예정입니다.',
                );
              }
            }}
          />
          <label
            htmlFor="multilingual-check"
            className="cursor-pointer text-sm font-medium text-muted-foreground"
          >
            다국어 지원
          </label>
        </div>

        {subMultilingual && (
          <div className="space-y-4">
            <label className="text-sm font-bold">다국어 카테고리명 <span className="text-primary-600">*</span></label>
            <div className="grid grid-cols-2 gap-4">
              {LOCALES.map((locale) => (
                <div key={locale} className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    {locale} ({LOCALE_LABELS[locale]}) <span className="text-primary-600">*</span>
                  </label>
                  <Input
                    placeholder={LOCALE_LABELS[locale]}
                    value={subTranslations[locale] ?? ''}
                    onChange={(e) =>
                      setSubTranslations((prev) => ({ ...prev, [locale]: e.target.value }))
                    }
                  />
                </div>
              ))}
            </div>
            {childErrors.translations && (
              <p className="text-xs text-red-500">{childErrors.translations}</p>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2">
          {subMultilingual && (
            <button
              type="button"
              onClick={handleTranslate}
              disabled={!subName.trim() || isTranslating}
              className="inline-flex items-center gap-1.5 h-9 rounded-md border border-input px-4 text-sm font-medium shadow-xs transition-colors hover:bg-accent disabled:opacity-50"
            >
              {isTranslating ? (
                <LoaderIcon className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              AI 카테고리 번역
            </button>
          )}
          <Button disabled={isCreatingChild} onClick={handleCreateChild}>
            {isCreatingChild ? '생성 중...' : '추가'}
          </Button>
        </div>
      </div>
    </div>
  );
}
