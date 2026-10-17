/** 빌드 타임 번역 조회 API. */

import type { Post, PostTranslation, LocalizedPost } from '@/shared/types/post';
import type { Locale } from '@/shared/types/common';
import { getBuildData } from '@/shared/lib/build-data';
import { resolveLocalizedPost } from '@/shared/lib/build-data-index';

export const getTranslation = async (
  postId: string,
  locale: Locale,
): Promise<PostTranslation | undefined> =>
  (await getBuildData()).translationsByPostId.get(postId)?.get(locale);

export const getTranslationsForPost = async (postId: string): Promise<PostTranslation[]> => [
  ...((await getBuildData()).translationsByPostId.get(postId)?.values() ?? []),
];

export const getLocalizedPost = async (post: Post, locale: Locale): Promise<LocalizedPost> =>
  resolveLocalizedPost(post, await getTranslation(post.id, locale), locale);
