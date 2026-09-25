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

type TiptapEditorContainerProps = {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  className?: string;
  children?: ReactNode;
};

export function TiptapEditorContainer({
  content,
  onChange,
  placeholder = '본문을 입력하세요.',
  className,
  children,
}: TiptapEditorContainerProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [isHtmlMode, setIsHtmlMode] = useState(false);
  const [htmlSource, setHtmlSource] = useState('');
  const { editor, pastedUrl, clearPastedUrl } = useTiptapEditor({ content, onChange });
  const intake = useMediaIntake(editor);
  const transfer = useImageTransfer({
    editor,
    disabled: isHtmlMode,
    uploadFiles: intake.uploadFiles,
  });
  const openMedia = intake.open;

  useEffect(() => {
    if (!editor || isHtmlMode) return;
    const onAdd = (event: Event) => {
      const pos = (event as CustomEvent<{ pos: number }>).detail?.pos;
      if (typeof pos === 'number') openMedia('append', pos);
    };
    const dom = editor.view.dom;
    dom.addEventListener('carousel:add-images', onAdd);
    return () => dom.removeEventListener('carousel:add-images', onAdd);
  }, [editor, isHtmlMode, openMedia]);

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
        mediaBusy={!!intake.session}
        onImagesBegin={() => intake.open('images')}
        onImageFiles={(files) => {
          intake.addFiles(files);
          void intake.submit();
        }}
        onImagesCancel={intake.close}
        onCreateCarousel={() => intake.open('carousel')}
      />
      {intake.session && intake.session.mode !== 'images' && (
        <MediaIntakeDialog
          {...intake.session}
          onClose={intake.close}
          onFiles={intake.addFiles}
          onRemove={intake.remove}
          onSubmit={() => void intake.submit()}
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
