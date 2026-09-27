'use client';

import { useCallback, useEffect, useState } from 'react';

import { useEditor } from '@tiptap/react';

import { tiptapExtensions } from '../configs/tiptap-extensions';
import { redirectSelectedImageText } from '../lib/image-alt-input';

const URL_REGEX = /^https?:\/\/\S+$/;

type PastedUrl = {
  url: string;
  cursorPos: number;
} | null;

type UseTiptapEditorProps = {
  content: string;
  onChange: (content: string) => void;
};

export function useTiptapEditor({ content, onChange }: UseTiptapEditorProps) {
  const [pastedUrl, setPastedUrl] = useState<PastedUrl>(null);

  const clearPastedUrl = useCallback(() => setPastedUrl(null), []);

  const editor = useEditor({
    extensions: tiptapExtensions,
    content,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
      setPastedUrl(null);
    },
    editorProps: {
      attributes: {
        style: 'line-height: 1.6;',
      },
      handlePaste: (_view, event) => {
        if (redirectSelectedImageText(_view, event.clipboardData?.getData('text/plain') ?? ''))
          return true;
        const text = event.clipboardData?.getData('text/plain')?.trim();
        if (text && URL_REGEX.test(text)) {
          requestAnimationFrame(() => {
            setPastedUrl({ url: text, cursorPos: _view.state.selection.from });
          });
        }
        return false;
      },
      handleTextInput: (view, _from, _to, text) => redirectSelectedImageText(view, text),
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  return { editor, pastedUrl, clearPastedUrl };
}
