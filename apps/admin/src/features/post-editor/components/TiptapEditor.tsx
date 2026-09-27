'use client';

import { useEffect, useState } from 'react';

import { EditorContent, type Editor } from '@tiptap/react';

type TiptapEditorProps = {
  editor: Editor;
  placeholder?: string;
};

export function TiptapEditor({ editor, placeholder }: TiptapEditorProps) {
  const [hasContent, setHasContent] = useState(false);

  useEffect(() => {
    setHasContent(
      !editor.isEmpty ||
        editor.state.doc.childCount > 1 ||
        !editor.state.doc.firstChild?.type.isTextblock ||
        editor.state.doc.firstChild?.type.name !== 'paragraph',
    );

    const handleUpdate = () => {
      const doc = editor.state.doc;
      const isDefaultEmpty =
        editor.isEmpty && doc.childCount === 1 && doc.firstChild?.type.name === 'paragraph';
      setHasContent(!isDefaultEmpty);
    };

    editor.on('update', handleUpdate);
    return () => {
      editor.off('update', handleUpdate);
    };
  }, [editor]);

  return (
    <div className="relative min-h-[450px] w-full cursor-text p-4 text-body2">
      <EditorContent editor={editor} />
      {!hasContent && placeholder && (
        <div className="pointer-events-none absolute left-4 top-4 text-muted-foreground">
          {placeholder}
        </div>
      )}
    </div>
  );
}
