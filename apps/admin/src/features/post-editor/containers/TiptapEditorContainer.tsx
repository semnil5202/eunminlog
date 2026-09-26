'use client';

import { type ReactNode, useCallback, useEffect, useState } from 'react';

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

type TiptapEditorContainerProps = {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  className?: string;
  children?: ReactNode;
  onImageReplace?: (previous: string, next: string) => void;
};

export function TiptapEditorContainer({
  content,
  onChange,
  placeholder = '본문을 입력하세요.',
  className,
  children,
  onImageReplace,
}: TiptapEditorContainerProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [isHtmlMode, setIsHtmlMode] = useState(false);
  const [htmlSource, setHtmlSource] = useState('');
  const { editor, pastedUrl, clearPastedUrl } = useTiptapEditor({ content, onChange });
  const intake = useMediaIntake(editor);
  const [mosaic, setMosaic] = useState<MosaicSession | null>(null);
  const transfer = useImageTransfer({
    editor,
    disabled: isHtmlMode || !!mosaic,
    uploadFiles: intake.uploadFiles,
  });
  const openMedia = intake.open;

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
      if (mosaic || intake.session) return;
      const { pos, index, image } = (
        event as CustomEvent<{ pos: number; index?: number; image: HTMLImageElement }>
      ).detail;
      const target = captureMosaicTarget(editor, pos, index);
      setMosaic({ image, target });
    };
    editor.view.dom.addEventListener('image:mosaic', start);
    return () => editor.view.dom.removeEventListener('image:mosaic', start);
  }, [editor, isHtmlMode, mosaic, intake.session]);

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
        mediaBusy={!!intake.session || !!mosaic}
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
          onClose={() => setMosaic(null)}
          onReplace={onImageReplace}
        />
      )}
      {intake.session && intake.session.mode !== 'images' && (
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
