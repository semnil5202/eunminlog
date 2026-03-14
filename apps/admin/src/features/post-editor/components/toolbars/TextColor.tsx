import { useRef, useState, useEffect } from 'react';

import { cn } from '@/lib/utils';

import type { EditorProps } from './types';

const TEXT_COLORS: { color: string; label: string }[][] = [
  [
    { color: '#e53935', label: '빨강' },
    { color: '#f57c00', label: '주황' },
    { color: '#fbc02d', label: '노랑' },
  ],
  [
    { color: '#4caf50', label: '초록' },
    { color: '#2196f3', label: '파랑' },
    { color: '#1565c0', label: '남색' },
  ],
  [
    { color: '#9c27b0', label: '보라' },
    { color: '#9e9e9e', label: '회색' },
    { color: '#000000', label: '검정' },
  ],
];

export function TextColor({ editor }: EditorProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const inTable = editor.isActive('table');
      setPos({ top: rect.bottom + (inTable ? 40 : 4), left: rect.left });
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (
        !panelRef.current?.contains(e.target as Node) &&
        !buttonRef.current?.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div className="flex items-center">
      <button
        ref={buttonRef}
        type="button"
        tabIndex={-1}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex h-8 w-8 cursor-pointer items-center justify-center rounded hover:bg-accent',
          (open || (editor.isActive('textStyle') && !editor.isActive('textStyle', { color: '#000000' }))) && 'bg-gray-200',
        )}
        title="글자 색상"
      >
        <span className="text-sm font-bold leading-none text-red-600">A</span>
      </button>
      {open && (
        <div
          ref={panelRef}
          className="fixed z-50 rounded-lg border bg-background p-1.5 shadow-md"
          style={{ top: pos.top, left: pos.left }}
        >
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              editor.chain().focus().unsetColor().run();
              setOpen(false);
            }}
            className="mb-1 flex h-7 w-full cursor-pointer items-center justify-center rounded px-2 text-xs text-foreground hover:bg-accent"
          >
            색상 초기화
          </button>
          <div className="grid grid-cols-3">
            {TEXT_COLORS.flat().map(({ color, label }) => (
              <button
                key={color}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  editor.chain().focus().setColor(color).run();
                  setOpen(false);
                }}
                className={cn(
                  'h-8 w-8 cursor-pointer hover:brightness-110',
                  editor.isActive('textStyle', { color }) &&
                    'ring-2 ring-primary ring-inset',
                )}
                style={{ backgroundColor: color }}
                title={label}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
