'use client';

import { type ReactNode, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import { useTiptapEditor } from '../hooks/useTiptapEditor';
import { Toolbar } from '../components/Toolbar';
import { TiptapEditor } from '../components/TiptapEditor';
import { TiptapEditorSkeleton } from '../components/TiptapEditorSkeleton';
import { LinkPastePopup } from '../components/LinkPastePopup';
import { HtmlSourceEditor } from '../components/HtmlSourceEditor';
import { MediaIntakeDialog } from '../components/MediaIntakeDialog';
import { useMediaIntake } from '../hooks/useMediaIntake';
import { useImageTransfer } from '../hooks/useImageTransfer';
import { MosaicEditorContainer, type MosaicSession } from './MosaicEditorContainer';
import { captureMosaicTarget } from '../lib/mosaic-target';
import { syncImageAltInputs } from '../lib/image-alt-input';
import { uploadImageFile } from '@/features/media/lib/upload-image';

type TiptapEditorContainerProps = {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  className?: string;
  children?: ReactNode;
  onImageReplace?: (previous: string, next: string) => void;
  imageAlts?: { src: string; alt: string }[];
  onImageAltChange?: (src: string, alt: string) => void;
  onPendingChange?: (pending: boolean) => void;
};

export function TiptapEditorContainer({
  content,
  onChange,
  placeholder = '본문을 입력하세요.',
  className,
  children,
  onImageReplace,
  imageAlts,
  onImageAltChange,
  onPendingChange,
}: TiptapEditorContainerProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [isHtmlMode, setIsHtmlMode] = useState(false);
  const [htmlSource, setHtmlSource] = useState('');
  const { editor, pastedUrl, clearPastedUrl } = useTiptapEditor({ content, onChange });
  const intake = useMediaIntake(editor);
  const [mosaic, setMosaic] = useState<MosaicSession | null>(null);
  const [mosaicSaving, setMosaicSaving] = useState(false);
  const mosaicTask = useRef<MosaicSession | null>(null);
  const transfer = useImageTransfer({
    editor,
    disabled: isHtmlMode || !!mosaic,
    uploadFiles: intake.uploadFiles,
  });
  const openMedia = intake.open;

  useEffect(() => {
    if (!mosaic) return;
    return () => {
      if (mosaicTask.current !== mosaic) mosaic.target.dispose();
    };
  }, [mosaic]);

  useEffect(() => {
    onPendingChange?.(!!intake.session?.busy || mosaicSaving);
  }, [intake.session?.busy, mosaicSaving, onPendingChange]);

  useEffect(
    () => () => {
      mosaicTask.current?.target.dispose();
      mosaicTask.current = null;
      onPendingChange?.(false);
    },
    [editor, onPendingChange],
  );

  const saveMosaic = (canvas: HTMLCanvasElement, session: MosaicSession) => {
    if (mosaicTask.current) return;
    mosaicTask.current = session;
    setMosaicSaving(true);
    setMosaic(null);
    const notification = toast.loading('모자이크 이미지 업로드 중…', {
      duration: Infinity,
      dismissible: false,
      action: {
        label: '업로드 취소',
        onClick: () => {
          if (mosaicTask.current !== session) return;
          session.target.dispose();
          mosaicTask.current = null;
          setMosaicSaving(false);
          toast.message('모자이크 작업을 종료했습니다.', { id: notification });
        },
      },
    });
    void new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('이미지를 변환하지 못했습니다.'))),
        'image/png',
      ),
    )
      .then((blob) => {
        canvas.width = 0;
        canvas.height = 0;
        if (mosaicTask.current !== session) return null;
        return uploadImageFile(new File([blob], 'mosaic.png', { type: 'image/png' }), {
          watermark: false,
        });
      })
      .then((result) => {
        if (!result || mosaicTask.current !== session) return;
        if (!session.target.apply(result.url))
          throw new Error('편집 대상이 변경되었습니다. 이미지를 다시 선택해주세요.');
        onImageReplace?.(session.target.src, result.url);
        toast.success('모자이크를 적용했습니다.', { id: notification });
      })
      .catch((error) => {
        canvas.width = 0;
        canvas.height = 0;
        if (mosaicTask.current !== session) return;
        toast.error(error instanceof Error ? error.message : '모자이크 저장에 실패했습니다.', {
          id: notification,
        });
      })
      .finally(() => {
        if (mosaicTask.current !== session) return;
        session.target.dispose();
        mosaicTask.current = null;
        setMosaicSaving(false);
      });
  };

  useLayoutEffect(() => {
    if (!editor || editor.isDestroyed) return;
    syncImageAltInputs(editor, {
      getAlt: (src) => imageAlts?.find((entry) => entry.src === src)?.alt ?? '',
      onChange: (src, alt) => onImageAltChange?.(src, alt),
    });
  }, [editor, imageAlts, onImageAltChange]);

  useEffect(() => {
    if (!editor || !mosaic) return;
    const observer = new MutationObserver(() => {
      if (!mosaic.image.isConnected) {
        mosaic.target.dispose();
        setMosaic((current) => (current === mosaic ? null : current));
      }
    });
    observer.observe(editor.view.dom, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [editor, mosaic]);

  useEffect(() => {
    if (!editor || isHtmlMode) return;
    const start = (event: Event) => {
      if (mosaic || intake.session || mosaicSaving) return;
      const { pos, index, image } = (
        event as CustomEvent<{ pos: number; index?: number; image: HTMLImageElement }>
      ).detail;
      const target = captureMosaicTarget(editor, pos, index);
      setMosaic({ image, target });
    };
    editor.view.dom.addEventListener('image:mosaic', start);
    return () => editor.view.dom.removeEventListener('image:mosaic', start);
  }, [editor, isHtmlMode, mosaic, intake.session, mosaicSaving]);

  useEffect(() => {
    if (!editor || isHtmlMode) return;
    const onAdd = (event: Event) => {
      if (mosaic) return;
      const pos = (event as CustomEvent<{ pos: number }>).detail?.pos;
      if (typeof pos === 'number') openMedia('append', pos);
    };
    const dom = editor.view.dom;
    dom.addEventListener('carousel:add-images', onAdd);
    return () => dom.removeEventListener('carousel:add-images', onAdd);
  }, [editor, isHtmlMode, openMedia, mosaic]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleToggleHtmlMode = useCallback(() => {
    if (!editor) return;

    if (!isHtmlMode) {
      setHtmlSource(editor.getHTML());
      setIsHtmlMode(true);
    } else {
      editor.commands.setContent(htmlSource);
      onChange(htmlSource);
      setIsHtmlMode(false);
    }
  }, [isHtmlMode, htmlSource, editor, onChange]);

  if (!isMounted || !editor) {
    return <TiptapEditorSkeleton />;
  }

  const popupPosition = (() => {
    if (!pastedUrl || !editor) return null;
    const coords = editor.view.coordsAtPos(pastedUrl.cursorPos);
    const editorRect = editor.view.dom.getBoundingClientRect();
    return {
      top: coords.bottom - editorRect.top + 4,
      left: coords.left - editorRect.left,
    };
  })();

  return (
    <div className={cn('border-t border-b', className)}>
      <Toolbar
        editor={editor}
        isHtmlMode={isHtmlMode}
        onToggleHtmlMode={handleToggleHtmlMode}
        mediaBusy={!!intake.session || !!mosaic || mosaicSaving}
        onImagesBegin={() => intake.open('images')}
        onImageFiles={(files) => {
          intake.addFiles(files);
          void intake.submit();
        }}
        onImagesCancel={intake.close}
        onCreateCarousel={() => intake.open('carousel')}
      />
      {mosaic && (
        <MosaicEditorContainer
          session={mosaic}
          onClose={() => {
            mosaic.target.dispose();
            setMosaic(null);
          }}
          onApply={saveMosaic}
        />
      )}
      {intake.session?.dialogOpen && intake.session.mode !== 'images' && (
        <MediaIntakeDialog
          {...intake.session}
          onClose={intake.close}
          onFiles={intake.addFiles}
          onRemove={intake.remove}
          onSubmit={() => void intake.submit()}
          onReturnFocus={() => {
            if (!editor.isDestroyed) editor.view.focus();
          }}
        />
      )}
      {children}
      <div className="relative" {...transfer.handlers}>
        {transfer.dragging && (
          <div
            role="status"
            className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center border-2 border-dashed border-primary bg-background/90 p-4 text-sm font-medium"
          >
            여기에 이미지를 놓으세요
          </div>
        )}
        {isHtmlMode ? (
          <HtmlSourceEditor value={htmlSource} onChange={setHtmlSource} />
        ) : (
          <>
            <TiptapEditor editor={editor} placeholder={placeholder} />
            {pastedUrl && popupPosition && (
              <LinkPastePopup
                editor={editor}
                url={pastedUrl.url}
                position={popupPosition}
                onClose={clearPastedUrl}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
