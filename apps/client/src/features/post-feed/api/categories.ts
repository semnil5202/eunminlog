/** 빌드 타임 카테고리 트리 조회 API. */

import { getBuildData } from '@/shared/lib/build-data';
import type { CategoryTreeNode } from '@/shared/lib/build-data-index';

export type { CategoryTreeNode } from '@/shared/lib/build-data-index';

export const fetchCategoryTree = async (): Promise<CategoryTreeNode[]> =>
  (await getBuildData()).categoryTree;

export const fetchCategorySlugs = async (): Promise<string[]> => {
  const tree = await fetchCategoryTree();
  return tree.map((c) => c.slug);
};

export const fetchSubCategoryMap = async (): Promise<Record<string, string[]>> => {
  const tree = await fetchCategoryTree();
  const result: Record<string, string[]> = {};
  for (const cat of tree) {
    result[cat.slug] = cat.subCategories.map((s) => s.slug);
  }
  return result;
};
