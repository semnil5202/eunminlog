'use client';

import { type ReactNode, useEffect, useState } from 'react';

import { cn } from '@/lib/utils';
import { useTiptapEditor } from '../hooks/useTiptapEditor';
import { Toolbar } from '../components/Toolbar';
import { TiptapEditor } from '../components/TiptapEditor';
import { TiptapEditorSkeleton } from '../components/TiptapEditorSkeleton';

type TiptapEditorContainerProps = {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  className?: string;
  children?: ReactNode;
};

export function TiptapEditorContainer({
  content,
  onChange,
  placeholder = '본문을 입력하세요.',
  className,
  children,
}: TiptapEditorContainerProps) {
  const [isMounted, setIsMounted] = useState(false);
  const editor = useTiptapEditor({ content, onChange });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted || !editor) {
    return <TiptapEditorSkeleton />;
  }

  return (
    <div className={cn('overflow-hidden border-t border-b', className)}>
      <Toolbar editor={editor} />
      {children}
      <TiptapEditor editor={editor} placeholder={placeholder} />
    </div>
  );
}
