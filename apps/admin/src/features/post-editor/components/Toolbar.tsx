import { useState, useEffect } from 'react';

import type { Editor } from '@tiptap/react';
import { cn } from '@/lib/utils';

import { CodeIcon } from './icons';
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
  isHtmlMode: boolean;
  onToggleHtmlMode: () => void;
};

export function Toolbar({ editor, isHtmlMode, onToggleHtmlMode }: ToolbarProps) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const forceUpdate = () => setTick((tick) => tick + 1);
    editor.on('selectionUpdate', forceUpdate);
    editor.on('update', forceUpdate);
    return () => {
      editor.off('selectionUpdate', forceUpdate);
      editor.off('update', forceUpdate);
    };
  }, [editor]);

  return (
    <div className="sticky top-0 z-10 flex h-11 items-center justify-between overflow-x-auto border-b bg-muted px-2">
      <div
        className={cn('flex items-center gap-1', isHtmlMode && 'opacity-40 pointer-events-none')}
      >
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
      <div className="flex items-center gap-0.5">
        <div className={cn(isHtmlMode && 'opacity-40 pointer-events-none')}>
          <History editor={editor} />
        </div>
        <VerticalDivider />
        <button
          type="button"
          tabIndex={-1}
          onClick={onToggleHtmlMode}
          className={cn(
            'flex h-8 w-8 cursor-pointer items-center justify-center rounded text-foreground hover:bg-accent',
            isHtmlMode && 'bg-gray-200',
          )}
        >
          <CodeIcon />
        </button>
      </div>
    </div>
  );
}
