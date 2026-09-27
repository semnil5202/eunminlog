'use client';

import { useMemo } from 'react';

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';

import type { ImageAlt } from '@/features/translation/types';

type ImageAltSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  content: string;
  imageAlts: ImageAlt[];
  onComplete: (alts: ImageAlt[]) => void;
  thumbnail?: string | null;
  thumbnailAlt?: string;
  onThumbnailAltChange?: (alt: string) => void;
};

export function extractImageSrcs(html: string): string[] {
  if (typeof window === 'undefined') return [];
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const imgs = doc.querySelectorAll('img');
  return Array.from(imgs)
    .filter((img) => !img.closest('[data-type="link-bookmark"]'))
    .map((img) => img.getAttribute('src'))
    .filter((src): src is string => !!src);
}

export function ImageAltSheet({
  open,
  onOpenChange,
  content,
  imageAlts,
  onComplete,
  thumbnail,
  thumbnailAlt = '',
  onThumbnailAltChange,
}: ImageAltSheetProps) {
  const imageSrcs = useMemo(
    () => (open ? [...new Set(extractImageSrcs(content))] : []),
    [content, open],
  );
  const alts = useMemo(() => new Map(imageAlts.map(({ src, alt }) => [src, alt])), [imageAlts]);

  const handleAltChange = (src: string, alt: string) => {
    onComplete([{ src, alt }]);
  };

  const hasThumbnail = !!thumbnail;
  const thumbnailAltFilled = !hasThumbnail || thumbnailAlt.trim().length > 0;
  const contentAltsFilled = imageSrcs.every((src) => (alts.get(src) ?? '').trim());
  const hasAnyItem = hasThumbnail || imageSrcs.length > 0;
  const allFilled = hasAnyItem && thumbnailAltFilled && contentAltsFilled;

  const handleComplete = () => {
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-[688px]">
        <SheetHeader>
          <SheetTitle className="text-lg">이미지 alt 입력</SheetTitle>
          <SheetDescription className="text-base">
            각 이미지에 대한 설명을 입력해주세요. SEO에 직접 반영됩니다.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {!hasAnyItem ? (
            <p className="py-12 text-center text-sm text-muted-foreground">이미지가 없습니다.</p>
          ) : (
            <div className="space-y-6">
              {hasThumbnail && (
                <div className="space-y-2">
                  <div className="flex items-start gap-3">
                    <span className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-600">
                      썸네일
                    </span>
                    <img
                      src={thumbnail}
                      alt=""
                      className="h-20 w-28 shrink-0 rounded border object-cover"
                    />
                  </div>
                  <Input
                    aria-label="썸네일 이미지 설명 (alt)"
                    value={thumbnailAlt}
                    onChange={(e) => onThumbnailAltChange?.(e.target.value)}
                    placeholder="예: 강남 파스타 맛집 외관"
                  />
                </div>
              )}

              {imageSrcs.map((src, i) => (
                <div key={src} className="space-y-2">
                  <div className="flex items-start gap-3">
                    <span className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-600">
                      이미지 {i + 1}
                    </span>
                    <img
                      src={src}
                      alt=""
                      className="h-20 w-28 shrink-0 rounded border object-cover"
                    />
                  </div>
                  <Input
                    aria-label={`이미지 ${i + 1} 설명 (alt)`}
                    value={alts.get(src) ?? ''}
                    onChange={(e) => handleAltChange(src, e.target.value)}
                    placeholder="예: 강남 파스타 맛집 내부 전경"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {hasAnyItem && (
          <div className="border-t px-4 py-4">
            <button
              type="button"
              onClick={handleComplete}
              disabled={!allFilled}
              className="w-full h-10 bg-primary-600 text-sm font-bold text-white shadow-xs transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              완료
            </button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
