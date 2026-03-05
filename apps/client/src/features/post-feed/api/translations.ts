/** 빌드 타임 번역 쿼리 API. Mock 데이터 기반이며 Supabase 마이그레이션 시 함수 시그니처는 유지한다. */

import type { Post, PostTranslation, LocalizedPost } from '@/shared/types/post';
import type { Locale } from '@/shared/types/common';
import { MOCK_TRANSLATIONS } from '@/features/post-feed/mock/translations';

/**
 * Returns the translation for a specific post and locale, or `undefined`
 * when no translation has been created yet.
 */
export const getTranslation = async (
  postId: string,
  locale: Locale,
): Promise<PostTranslation | undefined> =>
  MOCK_TRANSLATIONS.find((t) => t.post_id === postId && t.locale === locale);

/**
 * Returns all available translations for a given post, in insertion order.
 * Useful for building hreflang entries on detail pages.
 */
export const getTranslationsForPost = async (postId: string): Promise<PostTranslation[]> =>
  MOCK_TRANSLATIONS.filter((t) => t.post_id === postId);

/**
 * Returns a LocalizedPost — the original Post record enriched with translated
 * title, description, and content for the requested locale.
 *
 * Fallback strategy: if no translation exists the Korean source content is
 * used as-is and `locale` is set to the requested locale (callers can check
 * the locale value to decide whether to show a translation-unavailable notice).
 *
 * @param post   The source Post object fetched from the posts API.
 * @param locale The target locale requested by the page or user.
 */
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
