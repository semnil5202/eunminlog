import { useCallback, useEffect, useRef, useState } from 'react';

import type { PostFormValues } from '@/features/post-editor/types/form';
import type { ImageAlt } from '@/features/translation/types';
import type { TranslationData } from '../types';
import { saveDraft } from '../api';

const AUTO_SAVE_INTERVAL = 2 * 60 * 1000;

type UseAutoSaveDraftParams = {
  getValues: () => PostFormValues;
  getTranslationData?: () => TranslationData | null;
  getImageAlts?: () => ImageAlt[];
  postId?: string | null;
  enabled?: boolean;
};

export function useAutoSaveDraft({
  getValues,
  getTranslationData,
  getImageAlts,
  postId,
  enabled = true,
}: UseAutoSaveDraftParams) {
  const [draftId, setDraftId] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const paramsRef = useRef({ getValues, getTranslationData, getImageAlts, postId });
  const draftIdRef = useRef<string | null>(null);
  const pendingSaveRef = useRef<ReturnType<typeof saveDraft> | null>(null);
  const lastSnapshotRef = useRef<string>('');

  useEffect(() => {
    paramsRef.current = { getValues, getTranslationData, getImageAlts, postId };
  }, [getValues, getTranslationData, getImageAlts, postId]);

  const persist = useCallback((manual: boolean) => {
    const { getValues, getTranslationData, getImageAlts, postId } = paramsRef.current;
    const values = getValues();
    if (!manual && !values.title.trim() && !values.content.trim()) return;

    const snapshot = JSON.stringify({
      values,
      translationData: getTranslationData?.() ?? null,
      imageAlts: getImageAlts?.() ?? [],
    });
    if (!manual && snapshot === lastSnapshotRef.current) return;
    const captured = JSON.parse(snapshot) as {
      values: PostFormValues;
      translationData: TranslationData | null;
      imageAlts: ImageAlt[];
    };

    setIsSaving(true);
    const request = saveDraft({
      id: draftIdRef.current ?? undefined,
      postId: postId ?? null,
      title: captured.values.title || '제목 없음',
      formData: captured.values,
      translationData: captured.translationData,
      imageAlts: captured.imageAlts,
    })
      .then((draft) => {
        draftIdRef.current = draft.id;
        setDraftId(draft.id);
        setLastSavedAt(new Date());
        lastSnapshotRef.current = snapshot;
        return draft;
      })
      .finally(() => {
        pendingSaveRef.current = null;
        setIsSaving(false);
      });
    pendingSaveRef.current = request;
    return request;
  }, []);

  const saveManual = useCallback(async () => {
    while (pendingSaveRef.current) {
      await pendingSaveRef.current.catch(() => undefined);
    }
    return persist(true)!;
  }, [persist]);

  useEffect(() => {
    if (!enabled) return;

    const timer = setInterval(() => {
      if (!pendingSaveRef.current) void persist(false)?.catch(() => undefined);
    }, AUTO_SAVE_INTERVAL);
    return () => clearInterval(timer);
  }, [persist, enabled]);

  const loadDraftId = useCallback((id: string) => {
    draftIdRef.current = id;
    setDraftId(id);
  }, []);

  return { draftId, lastSavedAt, isSaving, saveManual, loadDraftId };
}
