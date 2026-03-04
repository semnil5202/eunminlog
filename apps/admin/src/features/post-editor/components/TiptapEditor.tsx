'use client';

import { useEffect, useState } from 'react';

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

  return (
    <div className="relative h-[300px] w-full overflow-y-auto p-4 text-body2">
      <EditorContent editor={editor} className="h-full" />
      {isEmpty && placeholder && (
        <div className="pointer-events-none absolute left-4 top-4 text-muted-foreground">
          {placeholder}
        </div>
      )}
    </div>
  );
}
