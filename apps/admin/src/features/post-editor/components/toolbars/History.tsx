import { cn } from '@/lib/utils';
import { RedoIcon, UndoIcon } from '../icons';

import type { EditorProps } from './types';

export function History({ editor }: EditorProps) {
  const canUndo = editor.can().chain().focus().undo().run();
  const canRedo = editor.can().chain().focus().redo().run();

  return (
    <div className="flex items-center gap-0.5">
      <button
        type="button"
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!canUndo}
        className={cn(
          'flex h-8 w-8 cursor-pointer items-center justify-center rounded text-foreground hover:bg-accent',
          !canUndo && 'opacity-40',
        )}
      >
        <UndoIcon />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!canRedo}
        className={cn(
          'flex h-8 w-8 cursor-pointer items-center justify-center rounded text-foreground hover:bg-accent',
          !canRedo && 'opacity-40',
        )}
      >
        <RedoIcon />
      </button>
    </div>
  );
}
