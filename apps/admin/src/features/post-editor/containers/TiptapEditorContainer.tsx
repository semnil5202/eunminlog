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
      {intake.session?.mode === 'images' && intake.session.items.length > 0 && (
        <div
          className="flex flex-wrap items-center gap-3 border-b bg-muted px-3 py-2 text-sm"
          aria-label="이미지 업로드 상태"
        >
          <span role="status">
            {intake.session.busy ? '이미지 업로드 중…' : '이미지 업로드를 완료하지 못했습니다.'}
          </span>
          {!intake.session.busy && (
            <>
              <div role="alert" className="w-full text-destructive">
                {intake.session.error ??
                  intake.session.items
                    .filter((item) => item.error)
                    .map((item) => `${item.file.name}: ${item.error}`)
                    .join(' · ')}
              </div>
              <button
                type="button"
                className="min-h-11 border px-3"
                onClick={() => void intake.submit()}
              >
                다시 시도
              </button>
            </>
          )}
          <button type="button" className="min-h-11 border px-3" onClick={intake.close}>
            {intake.session.busy ? '업로드 취소' : '닫기'}
          </button>
        </div>
      )}
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
      <div className="relative">
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
