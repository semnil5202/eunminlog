'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';

type LinkPastePopupProps = {
  editor: Editor;
  url: string;
  position: { top: number; left: number };
  onClose: () => void;
};

export function LinkPastePopup({ editor, url, position, onClose }: LinkPastePopupProps) {
  const [isLoading, setIsLoading] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);

  const handleLink = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleBookmark = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/og-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = res.ok
        ? ((await res.json()) as { url: string; title: string; description: string; image: string; favicon: string })
        : { url, title: '', description: '', image: '', favicon: '' };

      const { state } = editor;
      const { from, to } = state.selection;
      editor
        .chain()
        .focus()
        .deleteRange({ from: from - url.length, to })
        .setLinkBookmark({
          url: data.url,
          title: data.title,
          description: data.description,
          image: data.image,
          favicon: data.favicon,
        })
        .run();
    } catch {
      editor
        .chain()
        .focus()
        .deleteRange({ from: editor.state.selection.from - url.length, to: editor.state.selection.to })
        .setLinkBookmark({ url, title: '', description: '', image: '', favicon: '' })
        .run();
    } finally {
      setIsLoading(false);
      onClose();
    }
  }, [editor, url, onClose]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return (
    <div
      ref={popupRef}
      className="absolute z-50 flex flex-col overflow-hidden rounded-lg border bg-white shadow-md"
      style={{ top: position.top, left: position.left }}
    >
      <button
        type="button"
        onClick={handleLink}
        className="cursor-pointer px-4 py-2 text-xs font-semibold text-primary-600 transition-colors hover:bg-primary-50"
      >
        링크 유지
      </button>
      <button
        type="button"
        onClick={handleBookmark}
        disabled={isLoading}
        className="cursor-pointer px-4 py-2 text-xs font-semibold text-primary-600 transition-colors hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isLoading ? '로딩...' : '북마크로 변환'}
      </button>
    </div>
  );
}
