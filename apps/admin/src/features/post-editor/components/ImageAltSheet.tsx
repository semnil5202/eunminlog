'use client';

import { useMemo } from 'react';
import { ClipboardCopy } from 'lucide-react';
import { toast } from 'sonner';

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { buildImageAltCopyPrompt } from '@/features/post-editor/lib/image-alt-prompt';

import type { ImageAlt } from '@/features/translation/types';

type ImageAltSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
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
  title,
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

  const handleCopyPrompt = async () => {
    const targets = imageSrcs.map((src, index) => ({ label: `본문 이미지 ${index + 1}`, src }));
    const prompt = buildImageAltCopyPrompt(title, content, targets);
    if (!prompt) return;

    try {
      await navigator.clipboard.writeText(prompt);
      toast.success('이미지 alt 프롬프트가 복사되었습니다.');
    } catch {
      toast.error('프롬프트를 복사하지 못했습니다.');
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-[688px]">
        <SheetHeader>
          <SheetTitle className="text-lg">이미지 alt 입력</SheetTitle>
          <SheetDescription className="text-base">
            각 이미지에 대한 설명을 입력해주세요. SEO에 직접 반영됩니다.
          </SheetDescription>
          <button
            type="button"
            onClick={handleCopyPrompt}
            disabled={imageSrcs.length === 0}
            className="inline-flex w-fit items-center gap-1.5 rounded-md border border-input px-3 py-1.5 text-xs font-medium transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ClipboardCopy className="size-3.5" />
            프롬프트 복사
          </button>
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
