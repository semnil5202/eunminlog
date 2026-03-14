import { useState, useEffect } from 'react';

import type { Editor } from '@tiptap/react';

import {
  FontStyles,
  History,
  List,
  TableToolbar,
  TextAlign,
  TextColor,
  TiptapLink,
  UploadImage,
  VerticalDivider,
} from './toolbars';

type ToolbarProps = {
  editor: Editor;
};

export function Toolbar({ editor }: ToolbarProps) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const forceUpdate = () => setTick((t) => t + 1);
    editor.on('selectionUpdate', forceUpdate);
    editor.on('update', forceUpdate);
    return () => {
      editor.off('selectionUpdate', forceUpdate);
      editor.off('update', forceUpdate);
    };
  }, [editor]);

  return (
    <div className="sticky top-0 z-10 flex h-11 items-center justify-between overflow-x-auto border-b bg-muted px-2">
      <div className="flex items-center gap-1">
        <FontStyles editor={editor} />
        <VerticalDivider />
        <TextColor editor={editor} />
        <VerticalDivider />
        <TiptapLink editor={editor} />
        <VerticalDivider />
        <List editor={editor} />
        <VerticalDivider />
        <TextAlign editor={editor} />
        <VerticalDivider />
        <UploadImage editor={editor} />
        <VerticalDivider />
        <TableToolbar editor={editor} />
      </div>
      <History editor={editor} />
    </div>
  );
}
