import { useCallback, useEffect, useRef, useState } from 'react';

import type { PostFormValues } from '@/features/post-editor/types/form';
import { saveDraft } from '../api';

const AUTO_SAVE_INTERVAL = 2 * 60 * 1000;

type UseAutoSaveDraftParams = {
  getValues: () => PostFormValues;
  postId?: string | null;
  enabled?: boolean;
};

export function useAutoSaveDraft({ getValues, postId, enabled = true }: UseAutoSaveDraftParams) {
  const [draftId, setDraftId] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const save = useCallback(async () => {
    const values = getValues();
    if (!values.title.trim() && !values.content.trim()) return;

    setIsSaving(true);
    try {
      const draft = await saveDraft({
        id: draftId ?? undefined,
        postId: postId ?? null,
        title: values.title || '제목 없음',
        formData: values,
      });
      setDraftId(draft.id);
      setLastSavedAt(new Date());
    } catch {
      // 자동 저장 실패는 조용히 무시
    } finally {
      setIsSaving(false);
    }
  }, [getValues, draftId, postId]);

  const saveManual = useCallback(async () => {
    setIsSaving(true);
    try {
      const values = getValues();
      const draft = await saveDraft({
        id: draftId ?? undefined,
        postId: postId ?? null,
        title: values.title || '제목 없음',
        formData: values,
      });
      setDraftId(draft.id);
      setLastSavedAt(new Date());
      return draft;
    } finally {
      setIsSaving(false);
    }
  }, [getValues, draftId, postId]);

  useEffect(() => {
    if (!enabled) return;

    timerRef.current = setInterval(save, AUTO_SAVE_INTERVAL);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [save, enabled]);

  const loadDraftId = useCallback((id: string) => {
    setDraftId(id);
  }, []);

  return { draftId, lastSavedAt, isSaving, saveManual, loadDraftId };
}
