import { cn } from '@/lib/utils';
import { AlignCenterIcon, AlignJustifyIcon, AlignLeftIcon, AlignRightIcon } from '../icons';

import type { EditorProps } from './types';

const ALIGNMENTS = [
  { value: 'left', icon: AlignLeftIcon },
  { value: 'center', icon: AlignCenterIcon },
  { value: 'right', icon: AlignRightIcon },
  { value: 'justify', icon: AlignJustifyIcon },
] as const;

export function TextAlign({ editor }: EditorProps) {
  return (
    <div className="flex items-center gap-0.5">
      {ALIGNMENTS.map(({ value, icon: Icon }) => (
        <button
          key={value}
          type="button"
          tabIndex={-1}
          onClick={() => editor.chain().focus().setTextAlign(value).run()}
          className={cn(
            'flex h-8 w-8 cursor-pointer items-center justify-center rounded text-foreground hover:bg-accent',
            editor.isActive({ textAlign: value }) && 'bg-accent',
          )}
        >
          <Icon />
        </button>
      ))}
    </div>
  );
}
