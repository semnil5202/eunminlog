/** 내부 링크 북마크의 다국어 대응. 빌드 타임에 eunminlog.site URL의 title/description을 해당 locale로 교체한다. */

import { DEFAULT_LOCALE, type Locale } from '@/shared/types/common';
import { getPostBySlug } from '@/features/post-feed/api/posts';
import { getTranslation } from '@/features/post-feed/api/translations';
import { t } from '@/shared/lib/i18n/translations';

const INTERNAL_HOST = 'eunminlog.site';

const BOOKMARK_REGEX = /<aside\s[^>]*data-type="link-bookmark"[^>]*>[\s\S]*?<\/aside>/g;

function extractAttr(html: string, attr: string): string {
  const match = html.match(new RegExp(`${attr}="([^"]*)"`));
  return match?.[1] ?? '';
}

function isInternalUrl(url: string): boolean {
  try {
    return new URL(url).hostname.endsWith(INTERNAL_HOST);
  } catch {
    return false;
  }
}

function extractSlugFromUrl(url: string): string | null {
  try {
    const { pathname } = new URL(url);
    const segments = pathname.replace(/\/$/, '').split('/').filter(Boolean);
    return segments.at(-1) ?? null;
  } catch {
    return null;
  }
}

function replaceLocaleInUrl(url: string, locale: Locale): string {
  try {
    const parsed = new URL(url);
    const segments = parsed.pathname.replace(/\/$/, '').split('/').filter(Boolean);

    const localePattern = /^(en|ja|zh-CN|zh-TW|id|vi|th)$/;
    if (segments.length > 0 && localePattern.test(segments[0])) {
      segments.shift();
    }

    if (locale !== DEFAULT_LOCALE) {
      segments.unshift(locale);
    }

    parsed.pathname = '/' + segments.join('/') + '/';
    return parsed.toString();
  } catch {
    return url;
  }
}

function replaceBookmarkAttrs(
  html: string,
  newUrl: string,
  newTitle: string,
  newDescription: string,
  locale: Locale,
): string {
  let result = html;

  const oldUrl = extractAttr(html, 'data-url');
  const oldTitle = extractAttr(html, 'data-title');
  const oldDescription = extractAttr(html, 'data-description');

  result = result.replace(`data-url="${oldUrl}"`, `data-url="${newUrl}"`);
  result = result.replace(`data-title="${oldTitle}"`, `data-title="${newTitle}"`);
  result = result.replace(
    `data-description="${oldDescription}"`,
    `data-description="${newDescription}"`,
  );

  result = result.replace(`href="${oldUrl}"`, `href="${newUrl}"`);

  if (oldTitle) {
    result = result.replace(
      `<strong${result.includes(`>${oldTitle}</strong>`) ? '' : ' '}`,
      '<strong',
    );
    result = result.replaceAll(`>${oldTitle}</strong>`, `>${newTitle}</strong>`);
  }

  if (oldDescription) {
    result = result.replaceAll(`>${oldDescription}</p>`, `>${newDescription}</p>`);
  }

  const profileImageLabel = t('bookmark.profileImage', locale);
  const faviconAltRegex = /(<cite[^>]*>[\s\S]*?<img[^>]*?)alt="[^"]*"/;
  result = result.replace(faviconAltRegex, `$1alt="${newTitle} ${profileImageLabel}"`);

  return result;
}

export async function injectLocalizedBookmarks(html: string, locale: Locale): Promise<string> {
  if (locale === DEFAULT_LOCALE) return html;

  const bookmarks = [...html.matchAll(BOOKMARK_REGEX)];
  if (bookmarks.length === 0) return html;

  let result = html;

  for (const match of bookmarks) {
    const bookmarkHtml = match[0];
    const url = extractAttr(bookmarkHtml, 'data-url');

    if (!isInternalUrl(url)) continue;

    const slug = extractSlugFromUrl(url);
    if (!slug) continue;

    const post = await getPostBySlug(slug);
    if (!post) continue;

    const translation = await getTranslation(post.id, locale);
    if (!translation) continue;

    const newUrl = replaceLocaleInUrl(url, locale);
    const newTitle = translation.title;
    const newDescription = translation.description || post.description;

    const replaced = replaceBookmarkAttrs(bookmarkHtml, newUrl, newTitle, newDescription, locale);
    result = result.replace(bookmarkHtml, replaced);
  }

  return result;
}
