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
  const hasExplicitAlign = ALIGNMENTS.some(({ value }) =>
    editor.isActive({ textAlign: value }),
  );

  return (
    <div className="flex items-center gap-0.5">
      {ALIGNMENTS.map(({ value, icon: Icon }) => {
        const isActive =
          editor.isActive({ textAlign: value }) ||
          (value === 'justify' && !hasExplicitAlign);

        return (
          <button
            key={value}
            type="button"
            tabIndex={-1}
            onClick={() => editor.chain().focus().setTextAlign(value).run()}
            className={cn(
              'flex h-8 w-8 cursor-pointer items-center justify-center rounded text-foreground hover:bg-accent',
              isActive && 'bg-gray-200',
            )}
          >
            <Icon />
          </button>
        );
      })}
    </div>
  );
}
