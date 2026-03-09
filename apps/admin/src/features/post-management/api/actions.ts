'use server';

import { supabaseServer } from '@/shared/lib/supabase-server';
import type { PostFormValues } from '@/features/post-editor/types/form';
import type { ImageAlt, TranslationResult } from '@/features/translation/types';
import { triggerClientBuild } from '@/features/build-trigger/api/actions';

export type PostListItem = {
  id: string;
  title: string;
  slug: string;
  category: string;
  sub_category: string;
  created_at: string;
  updated_at: string;
};

export async function fetchPosts(params: {
  page: number;
  pageSize: number;
  sortBy: 'publishedAt' | 'updatedAt';
  from?: string;
  to?: string;
  search?: string;
}): Promise<{ posts: PostListItem[]; totalCount: number }> {
  const orderColumn = params.sortBy === 'updatedAt' ? 'updated_at' : 'created_at';

  let query = supabaseServer
    .from('posts')
    .select('id, title, slug, category, sub_category, created_at, updated_at', { count: 'exact' });

  if (params.from) query = query.gte(orderColumn, params.from);
  if (params.to) query = query.lte(orderColumn, params.to + 'T23:59:59.999Z');
  if (params.search) query = query.ilike('title', `%${params.search}%`);

  query = query
    .order(orderColumn, { ascending: false })
    .range((params.page - 1) * params.pageSize, params.page * params.pageSize - 1);

  const { data, count, error } = await query;

  if (error) throw new Error(`게시글 조회 실패: ${error.message}`);

  return {
    posts: (data ?? []) as PostListItem[],
    totalCount: count ?? 0,
  };
}

export async function fetchPost(id: string) {
  const { data: post, error: postError } = await supabaseServer
    .from('posts')
    .select('*')
    .eq('id', id)
    .single();

  if (postError) throw new Error(`게시글 조회 실패: ${postError.message}`);

  const { data: translations, error: transError } = await supabaseServer
    .from('post_translations')
    .select('*')
    .eq('post_id', id);

  if (transError) throw new Error(`번역 조회 실패: ${transError.message}`);

  return {
    post: post as {
      id: string;
      slug: string;
      title: string;
      description: string;
      content: string;
      category: string;
      sub_category: string;
      thumbnail: string;
      is_sponsored: boolean;
      is_recommended: boolean;
      is_multilingual: boolean;
      rating: number | null;
      place_name: string | null;
      address: string | null;
      price_prefix: string | null;
      price: number | null;
      product_name: string | null;
      purchase_source: string | null;
      purchase_link: string | null;
      thumbnail_alt: string | null;
      prev_slug: string | null;
      created_at: string;
      updated_at: string;
    },
    translations: (translations ?? []).map((t) => ({
      locale: t.locale,
      title: t.title,
      description: t.description,
      content: t.content,
      place_name: t.place_name ?? '',
      address: t.address ?? '',
      product_name: t.product_name ?? '',
      purchase_source: t.purchase_source ?? '',
      price_prefix: t.price_prefix ?? '',
      image_alts: (t.image_alts ?? []) as ImageAlt[],
      thumbnail_alt: t.thumbnail_alt ?? '',
    })) as TranslationResult[],
    imageAlts: (post.image_alts ?? []) as ImageAlt[],
  };
}

export async function createPost(params: {
  formValues: PostFormValues;
  translations: TranslationResult[];
  imageAlts?: ImageAlt[];
  draftId?: string | null;
}): Promise<{ id: string }> {
  const fv = params.formValues;

  const { data: post, error } = await supabaseServer
    .from('posts')
    .insert({
      slug: fv.slug,
      title: fv.title,
      description: fv.description,
      content: fv.content,
      category: fv.category,
      sub_category: fv.subCategory,
      thumbnail: fv.thumbnail,
      thumbnail_alt: fv.thumbnailAlt || null,
      is_multilingual: params.translations.length > 0,
      place_name: fv.placeName || null,
      address: fv.address || null,
      price_prefix: fv.pricePrefix || null,
      price: fv.price ? parseInt(fv.price) : null,
      product_name: fv.productName || null,
      purchase_source: fv.purchaseSource || null,
      purchase_link: fv.purchaseLink || null,
      image_alts: params.imageAlts ?? [],
    })
    .select('id')
    .single();

  if (error) {
    if (error.code === '23505') throw new Error('이미 사용 중인 슬러그입니다.');
    throw new Error(`게시글 생성 실패: ${error.message}`);
  }

  const successfulTranslations = params.translations.filter((t) => !t.failed);
  if (successfulTranslations.length > 0) {
    const translationRows = successfulTranslations.map((t) => ({
      post_id: post!.id,
      locale: t.locale,
      title: t.title,
      description: t.description,
      content: t.content,
      place_name: t.place_name || null,
      address: t.address || null,
      product_name: t.product_name || null,
      purchase_source: t.purchase_source || null,
      price_prefix: t.price_prefix || null,
      image_alts: t.image_alts ?? [],
      thumbnail_alt: t.thumbnail_alt || null,
    }));

    const { error: transError } = await supabaseServer
      .from('post_translations')
      .insert(translationRows);

    if (transError) throw new Error(`번역 저장 실패: ${transError.message}`);
  }

  if (params.draftId) {
    await supabaseServer.from('post_drafts').delete().eq('id', params.draftId);
  }

  try {
    await triggerClientBuild();
  } catch {
    // silent: 빌드 트리거 실패는 저장 결과에 영향을 주지 않음
  }

  return { id: post!.id as string };
}

export async function updatePost(params: {
  id: string;
  formValues: PostFormValues;
  translations: TranslationResult[];
  imageAlts?: ImageAlt[];
}): Promise<void> {
  const fv = params.formValues;

  const { data: existing, error: fetchError } = await supabaseServer
    .from('posts')
    .select('slug, category, sub_category')
    .eq('id', params.id)
    .single();

  if (fetchError) throw new Error(`게시글 조회 실패: ${fetchError.message}`);

  const updateData: Record<string, unknown> = {
    slug: fv.slug,
    title: fv.title,
    description: fv.description,
    content: fv.content,
    category: fv.category,
    sub_category: fv.subCategory,
    thumbnail: fv.thumbnail,
    thumbnail_alt: fv.thumbnailAlt || null,
    place_name: fv.placeName || null,
    address: fv.address || null,
    price_prefix: fv.pricePrefix || null,
    price: fv.price ? parseInt(fv.price) : null,
    product_name: fv.productName || null,
    purchase_source: fv.purchaseSource || null,
    purchase_link: fv.purchaseLink || null,
    image_alts: params.imageAlts ?? [],
    updated_at: new Date().toISOString(),
  };

  if (existing.slug !== fv.slug) {
    updateData.prev_slug = existing.slug;
  }
  if (existing.category !== fv.category) {
    updateData.prev_category = existing.category;
  }
  if (existing.sub_category !== fv.subCategory) {
    updateData.prev_sub_category = existing.sub_category;
  }

  const { error: updateError } = await supabaseServer
    .from('posts')
    .update(updateData)
    .eq('id', params.id);

  if (updateError) {
    if (updateError.code === '23505') throw new Error('이미 사용 중인 슬러그입니다.');
    throw new Error(`게시글 수정 실패: ${updateError.message}`);
  }

  const successfulTranslations = params.translations.filter((t) => !t.failed);
  for (const t of successfulTranslations) {
    const { error: upsertError } = await supabaseServer.from('post_translations').upsert(
      {
        post_id: params.id,
        locale: t.locale,
        title: t.title,
        description: t.description,
        content: t.content,
        place_name: t.place_name || null,
        address: t.address || null,
        product_name: t.product_name || null,
        purchase_source: t.purchase_source || null,
        price_prefix: t.price_prefix || null,
        image_alts: t.image_alts ?? [],
        thumbnail_alt: t.thumbnail_alt || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'post_id,locale' },
    );

    if (upsertError) throw new Error(`번역 저장 실패 (${t.locale}): ${upsertError.message}`);
  }

  try {
    await triggerClientBuild();
  } catch {
    // silent: 빌드 트리거 실패는 저장 결과에 영향을 주지 않음
  }
}

export async function deletePosts(ids: string[]) {
  if (ids.length === 0) return { success: false, deletedCount: 0 };

  const { error, count } = await supabaseServer
    .from('posts')
    .delete({ count: 'exact' })
    .in('id', ids);

  if (error) throw new Error(`게시글 삭제 실패: ${error.message}`);

  try {
    await triggerClientBuild();
  } catch {
    // silent: 빌드 트리거 실패는 삭제 결과에 영향을 주지 않음
  }

  return { success: true, deletedCount: count ?? 0 };
}
