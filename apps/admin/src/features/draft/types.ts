import type { PostFormValues } from '@/features/post-editor/types/form';
import type { ImageAlt, TranslationResult } from '@/features/translation/types';

export type TranslationData = {
  confirmedTerms: { original: string; translation: string | Record<string, string> }[];
  results: TranslationResult[];
};

export type Draft = {
  id: string;
  post_id: string | null;
  title: string;
  form_data: PostFormValues;
  translation_data: TranslationData | null;
  image_alts: ImageAlt[];
  created_at: string;
  updated_at: string;
};

export type DraftListItem = Pick<Draft, 'id' | 'post_id' | 'title' | 'updated_at'>;
