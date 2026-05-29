'use client';

import { type ReactNode, useCallback, useEffect, useState } from 'react';

import { cn } from '@/lib/utils';
import { useTiptapEditor } from '../hooks/useTiptapEditor';
import { Toolbar } from '../components/Toolbar';
import { TiptapEditor } from '../components/TiptapEditor';
import { TiptapEditorSkeleton } from '../components/TiptapEditorSkeleton';
import { LinkPastePopup } from '../components/LinkPastePopup';
import { HtmlSourceEditor } from '../components/HtmlSourceEditor';

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
      <Toolbar editor={editor} isHtmlMode={isHtmlMode} onToggleHtmlMode={handleToggleHtmlMode} />
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
