import type { Editor } from '@tiptap/react';

import { FontStyles, History, List, TiptapLink, VerticalDivider } from './toolbars';

type ToolbarProps = {
  editor: Editor;
};


export function Toolbar({ editor }: ToolbarProps) {
  return (
    <div className="flex h-11 items-center justify-between overflow-x-auto border-b bg-muted/50 px-2">
      <div className="flex items-center gap-1">
        <FontStyles editor={editor} />
        <VerticalDivider />
        <TiptapLink editor={editor} />
        <VerticalDivider />
        <List editor={editor} />
      </div>
      <History editor={editor} />
    </div>
  );
}
