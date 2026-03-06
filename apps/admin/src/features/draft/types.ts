import type { PostFormValues } from '@/features/post-editor/types/form';

export type Draft = {
  id: string;
  post_id: string | null;
  title: string;
  form_data: PostFormValues;
  created_at: string;
  updated_at: string;
};

export type DraftListItem = Pick<Draft, 'id' | 'post_id' | 'title' | 'updated_at'>;
