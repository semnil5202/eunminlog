'use client';

import { useState } from 'react';

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
  const [snapshotSrcs, setSnapshotSrcs] = useState<string[]>([]);
  const [alts, setAlts] = useState<Map<string, string>>(new Map());
  const [localThumbnailAlt, setLocalThumbnailAlt] = useState(thumbnailAlt);
  const [prevOpen, setPrevOpen] = useState(false);

  if (open && !prevOpen) {
    setSnapshotSrcs(extractImageSrcs(content));
    const map = new Map<string, string>();
    for (const item of imageAlts) {
      map.set(item.src, item.alt);
    }
    setAlts(map);
    setLocalThumbnailAlt(thumbnailAlt);
  }
  if (open !== prevOpen) {
    setPrevOpen(open);
  }

  const imageSrcs = snapshotSrcs;

  const handleAltChange = (src: string, alt: string) => {
    setAlts((prev) => {
      const next = new Map(prev);
      next.set(src, alt);
      return next;
    });
  };

  const hasThumbnail = !!thumbnail;
  const thumbnailAltFilled = !hasThumbnail || localThumbnailAlt.trim().length > 0;
  const contentAltsFilled = imageSrcs.every((src) => (alts.get(src) ?? '').trim());
  const hasAnyItem = hasThumbnail || imageSrcs.length > 0;
  const allFilled = hasAnyItem && thumbnailAltFilled && contentAltsFilled;

  const syncToParent = () => {
    if (onThumbnailAltChange) {
      onThumbnailAltChange(localThumbnailAlt.trim());
    }
    const result: ImageAlt[] = imageSrcs.map((src) => ({
      src,
      alt: (alts.get(src) ?? '').trim(),
    }));
    onComplete(result);
  };

  const handleComplete = () => {
    syncToParent();
    onOpenChange(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      syncToParent();
    }
    onOpenChange(next);
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
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
                    value={localThumbnailAlt}
                    onChange={(e) => setLocalThumbnailAlt(e.target.value)}
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
