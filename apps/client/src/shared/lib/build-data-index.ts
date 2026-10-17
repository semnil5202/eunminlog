import type { Post, PostTranslation, LocalizedPost } from '../types/post';
import type { Locale } from '../types/common';

export type CategoryRow = {
  id: string;
  slug: string;
  name: string;
  parent_id: string | null;
  sort_order: number;
  is_multilingual: boolean;
};

export type CategoryTranslationRow = {
  category_id: string;
  locale: string;
  name: string;
};

export type CategoryTreeNode = {
  slug: string;
  name: string;
  translations: Record<string, string>;
  subCategories: {
    slug: string;
    name: string;
    isMultilingual: boolean;
    translations: Record<string, string>;
  }[];
};

export type BuildDataRows = {
  posts: Post[];
  translations: PostTranslation[];
  categories: CategoryRow[];
  categoryTranslations: CategoryTranslationRow[];
};

export type BuildData = BuildDataRows & {
  postsById: Map<string, Post>;
  postsBySlug: Map<string, Post>;
  translationsByPostId: Map<string, Map<Locale, PostTranslation>>;
  postsByCategory: Map<string, Post[]>;
  postsBySubCategory: Map<string, Post[]>;
  categoryTree: CategoryTreeNode[];
  postsByIdOrder: Post[];
};

/** 분류와 하위 분류를 충돌 없는 인덱스 키로 만든다.
 * @param category 분류 slug
 * @param subCategory 하위 분류 slug
 */
export const subCategoryKey = (category: string, subCategory: string): string =>
  JSON.stringify([category, subCategory]);

/** 수집한 행에서 빌드 전체가 재사용할 인덱스를 만든다.
 * @param rows 전체 수집이 검증된 원시 행
 */
export const createBuildData = (rows: BuildDataRows): BuildData => {
  const postsById = new Map(rows.posts.map((post) => [post.id, post]));
  const postsBySlug = new Map(rows.posts.map((post) => [post.slug, post]));
  const translationsByPostId = new Map<string, Map<Locale, PostTranslation>>();
  for (const translation of rows.translations) {
    if (!translationsByPostId.has(translation.post_id))
      translationsByPostId.set(translation.post_id, new Map());
    translationsByPostId.get(translation.post_id)!.set(translation.locale, translation);
  }
  const postsByCategory = new Map<string, Post[]>();
  const postsBySubCategory = new Map<string, Post[]>();
  for (const post of rows.posts) {
    const key = subCategoryKey(post.category, post.sub_category);
    if (!postsByCategory.has(post.category)) postsByCategory.set(post.category, []);
    if (!postsBySubCategory.has(key)) postsBySubCategory.set(key, []);
    postsByCategory.get(post.category)!.push(post);
    postsBySubCategory.get(key)!.push(post);
  }
  const transMap = new Map<string, Record<string, string>>();
  for (const translation of rows.categoryTranslations) {
    if (!transMap.has(translation.category_id)) transMap.set(translation.category_id, {});
    transMap.get(translation.category_id)![translation.locale] = translation.name;
  }
  const parentsById = new Map<string, CategoryTreeNode>();
  for (const row of rows.categories) {
    if (!row.parent_id) {
      parentsById.set(row.id, {
        slug: row.slug,
        name: row.name,
        translations: transMap.get(row.id) ?? {},
        subCategories: [],
      });
    }
  }
  for (const row of rows.categories) {
    if (row.parent_id) {
      parentsById.get(row.parent_id)?.subCategories.push({
        slug: row.slug,
        name: row.name,
        isMultilingual: row.is_multilingual,
        translations: transMap.get(row.id) ?? {},
      });
    }
  }
  return {
    ...rows,
    postsById,
    postsBySlug,
    translationsByPostId,
    postsByCategory,
    postsBySubCategory,
    categoryTree: [...parentsById.values()],
    postsByIdOrder: [...rows.posts].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)),
  };
};

/** 번역 유무와 필드별 대체 규칙을 적용한다.
 * @param post 원문 글
 * @param locale 출력 언어
 * @param translation 해당 언어의 번역
 */
export const resolveLocalizedPost = (
  post: Post,
  translation: PostTranslation | undefined,
  locale: Locale,
): LocalizedPost => {
  if (translation) {
    return {
      ...post,
      title: translation.title,
      description: translation.description || post.description,
      content: translation.content,
      translated_place_name: translation.place_name,
      translated_address: translation.address,
      translated_product_name: translation.product_name,
      translated_purchase_source: translation.purchase_source,
      translated_price_prefix: translation.price_prefix,
      thumbnail_alt: translation.thumbnail_alt || post.thumbnail_alt,
      image_alts: translation.image_alts?.length ? translation.image_alts : post.image_alts,
      locale,
    };
  }
  return {
    ...post,
    translated_place_name: null,
    translated_address: null,
    translated_product_name: null,
    translated_purchase_source: null,
    translated_price_prefix: null,
    image_alts: post.image_alts ?? [],
    locale,
  };
};
