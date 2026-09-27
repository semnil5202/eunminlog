import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'sonner';
import { TiptapEditorContainer } from '@/features/post-editor/containers/TiptapEditorContainer';
import { ImageAltSheet } from '@/features/post-editor/components/ImageAltSheet';
import {
  copyReplacementImageAlt,
  mergeImageAltEdits,
} from '@/features/post-editor/lib/image-alt-replacement';
import { useAutoSaveDraft } from '@/features/draft/hooks/useAutoSaveDraft';
import { fetchDraft } from '@/features/draft/api';
import { POST_FORM_DEFAULTS } from '@/features/post-editor/types/form';
import './styles.css';

function App() {
  const [content, setContent] = useState('<p>앞 본문 뒤 본문</p>');
  const [imageAlts, setImageAlts] = useState<{ src: string; alt: string }[]>([]);
  const [thumbnailAlt, setThumbnailAlt] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const altTest = new URLSearchParams(location.search).has('alt');
  const draft = useAutoSaveDraft({
    getValues: () => ({ ...POST_FORM_DEFAULTS, title: '테스트', content, thumbnailAlt }),
    getImageAlts: () => imageAlts,
    enabled: altTest,
  });
  const thumbnail =
    'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="60"/>';
  return (
    <main style={{ maxWidth: 760, margin: '24px auto', padding: 16 }}>
      <h1>캐러셀 테스트 편집기</h1>
      {altTest && (
        <label>
          썸네일 이미지 설명 (alt)
          <input value={thumbnailAlt} onChange={(e) => setThumbnailAlt(e.target.value)} />
        </label>
      )}
      <TiptapEditorContainer
        content={content}
        onChange={setContent}
        imageAlts={imageAlts}
        onImageAltChange={(src, alt) =>
          setImageAlts((entries) => mergeImageAltEdits(entries, [{ src, alt }]))
        }
        onImageReplace={(previous, next) =>
          setImageAlts((entries) => copyReplacementImageAlt(entries, previous, next))
        }
      />
      {altTest && (
        <>
          <button onClick={() => setDrawerOpen(true)}>이미지 alt 입력</button>
          <button onClick={() => void draft.saveManual()}>임시저장</button>
          <button
            onClick={() =>
              void fetchDraft('test-draft').then((saved) => {
                setContent(saved.form_data.content as string);
                setThumbnailAlt(saved.form_data.thumbnailAlt as string);
                setImageAlts(saved.image_alts);
                draft.loadDraftId(saved.id);
              })
            }
          >
            임시저장 불러오기
          </button>
          <ImageAltSheet
            open={drawerOpen}
            onOpenChange={setDrawerOpen}
            content={content}
            imageAlts={imageAlts}
            onComplete={(updates) =>
              setImageAlts((entries) => mergeImageAltEdits(entries, updates))
            }
            thumbnail={thumbnail}
            thumbnailAlt={thumbnailAlt}
            onThumbnailAltChange={setThumbnailAlt}
          />
          <output data-testid="saved-alts" hidden>
            {JSON.stringify(imageAlts)}
          </output>
        </>
      )}
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
