import { cn } from '@/lib/utils';
import { TableIcon } from '../icons';

import type { EditorProps } from './types';

export function TableToolbar({ editor }: EditorProps) {
  const isInTable = editor.isActive('table');

  return (
    <div className="flex items-center gap-0.5">
      <button
        type="button"
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
        <>
          <button
            type="button"
            onClick={() => editor.chain().focus().addColumnAfter().run()}
            className="flex h-8 cursor-pointer items-center justify-center rounded px-1.5 text-xs text-foreground hover:bg-accent"
          >
            +열
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().deleteColumn().run()}
            className="flex h-8 cursor-pointer items-center justify-center rounded px-1.5 text-xs text-foreground hover:bg-accent"
          >
            -열
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().addRowAfter().run()}
            className="flex h-8 cursor-pointer items-center justify-center rounded px-1.5 text-xs text-foreground hover:bg-accent"
          >
            +행
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().deleteRow().run()}
            className="flex h-8 cursor-pointer items-center justify-center rounded px-1.5 text-xs text-foreground hover:bg-accent"
          >
            -행
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().deleteTable().run()}
            className="flex h-8 cursor-pointer items-center justify-center rounded px-1.5 text-xs text-destructive hover:bg-accent"
          >
            삭제
          </button>
        </>
      )}
    </div>
  );
}
