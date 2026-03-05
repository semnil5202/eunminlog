'use client';

import { type ChangeEvent, useState } from 'react';

import { Separator } from '@/components/ui/separator';
import { CategorySelector } from '@/features/post-editor/components/CategorySelector';
import { ThumbnailUpload } from '@/features/post-editor/components/ThumbnailUpload';
import { TiptapEditorContainer } from '@/features/post-editor/containers/TiptapEditorContainer';

import type { Category, SubCategory } from '@/shared/types/post';

const TITLE_MAX_LENGTH = 40;

export default function NewPostPage() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<Category | ''>('');
  const [subCategory, setSubCategory] = useState<SubCategory | ''>('');
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [placeName, setPlaceName] = useState('');
  const [address, setAddress] = useState('');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');

  const handleTitleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.length <= TITLE_MAX_LENGTH) {
      setTitle(value);
    }
  };

  const handleCategoryChange = (value: Category) => {
    setCategory(value);
    setSubCategory('');
  };

  return (
    <>
      <div className="mb-6">
        <h1 className="text-xl font-bold">게시글 작성</h1>
        <p className="mt-1 text-sm text-muted-foreground">새로운 게시글을 작성합니다.</p>
      </div>
      <div className="mx-auto max-w-[688px]">
      <div className="space-y-4 pb-8">
        <div>
          <label className="mb-1 block text-sm font-bold text-primary-600">카테고리</label>
          <CategorySelector
            category={category}
            subCategory={subCategory}
            onCategoryChange={handleCategoryChange}
            onSubCategoryChange={setSubCategory}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-bold text-primary-600">썸네일</label>
          <ThumbnailUpload thumbnail={thumbnail} onThumbnailChange={setThumbnail} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-bold text-primary-600">장소</label>
          <input
            type="text"
            value={placeName}
            onChange={(e) => setPlaceName(e.target.value)}
            placeholder="장소를 입력해주세요."
            className="h-9 w-full border border-input bg-transparent px-3 text-sm shadow-xs outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-bold text-primary-600">주소</label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="주소를 입력해주세요."
            className="h-9 w-full border border-input bg-transparent px-3 text-sm shadow-xs outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-bold text-primary-600">가격대</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={priceMin}
              onChange={(e) => setPriceMin(e.target.value)}
              placeholder="최소"
              className="h-9 w-full border border-input bg-transparent px-3 text-sm shadow-xs outline-none placeholder:text-muted-foreground [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <span className="shrink-0 text-sm text-muted-foreground">-</span>
            <input
              type="number"
              value={priceMax}
              onChange={(e) => setPriceMax(e.target.value)}
              placeholder="최대"
              className="h-9 w-full border border-input bg-transparent px-3 text-sm shadow-xs outline-none placeholder:text-muted-foreground [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
          </div>
        </div>
      </div>
      <label className="mb-1 block text-sm font-bold text-primary-600">본문</label>
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
    </>
  );
}
