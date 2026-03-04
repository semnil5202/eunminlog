'use client';

import { useParams } from 'next/navigation';

export default function EditPostPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <div>
      <h1 className="text-xl font-bold">글 편집</h1>
      <p className="mt-2 text-gray-500">Post ID: {id}</p>
      <p className="text-gray-500">Tiptap 에디터는 post-editor feature에서 구현 예정</p>
    </div>
  );
}
