import { cn } from '@/lib/utils';
import { OrderIcon, UnorderIcon } from '../icons';

import type { EditorProps } from './types';

export function List({ editor }: EditorProps) {
  return (
    <div className="flex items-center gap-0.5">
      <button
        type="button"
        tabIndex={-1}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        disabled={!editor.can().chain().focus().toggleBulletList().run()}
        className={cn(
          'flex h-8 w-8 cursor-pointer items-center justify-center rounded text-foreground hover:bg-accent',
          editor.isActive('bulletList') && 'bg-gray-200',
        )}
      >
        <UnorderIcon />
      </button>
      <button
        type="button"
        tabIndex={-1}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        disabled={!editor.can().chain().focus().toggleOrderedList().run()}
        className={cn(
          'flex h-8 w-8 cursor-pointer items-center justify-center rounded text-foreground hover:bg-accent',
          editor.isActive('orderedList') && 'bg-gray-200',
        )}
      >
        <OrderIcon />
      </button>
    </div>
  );
}
