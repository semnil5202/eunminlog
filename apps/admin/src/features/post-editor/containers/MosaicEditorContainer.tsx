'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { uploadImageFile } from '@/features/media/lib/upload-image';
import { clampRect, getImageMapping, renderMosaic, type MosaicRect } from '../lib/mosaic';
import type { captureMosaicTarget } from '../lib/mosaic-target';

export type MosaicSession = {
  image: HTMLImageElement;
  target: ReturnType<typeof captureMosaicTarget>;
};

/** 확대 모달에서 고정 강도 모자이크 영역을 편집한다. */
export function MosaicEditorContainer({
  session,
  onClose,
  onReplace,
}: {
  session: MosaicSession;
  onClose: () => void;
  onReplace?: (previous: string, next: string) => void;
}) {
  const { image, target } = session;
  const host = image.parentElement!;
  const [source, setSource] = useState<HTMLImageElement | null>(null);
  const [regions, setRegions] = useState<MosaicRect[]>([]);
  const [selected, setSelected] = useState(-1);
  const [busy, setBusy] = useState(false);
  const [size, setSize] = useState({ width: image.clientWidth, height: image.clientHeight });
  const [stage, setStage] = useState<HTMLDivElement | null>(null);
  const [loadError, setLoadError] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const returnFocus = useRef(document.activeElement as HTMLElement | null);
  const live = useRef(true);
  const saving = useRef(false);
  const savingToast = useRef<string | number | undefined>(undefined);
  const lastSize = useRef<{ width: number; height: number } | null>(null);
  const drag = useRef<{
    index: number;
    x: number;
    y: number;
    rect: MosaicRect;
    corner?: string;
  } | null>(null);
  const mapping = getImageMapping(
    source?.naturalWidth || 1,
    source?.naturalHeight || 1,
    Math.max(1, size.width),
    Math.max(1, size.height),
    false,
  );

  useLayoutEffect(() => {
    host.dataset.mosaicEditing = 'true';
    return () => {
      delete host.dataset.mosaicEditing;
    };
  }, [host]);

  useLayoutEffect(() => {
    if (!stage) return;
    const measure = () => setSize({ width: stage.clientWidth, height: stage.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    return () => observer.disconnect();
  }, [stage]);

  useEffect(() => {
    live.current = true;
    let cancelled = false;
    const controller = new AbortController();
    let url = '';
    void (async () => {
      try {
        const response = await fetch(target.src, { signal: controller.signal, mode: 'cors' });
        if (!response.ok) throw new Error('이미지를 불러오지 못했습니다.');
        const blob = await response.blob();
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        const loaded = new Image();
        loaded.src = url;
        await loaded.decode();
        if (loaded.naturalWidth * loaded.naturalHeight > 32_000_000)
          throw new Error('이미지가 너무 큽니다.');
        if (!cancelled) setSource(loaded);
      } catch {
        if (!cancelled) {
          setLoadError(true);
          toast.error('이미지를 편집할 수 없습니다. 이미지 접근 권한을 확인해주세요.');
        }
      }
    })();
    return () => {
      live.current = false;
      cancelled = true;
      controller.abort();
      if (savingToast.current !== undefined) toast.dismiss(savingToast.current);
      if (url) URL.revokeObjectURL(url);
      queueMicrotask(() => {
        if (!live.current) target.dispose();
      });
    };
  }, [target]);

  useEffect(() => {
    if (!source || !canvasRef.current) return;
    const frame = requestAnimationFrame(() => {
      try {
        const result = renderMosaic(source, regions);
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.width = result.width;
        canvas.height = result.height;
        canvas.getContext('2d')?.drawImage(result, 0, 0);
        result.width = 0;
        result.height = 0;
      } catch {
        setLoadError(true);
        toast.error('모자이크 미리보기를 만들지 못했습니다.');
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [source, regions]);

  const addRegion = (x: number, y: number) => {
    if (!source || busy) return;
    const side = Math.min(source.naturalWidth, source.naturalHeight) * 0.09;
    const dimensions = lastSize.current ?? {
      width: side / source.naturalWidth,
      height: side / source.naturalHeight,
    };
    setRegions([
      ...regions,
      clampRect({ x: x - dimensions.width / 2, y: y - dimensions.height / 2, ...dimensions }),
    ]);
    setSelected(regions.length);
  };
  const remove = () => {
    if (selected < 0 || busy) return;
    setRegions(regions.filter((_, index) => index !== selected));
    setSelected(-1);
  };
  const cancel = () => {
    live.current = false;
    onClose();
  };
  const apply = async () => {
    if (!source || !regions.length || saving.current) return;
    saving.current = true;
    setBusy(true);
    const notification = toast.loading('모자이크 이미지 저장 중…');
    savingToast.current = notification;
    try {
      const canvas = renderMosaic(source, regions);
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (value) => (value ? resolve(value) : reject(new Error('이미지를 변환하지 못했습니다.'))),
          'image/png',
        ),
      );
      if (!live.current) return;
      const result = await uploadImageFile(new File([blob], 'mosaic.png', { type: 'image/png' }), {
        watermark: false,
      });
      if (!live.current) return;
      if (!target.apply(result.url))
        throw new Error('편집 대상이 변경되었습니다. 이미지를 다시 선택해주세요.');
      onReplace?.(target.src, result.url);
      toast.success('모자이크를 적용했습니다.');
      onClose();
    } catch (error) {
      if (live.current)
        toast.error(error instanceof Error ? error.message : '모자이크 저장에 실패했습니다.');
    } finally {
      toast.dismiss(notification);
      savingToast.current = undefined;
      saving.current = false;
      if (live.current) setBusy(false);
    }
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) cancel();
      }}
    >
      <DialogContent
        data-mosaic-editor
        aria-modal="true"
        contentEditable={false}
        showCloseButton={false}
        className="flex h-dvh max-h-dvh w-screen max-w-none flex-col gap-0 overflow-hidden rounded-none p-0 sm:h-[calc(100dvh-2rem)] sm:max-w-[calc(100vw-2rem)]"
        onInteractOutside={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          const focusTarget = returnFocus.current;
          if (focusTarget?.isConnected && focusTarget !== document.body) {
            focusTarget.focus({ preventScroll: true });
          } else {
            image.closest<HTMLElement>('.ProseMirror')?.focus({ preventScroll: true });
          }
        }}
        onClick={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <div className="shrink-0 border-b px-4 py-3">
          <DialogTitle>모자이크 편집</DialogTitle>
          <DialogDescription className="mt-1">
            사진을 눌러 영역을 추가하고 모서리를 끌어 크기를 조절하세요.
          </DialogDescription>
        </div>
        <div
          ref={setStage}
          role="group"
          aria-label="모자이크 편집 영역"
          tabIndex={0}
          className="relative min-h-0 flex-1 touch-none overflow-hidden bg-muted outline-none"
          onPointerDown={(event) => {
            if (!source || busy || event.button !== 0) return;
            event.preventDefault();
            event.currentTarget.focus({ preventScroll: true });
            const box = event.currentTarget.getBoundingClientRect();
            const x =
              (event.clientX - box.left - mapping.offsetX) / mapping.scale / source.naturalWidth;
            const y =
              (event.clientY - box.top - mapping.offsetY) / mapping.scale / source.naturalHeight;
            const element = event.target as HTMLElement;
            const hit = element.closest<HTMLElement>('[data-region]');
            if (hit) {
              const index = Number(hit.dataset.region);
              setSelected(index);
              drag.current = { index, x, y, rect: regions[index], corner: element.dataset.corner };
            } else {
              if (x < 0 || x > 1 || y < 0 || y > 1) return;
              addRegion(x, y);
            }
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            if (!drag.current || !source || busy) return;
            const current = drag.current;
            const dx =
              (event.clientX - event.currentTarget.getBoundingClientRect().left - mapping.offsetX) /
                mapping.scale /
                source.naturalWidth -
              current.x;
            const dy =
              (event.clientY - event.currentTarget.getBoundingClientRect().top - mapping.offsetY) /
                mapping.scale /
                source.naturalHeight -
              current.y;
            let next = { ...current.rect };
            if (current.corner) {
              const left = current.corner.includes('w');
              const top = current.corner.includes('n');
              const right = current.rect.x + current.rect.width;
              const bottom = current.rect.y + current.rect.height;
              next.x = left
                ? Math.max(0, Math.min(right - 0.02, current.rect.x + dx))
                : current.rect.x;
              next.y = top
                ? Math.max(0, Math.min(bottom - 0.02, current.rect.y + dy))
                : current.rect.y;
              next.width = left
                ? right - next.x
                : Math.max(0.02, Math.min(1 - next.x, current.rect.width + dx));
              next.height = top
                ? bottom - next.y
                : Math.max(0.02, Math.min(1 - next.y, current.rect.height + dy));
            } else next = clampRect({ ...next, x: next.x + dx, y: next.y + dy });
            lastSize.current = { width: next.width, height: next.height };
            setRegions((items) =>
              items.map((item, index) => (index === current.index ? next : item)),
            );
          }}
          onPointerUp={() => {
            drag.current = null;
          }}
          onPointerCancel={() => {
            drag.current = null;
          }}
          onKeyDown={(event) => {
            event.stopPropagation();
            if (busy) return;
            if (event.key === 'Delete' || event.key === 'Backspace') {
              event.preventDefault();
              remove();
            }
            if (event.key === 'Escape') {
              event.preventDefault();
              cancel();
            }
            if ((event.ctrlKey || event.metaKey) && event.key === 'z') {
              event.preventDefault();
            }
            if (
              selected >= 0 &&
              ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)
            ) {
              event.preventDefault();
              const dx = event.key === 'ArrowLeft' ? -0.01 : event.key === 'ArrowRight' ? 0.01 : 0;
              const dy = event.key === 'ArrowUp' ? -0.01 : event.key === 'ArrowDown' ? 0.01 : 0;
              setRegions(
                regions.map((region, index) =>
                  index !== selected
                    ? region
                    : clampRect(
                        event.shiftKey
                          ? {
                              ...region,
                              width: Math.max(0.02, region.width + dx),
                              height: Math.max(0.02, region.height + dy),
                            }
                          : { ...region, x: region.x + dx, y: region.y + dy },
                      ),
                ),
              );
            }
          }}
        >
          <canvas
            ref={canvasRef}
            className="pointer-events-none absolute"
            style={{
              left: mapping.offsetX,
              top: mapping.offsetY,
              width: (source?.naturalWidth || 1) * mapping.scale,
              height: (source?.naturalHeight || 1) * mapping.scale,
            }}
          />
          {regions.map((region, index) => (
            <div
              key={index}
              data-region={index}
              role="button"
              tabIndex={0}
              aria-label={`${index + 1}번 모자이크 영역`}
              aria-pressed={selected === index}
              onFocus={() => setSelected(index)}
              className={`absolute cursor-move border-2 ${selected === index ? 'border-blue-500' : 'border-white/70'}`}
              style={{
                left: mapping.offsetX + region.x * (source?.naturalWidth || 1) * mapping.scale,
                top: mapping.offsetY + region.y * (source?.naturalHeight || 1) * mapping.scale,
                width: region.width * (source?.naturalWidth || 1) * mapping.scale,
                height: region.height * (source?.naturalHeight || 1) * mapping.scale,
              }}
            >
              {selected === index &&
                ['nw', 'ne', 'sw', 'se'].map((corner) => (
                  <span
                    key={corner}
                    data-corner={corner}
                    className="absolute size-2.5 border border-white bg-blue-500"
                    style={{
                      top: corner.includes('n') ? -6 : undefined,
                      bottom: corner.includes('s') ? -6 : undefined,
                      left: corner.includes('w') ? -6 : undefined,
                      right: corner.includes('e') ? -6 : undefined,
                      cursor: `${corner}-resize`,
                    }}
                  />
                ))}
            </div>
          ))}
        </div>
        <div
          role="toolbar"
          aria-label="모자이크 도구"
          className="shrink-0 space-y-3 border-t bg-background p-3 sm:p-4"
          onPointerDown={(event) => event.stopPropagation()}
        >
          <p role="status" className="text-sm text-muted-foreground">
            {busy
              ? '저장 중…'
              : loadError
                ? '이미지 로드 실패'
                : !source
                  ? '불러오는 중…'
                  : '사진을 눌러 가릴 곳을 추가하세요'}
          </p>
          <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-4">
            <div role="group" aria-label="모자이크 영역 관리" className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-11 px-4"
                disabled={!source || busy}
                onClick={() => addRegion(0.5, 0.5)}
              >
                영역 추가
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-11 px-4"
                disabled={selected < 0 || busy}
                onClick={remove}
              >
                영역 삭제
              </Button>
            </div>
            <div role="group" aria-label="모자이크 편집 완료" className="ml-auto flex gap-3">
              <Button
                type="button"
                variant="ghost"
                className="h-11 min-w-20 border border-input"
                onClick={cancel}
              >
                취소
              </Button>
              <Button
                type="button"
                className="h-11 min-w-24"
                disabled={!source || loadError || !regions.length || busy}
                onClick={() => void apply()}
              >
                적용
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
