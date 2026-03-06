'use client';

import { useEffect, useState, type MouseEvent } from 'react';

import { EditorContent, type Editor } from '@tiptap/react';

type TiptapEditorProps = {
  editor: Editor;
  placeholder?: string;
};

export function TiptapEditor({ editor, placeholder }: TiptapEditorProps) {
  const [isEmpty, setIsEmpty] = useState(true);

  useEffect(() => {
    setIsEmpty(editor.isEmpty);

    const handleUpdate = () => {
      setIsEmpty(editor.isEmpty);
    };

    editor.on('update', handleUpdate);
    return () => {
      editor.off('update', handleUpdate);
    };
  }, [editor]);

  const handleWrapperClick = (e: MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('.ProseMirror')) return;

    editor.commands.focus('end');
  };

  return (
    <div
      className="relative min-h-[450px] w-full cursor-text p-4 text-body2"
      onClick={handleWrapperClick}
    >
      <EditorContent editor={editor} />
      {isEmpty && placeholder && (
        <div className="pointer-events-none absolute left-4 top-4 text-muted-foreground">
          {placeholder}
        </div>
      )}
    </div>
  );
}
