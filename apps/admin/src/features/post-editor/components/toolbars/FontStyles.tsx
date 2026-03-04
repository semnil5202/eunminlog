import { cn } from '@/lib/utils';
import { BoldIcon, ItalicIcon, UnderlineIcon } from '../icons';

import type { EditorProps } from './types';

export function FontStyles({ editor }: EditorProps) {
  return (
    <div className="flex items-center gap-0.5">
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBold().run()}
        disabled={!editor.can().chain().focus().toggleBold().run()}
        className={cn(
          'flex h-8 w-8 cursor-pointer items-center justify-center rounded text-foreground hover:bg-accent',
          editor.isActive('bold') && 'bg-accent',
        )}
      >
        <BoldIcon />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        disabled={!editor.can().chain().focus().toggleItalic().run()}
        className={cn(
          'flex h-8 w-8 cursor-pointer items-center justify-center rounded text-foreground hover:bg-accent',
          editor.isActive('italic') && 'bg-accent',
        )}
      >
        <ItalicIcon />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        disabled={!editor.can().chain().focus().toggleUnderline().run()}
        className={cn(
          'flex h-8 w-8 cursor-pointer items-center justify-center rounded text-foreground hover:bg-accent',
          editor.isActive('underline') && 'bg-accent',
        )}
      >
        <UnderlineIcon />
      </button>
    </div>
  );
}
