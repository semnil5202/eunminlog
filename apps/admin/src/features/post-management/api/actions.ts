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
  is_recommended: boolean;
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
    .select('id, title, slug, category, sub_category, is_recommended, created_at, updated_at', {
      count: 'exact',
    });

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

export async function updatePostRecommendations(
  recommendations: { id: string; isRecommended: boolean }[],
) {
  if (recommendations.length === 0) return { success: true, updatedCount: 0, buildFailed: false };

  const recommendedPostIds = recommendations
    .filter((recommendation) => recommendation.isRecommended)
    .map((recommendation) => recommendation.id);
  const unrecommendedPostIds = recommendations
    .filter((recommendation) => !recommendation.isRecommended)
    .map((recommendation) => recommendation.id);

  if (recommendedPostIds.length > 0) {
    const { error } = await supabaseServer
      .from('posts')
      .update({ is_recommended: true, updated_at: new Date().toISOString() })
      .in('id', recommendedPostIds);

    if (error) throw new Error(`추천 게시글 설정 실패: ${error.message}`);
  }

  if (unrecommendedPostIds.length > 0) {
    const { error } = await supabaseServer
      .from('posts')
      .update({ is_recommended: false, updated_at: new Date().toISOString() })
      .in('id', unrecommendedPostIds);

    if (error) throw new Error(`추천 게시글 해제 실패: ${error.message}`);
  }

  let buildFailed = false;
  try {
    await triggerClientBuild();
  } catch {
    buildFailed = true;
  }

  return { success: true, updatedCount: recommendations.length, buildFailed };
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
      is_coupang_partners: boolean;
      is_recommended: boolean;
      is_multilingual: boolean;
      rating: number | null;
      place_name: string | null;
      address: string | null;
      price_prefix: string[] | null;
      price: number[] | null;
      product_name: string[] | null;
      purchase_source: string[] | null;
      purchase_link: string[] | null;
      thumbnail_alt: string | null;
      prev_slug: string | null;
      created_at: string;
      updated_at: string;
    },
    translations: (translations ?? []).map((translation) => ({
      locale: translation.locale,
      title: translation.title,
      description: translation.description,
      content: translation.content,
      place_name: translation.place_name ?? '',
      address: translation.address ?? '',
      product_name: Array.isArray(translation.product_name)
        ? translation.product_name
        : translation.product_name
          ? [translation.product_name]
          : [],
      purchase_source: Array.isArray(translation.purchase_source)
        ? translation.purchase_source
        : translation.purchase_source
          ? [translation.purchase_source]
          : [],
      price_prefix: Array.isArray(translation.price_prefix)
        ? translation.price_prefix
        : translation.price_prefix
          ? [translation.price_prefix]
          : [],
      image_alts: (translation.image_alts ?? []) as ImageAlt[],
      thumbnail_alt: translation.thumbnail_alt ?? '',
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
  const formValues = params.formValues;

  const validProducts = formValues.products.filter((product) => product.name.trim());

  const isProductReview = formValues.formType === 'product-review';
  const productPricePrefixes = isProductReview
    ? validProducts.map((product) => product.pricePrefix)
    : null;
  const productPrices = isProductReview
    ? validProducts.map((product) => (product.price ? Number(product.price) : 0))
    : null;

  const { data: post, error } = await supabaseServer
    .from('posts')
    .insert({
      slug: formValues.slug,
      title: formValues.title,
      description: formValues.description,
      content: formValues.content,
      category: formValues.category,
      sub_category: formValues.subCategory,
      thumbnail: formValues.thumbnail,
      thumbnail_alt: formValues.thumbnailAlt || null,
      is_multilingual: params.translations.length > 0,
      place_name: formValues.placeName || null,
      address: formValues.address || null,
      price_prefix: isProductReview
        ? productPricePrefixes && productPricePrefixes.some(Boolean)
          ? productPricePrefixes
          : null
        : formValues.pricePrefix
          ? [formValues.pricePrefix]
          : null,
      price: isProductReview
        ? productPrices && productPrices.some(Boolean)
          ? productPrices
          : null
        : formValues.price
          ? [Number(formValues.price)]
          : null,
      product_name: validProducts.length > 0 ? validProducts.map((product) => product.name) : null,
      purchase_source:
        validProducts.length > 0 ? validProducts.map((product) => product.source) : null,
      purchase_link: validProducts.length > 0 ? validProducts.map((product) => product.link) : null,
      image_alts: params.imageAlts ?? [],
      is_coupang_partners: formValues.isCoupangPartners,
    })
    .select('id')
    .single();

  if (error) {
    if (error.code === '23505') throw new Error('이미 사용 중인 슬러그입니다.');
    throw new Error(`게시글 생성 실패: ${error.message}`);
  }

  const successfulTranslations = params.translations.filter((translation) => !translation.failed);
  if (successfulTranslations.length > 0) {
    const translationRows = successfulTranslations.map((translation) => ({
      post_id: post!.id,
      locale: translation.locale,
      title: translation.title,
      description: translation.description,
      content: translation.content,
      place_name: translation.place_name || null,
      address: translation.address || null,
      product_name: translation.product_name || null,
      purchase_source: translation.purchase_source || null,
      price_prefix:
        translation.price_prefix && translation.price_prefix.length > 0
          ? translation.price_prefix
          : null,
      image_alts: translation.image_alts ?? [],
      thumbnail_alt: translation.thumbnail_alt || null,
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
  const formValues = params.formValues;

  const { data: existing, error: fetchError } = await supabaseServer
    .from('posts')
    .select('slug, category, sub_category')
    .eq('id', params.id)
    .single();

  if (fetchError) throw new Error(`게시글 조회 실패: ${fetchError.message}`);

  const validProducts = formValues.products.filter((product) => product.name.trim());
  const isProductReview = formValues.formType === 'product-review';
  const productPricePrefixes = isProductReview
    ? validProducts.map((product) => product.pricePrefix)
    : null;
  const productPrices = isProductReview
    ? validProducts.map((product) => (product.price ? Number(product.price) : 0))
    : null;

  const updateData: Record<string, unknown> = {
    slug: formValues.slug,
    title: formValues.title,
    description: formValues.description,
    content: formValues.content,
    category: formValues.category,
    sub_category: formValues.subCategory,
    thumbnail: formValues.thumbnail,
    thumbnail_alt: formValues.thumbnailAlt || null,
    place_name: formValues.placeName || null,
    address: formValues.address || null,
    price_prefix: isProductReview
      ? productPricePrefixes && productPricePrefixes.some(Boolean)
        ? productPricePrefixes
        : null
      : formValues.pricePrefix
        ? [formValues.pricePrefix]
        : null,
    price: isProductReview
      ? productPrices && productPrices.some(Boolean)
        ? productPrices
        : null
      : formValues.price
        ? [Number(formValues.price)]
        : null,
    product_name: validProducts.length > 0 ? validProducts.map((product) => product.name) : null,
    purchase_source:
      validProducts.length > 0 ? validProducts.map((product) => product.source) : null,
    purchase_link: validProducts.length > 0 ? validProducts.map((product) => product.link) : null,
    image_alts: params.imageAlts ?? [],
    is_coupang_partners: formValues.isCoupangPartners,
    updated_at: new Date().toISOString(),
  };

  if (existing.slug !== formValues.slug) {
    updateData.prev_slug = existing.slug;
  }
  if (existing.category !== formValues.category) {
    updateData.prev_category = existing.category;
  }
  if (existing.sub_category !== formValues.subCategory) {
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

  const successfulTranslations = params.translations.filter((translation) => !translation.failed);
  for (const translation of successfulTranslations) {
    const { error: upsertError } = await supabaseServer.from('post_translations').upsert(
      {
        post_id: params.id,
        locale: translation.locale,
        title: translation.title,
        description: translation.description,
        content: translation.content,
        place_name: translation.place_name || null,
        address: translation.address || null,
        product_name: translation.product_name || null,
        purchase_source: translation.purchase_source || null,
        price_prefix:
          translation.price_prefix && translation.price_prefix.length > 0
            ? translation.price_prefix
            : null,
        image_alts: translation.image_alts ?? [],
        thumbnail_alt: translation.thumbnail_alt || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'post_id,locale' },
    );

    if (upsertError)
      throw new Error(`번역 저장 실패 (${translation.locale}): ${upsertError.message}`);
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

  let buildFailed = false;
  try {
    await triggerClientBuild();
  } catch {
    buildFailed = true;
  }

  return { success: true, deletedCount: count ?? 0, buildFailed };
}
