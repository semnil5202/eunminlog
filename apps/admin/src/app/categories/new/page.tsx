'use client';

import { useState } from 'react';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

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
import { CATEGORY_OPTIONS } from '@/features/post-editor/constants/category';

import type { Category } from '@/shared/types/post';

export default function NewCategoryPage() {
  const [categoryName, setCategoryName] = useState('');
  const [categorySlug, setCategorySlug] = useState('');

  const [subParent, setSubParent] = useState<Category | ''>('');
  const [subName, setSubName] = useState('');
  const [subSlug, setSubSlug] = useState('');
  const [subMultilingual, setSubMultilingual] = useState(false);

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/categories"
          className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          목록으로 돌아가기
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
              onChange={(e) => setCategoryName(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-muted-foreground">
            슬러그 생성 <span className="text-primary-600">*</span>
          </label>
          <SlugField
            sourceText={categoryName}
            value={categorySlug}
            onChange={setCategorySlug}
            placeholder="예: delicious"
          />
        </div>

        <div className="flex justify-end">
          <Button disabled={!categoryName.trim() || !categorySlug.trim()}>추가</Button>
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
            <Select value={subParent} onValueChange={(v) => setSubParent(v as Category)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="선택" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">
              카테고리명 <span className="text-primary-600">*</span>
            </label>
            <Input
              placeholder="예: 한식"
              value={subName}
              onChange={(e) => setSubName(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-muted-foreground">
            슬러그 생성 <span className="text-primary-600">*</span>
          </label>
          <SlugField
            sourceText={subName}
            value={subSlug}
            onChange={setSubSlug}
            placeholder="예: korean"
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="multilingual-check"
              className="size-4 cursor-pointer accent-primary-600"
              checked={subMultilingual}
              onChange={(e) => setSubMultilingual(e.target.checked)}
            />
            <label
              htmlFor="multilingual-check"
              className="cursor-pointer text-sm font-medium text-muted-foreground"
            >
              다국어 지원
            </label>
          </div>
          <Button disabled={!subParent || !subName.trim() || !subSlug.trim()}>추가</Button>
        </div>
      </div>
    </div>
  );
}
