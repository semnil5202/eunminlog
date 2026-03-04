'use client';

import { useEffect } from 'react';

import { useEditor } from '@tiptap/react';

import { tiptapExtensions } from '../configs/tiptap-extensions';

type UseTiptapEditorProps = {
  content: string;
  onChange: (content: string) => void;
};


export function useTiptapEditor({ content, onChange }: UseTiptapEditorProps) {
  const editor = useEditor({
    extensions: tiptapExtensions,
    content,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        style: 'line-height: 1.6;',
      },
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  return editor;
}
