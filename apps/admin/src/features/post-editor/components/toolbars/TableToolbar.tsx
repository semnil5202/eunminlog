import { useRef, useState, useEffect } from 'react';

import { cn } from '@/lib/utils';
import { TableIcon } from '../icons';

import type { EditorProps } from './types';

export function TableToolbar({ editor }: EditorProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [isInTable, setIsInTable] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 });

  useEffect(() => {
    const handleUpdate = () => {
      setIsInTable(editor.isActive('table'));
    };

    editor.on('selectionUpdate', handleUpdate);
    editor.on('update', handleUpdate);
    return () => {
      editor.off('selectionUpdate', handleUpdate);
      editor.off('update', handleUpdate);
    };
  }, [editor]);

  useEffect(() => {
    if (isInTable && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const parent = buttonRef.current.closest('[class*="border-b"]');
      const parentRect = parent?.getBoundingClientRect();
      const right = parentRect
        ? window.innerWidth - parentRect.right + parentRect.width * 0.2
        : window.innerWidth - rect.right;
      setDropdownPos({ top: rect.bottom + 4, right: Math.max(8, right) });
    }
  }, [isInTable]);

  return (
    <div className="flex items-center gap-0.5">
      <button
        ref={buttonRef}
        type="button"
        tabIndex={-1}
        onClick={() =>
          editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
        }
        className={cn(
          'flex h-8 w-8 cursor-pointer items-center justify-center rounded text-foreground hover:bg-accent',
          isInTable && 'bg-accent',
        )}
      >
        <TableIcon />
      </button>
      {isInTable && (
        <div
          className="fixed z-50 flex max-w-[calc(100vw-16px)] items-center gap-0.5 overflow-x-auto rounded border bg-background px-1 py-0.5 shadow-md"
          style={{ top: dropdownPos.top, right: dropdownPos.right }}
        >
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              editor.chain().focus().addColumnAfter().run();
            }}
            className="flex h-7 cursor-pointer items-center justify-center rounded px-2 text-xs text-foreground hover:bg-accent"
          >
            +열
          </button>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              editor.chain().focus().deleteColumn().run();
            }}
            className="flex h-7 cursor-pointer items-center justify-center rounded px-2 text-xs text-foreground hover:bg-accent"
          >
            -열
          </button>
          <div className="mx-0.5 h-4 w-px bg-border" />
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              editor.chain().focus().addRowAfter().run();
            }}
            className="flex h-7 cursor-pointer items-center justify-center rounded px-2 text-xs text-foreground hover:bg-accent"
          >
            +행
          </button>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              editor.chain().focus().deleteRow().run();
            }}
            className="flex h-7 cursor-pointer items-center justify-center rounded px-2 text-xs text-foreground hover:bg-accent"
          >
            -행
          </button>
          <div className="mx-0.5 h-4 w-px bg-border" />
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              editor.chain().focus().mergeCells().run();
            }}
            disabled={!editor.can().mergeCells()}
            className="flex h-7 cursor-pointer items-center justify-center rounded px-2 text-xs text-foreground hover:bg-accent disabled:cursor-default disabled:opacity-40"
          >
            병합
          </button>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              editor.chain().focus().splitCell().run();
            }}
            disabled={!editor.can().splitCell()}
            className="flex h-7 cursor-pointer items-center justify-center rounded px-2 text-xs text-foreground hover:bg-accent disabled:cursor-default disabled:opacity-40"
          >
            분할
          </button>
          <div className="mx-0.5 h-4 w-px bg-border" />
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              editor.chain().focus().deleteTable().run();
            }}
            className="flex h-7 cursor-pointer items-center justify-center rounded px-2 text-xs text-destructive hover:bg-accent"
          >
            삭제
          </button>
        </div>
      )}
    </div>
  );
}
