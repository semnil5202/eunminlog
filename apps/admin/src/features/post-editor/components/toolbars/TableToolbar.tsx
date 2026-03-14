import { useRef, useState, useEffect } from 'react';

import { cn } from '@/lib/utils';
import { TableIcon } from '../icons';

import type { EditorProps } from './types';

const CELL_COLORS: { color: string; label: string }[] = [
  { color: 'transparent', label: '없음' },
  { color: '#f3f4f6', label: '회색' },
  { color: '#fef9c3', label: '노랑' },
  { color: '#dcfce7', label: '초록' },
  { color: '#dbeafe', label: '파랑' },
  { color: '#fce7f3', label: '분홍' },
  { color: '#ffedd5', label: '주황' },
];

export function TableToolbar({ editor }: EditorProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [isInTable, setIsInTable] = useState(false);
  const [canMerge, setCanMerge] = useState(false);
  const [canSplit, setCanSplit] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 });

  useEffect(() => {
    const handleUpdate = () => {
      setIsInTable(editor.isActive('table'));
      setCanMerge(editor.can().mergeCells());
      setCanSplit(editor.can().splitCell());
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
        ? window.innerWidth - parentRect.right + parentRect.width * 0.15
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
          isInTable && 'bg-gray-200',
        )}
      >
        <TableIcon />
      </button>
      {isInTable && (
        <div
          className="fixed z-50 flex max-w-[calc(100vw-16px)] items-center gap-0.5 overflow-x-auto border bg-background px-1 py-0.5 shadow-md"
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
            disabled={!canMerge}
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
            disabled={!canSplit}
            className="flex h-7 cursor-pointer items-center justify-center rounded px-2 text-xs text-foreground hover:bg-accent disabled:cursor-default disabled:opacity-40"
          >
            분할
          </button>
          <div className="mx-0.5 h-4 w-px bg-border" />
          {CELL_COLORS.map(({ color, label }) => (
            <button
              key={`bg-${label}`}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                editor.chain().focus().setCellAttribute('background', color).run();
              }}
              className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded hover:bg-accent"
              title={`배경: ${label}`}
            >
              <span
                className="h-4 w-4 rounded-sm border border-gray-300"
                style={{ backgroundColor: color }}
              >
                {color === 'transparent' && (
                  <svg viewBox="0 0 16 16" className="h-4 w-4 text-gray-400">
                    <line x1="2" y1="14" x2="14" y2="2" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                )}
              </span>
            </button>
          ))}
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
