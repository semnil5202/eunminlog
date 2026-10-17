import { type Locale, DEFAULT_LOCALE } from '@/shared/types/common';
import type { CategoryNode } from '@/shared/types/category';
import { getBuildData } from '@/shared/lib/build-data';

const getTree = async () => (await getBuildData()).categoryTree;

const resolveLabel = (
  name: string,
  translations: Record<string, string>,
  locale: Locale,
): string => {
  if (locale === DEFAULT_LOCALE) return name;
  return translations[locale] ?? name;
};

export const getCategoryLabel = async (category: string, locale: Locale): Promise<string> => {
  const tree = await getTree();
  const cat = tree.find((c) => c.slug === category);
  if (!cat) return category;
  return resolveLabel(cat.name, cat.translations, locale);
};

export const getSubCategoryLabel = async (subCategory: string, locale: Locale): Promise<string> => {
  const tree = await getTree();
  for (const cat of tree) {
    const sub = cat.subCategories.find((s) => s.slug === subCategory);
    if (sub) return resolveLabel(sub.name, sub.translations, locale);
  }
  return subCategory;
};

export const getCategoryTree = async (locale: Locale): Promise<CategoryNode[]> => {
  const tree = await getTree();

  return tree.map((cat) => ({
    slug: cat.slug,
    label: resolveLabel(cat.name, cat.translations, locale),
    subCategories: cat.subCategories.map((sub) => ({
      slug: sub.slug,
      label: resolveLabel(sub.name, sub.translations, locale),
    })),
  }));
};
