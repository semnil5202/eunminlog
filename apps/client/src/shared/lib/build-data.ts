import type { AsyncLocalStorage } from 'node:async_hooks';
import { supabase } from './supabase';
import { fetchAllRows } from './fetch-all-rows';
import { getRequestSnapshot, type RequestSnapshot } from './request-snapshot';
import {
  createBuildData,
  type BuildData,
  type CategoryRow,
  type CategoryTranslationRow,
} from './build-data-index';
import type { Post, PostTranslation } from '../types/post';

export type { BuildData, CategoryRow, CategoryTranslationRow } from './build-data-index';

const POST_COLUMNS =
  'id, slug, title, description, content, category, sub_category, thumbnail, thumbnail_alt, is_sponsored, is_coupang_partners, is_recommended, is_multilingual, rating, place_name, address, price_prefix, price, product_name, purchase_source, purchase_link, image_alts, created_at, updated_at';

const collectBuildData = async (): Promise<BuildData> => {
  const [posts, translations, categories, categoryTranslations] = await Promise.all([
    fetchAllRows<Post>(
      (from, to) =>
        supabase
          .from('posts')
          .select(POST_COLUMNS, { count: 'exact' })
          .order('created_at', { ascending: false })
          .order('id')
          .range(from, to),
      (row) => row.id,
      'collectPosts',
    ),
    fetchAllRows<PostTranslation>(
      (from, to) =>
        supabase
          .from('post_translations')
          .select('*', { count: 'exact' })
          .order('post_id')
          .order('locale')
          .range(from, to),
      (row) => JSON.stringify([row.post_id, row.locale]),
      'collectPostTranslations',
    ),
    fetchAllRows<CategoryRow>(
      (from, to) =>
        supabase
          .from('categories')
          .select('id, slug, name, parent_id, sort_order, is_multilingual', { count: 'exact' })
          .order('sort_order')
          .order('id')
          .range(from, to),
      (row) => row.id,
      'collectCategories',
    ),
    fetchAllRows<CategoryTranslationRow>(
      (from, to) =>
        supabase
          .from('category_translations')
          .select('category_id, locale, name', { count: 'exact' })
          .order('category_id')
          .order('locale')
          .range(from, to),
      (row) => JSON.stringify([row.category_id, row.locale]),
      'collectCategoryTranslations',
    ),
  ]);
  return createBuildData({ posts, translations, categories, categoryTranslations });
};

const snapshotKey = Symbol.for('eunminlog.client.build-data.v1');
const snapshots = globalThis as unknown as Record<symbol, Promise<BuildData> | undefined>;
const devStorageKey = Symbol.for('eunminlog.client.dev-build-data');
const devStorage = globalThis as unknown as Record<
  symbol,
  AsyncLocalStorage<RequestSnapshot<BuildData>> | undefined
>;

/** 현재 빌드 프로세스의 전체 데이터 수집 Promise를 공유한다. */
export const getBuildData = (): Promise<BuildData> => {
  if (import.meta.env.DEV) return getRequestSnapshot(devStorage[devStorageKey], collectBuildData);
  snapshots[snapshotKey] ??= collectBuildData();
  return snapshots[snapshotKey];
};
