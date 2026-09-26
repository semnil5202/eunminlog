import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'sonner';
import { TiptapEditorContainer } from '@/features/post-editor/containers/TiptapEditorContainer';
import './styles.css';

function App() {
  const [content, setContent] = useState('<p>앞 본문 뒤 본문</p>');
  return (
    <main style={{ maxWidth: 760, margin: '24px auto', padding: 16 }}>
      <h1>캐러셀 테스트 편집기</h1>
      <TiptapEditorContainer content={content} onChange={setContent} />
      <input aria-label="다른 입력란" />
      <output data-testid="saved-html" style={{ display: 'none' }}>
        {content}
      </output>
      <Toaster />
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
