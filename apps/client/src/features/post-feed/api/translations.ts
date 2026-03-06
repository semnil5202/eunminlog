/** 빌드 타임 번역 쿼리 API. Supabase PostgreSQL 기반. */

import type { Post, PostTranslation, LocalizedPost } from '@/shared/types/post';
import type { Locale } from '@/shared/types/common';
import { supabase } from '@/shared/lib/supabase';

export const getTranslation = async (
  postId: string,
  locale: Locale,
): Promise<PostTranslation | undefined> => {
  const { data, error } = await supabase
    .from('post_translations')
    .select('*')
    .eq('post_id', postId)
    .eq('locale', locale)
    .maybeSingle();

  if (error) throw new Error(`getTranslation failed: ${error.message}`);
  return (data as PostTranslation) ?? undefined;
};

export const getTranslationsForPost = async (postId: string): Promise<PostTranslation[]> => {
  const { data, error } = await supabase
    .from('post_translations')
    .select('*')
    .eq('post_id', postId);

  if (error) throw new Error(`getTranslationsForPost failed: ${error.message}`);
  return (data ?? []) as PostTranslation[];
};

export const getLocalizedPost = async (post: Post, locale: Locale): Promise<LocalizedPost> => {
  const translation = await getTranslation(post.id, locale);

  if (translation) {
    return {
      ...post,
      title: translation.title,
      description: translation.description,
      content: translation.content,
      translated_place_name: translation.place_name,
      translated_address: translation.address,
      locale,
    };
  }

  return {
    ...post,
    translated_place_name: null,
    translated_address: null,
    locale,
  };
};
