'use client';

import { type ChangeEvent, useState } from 'react';

import { Separator } from '@/components/ui/separator';
import { TiptapEditorContainer } from '@/features/post-editor/containers/TiptapEditorContainer';

const TITLE_MAX_LENGTH = 40;

export default function NewPostPage() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const handleTitleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.length <= TITLE_MAX_LENGTH) {
      setTitle(value);
    }
  };

  return (
    <div className="mx-auto max-w-[688px]">
      <TiptapEditorContainer content={content} onChange={setContent}>
        <div className="p-4">
          <div className="flex items-center justify-between">
            <input
              type="text"
              value={title}
              onChange={handleTitleChange}
              placeholder="게시글 제목"
              className="w-full text-title2 font-bold outline-none placeholder:text-muted-foreground"
            />
            <span className="shrink-0 pl-3 text-caption1 text-muted-foreground">
              {title.length}/{TITLE_MAX_LENGTH}
            </span>
          </div>
        </div>
        <Separator />
      </TiptapEditorContainer>
    </div>
  );
}
