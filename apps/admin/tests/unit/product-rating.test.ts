import { beforeEach, describe, expect, it, vi } from 'vitest';

const { requireAdmin, from } = vi.hoisted(() => ({ requireAdmin: vi.fn(), from: vi.fn() }));
vi.mock('@/shared/lib/admin-auth', () => ({ requireAdmin }));
vi.mock('@/shared/lib/supabase-server', () => ({ supabaseServer: { from } }));
vi.mock('@/features/build-trigger/api/trigger-build', () => ({ dispatchClientBuild: vi.fn() }));

import { createPost, updatePost } from '@/features/post-management/api/actions';
import { postSpecificFields } from '@/features/post-management/lib/post-fields';
import { restoreDraftRating, validatePostRating } from '@/features/post-editor/lib/rating';
import { changePostFormType } from '@/features/post-editor/lib/form-type';
import {
  POST_FORM_DEFAULTS,
  postFormSchema,
  type PostFormValues,
} from '@/features/post-editor/types/form';
import type { UseFormSetValue } from 'react-hook-form';

const values: PostFormValues = {
  ...POST_FORM_DEFAULTS,
  formType: 'product-review',
  title: '제품 리뷰',
  content: '<p>리뷰</p>',
  category: 'reviews',
  subCategory: 'food',
  thumbnail: 'https://example.com/product.webp',
  slug: 'product',
  description: '요약',
  products: [{ name: ' 제품 ', source: '', link: '', pricePrefix: '', price: '' }],
};

beforeEach(() => {
  requireAdmin.mockResolvedValue({ id: 'admin' });
  from.mockReset();
});

describe('선택 제품 평점', () => {
  it.each([null, 1, 3.8, 5])('%s 입력을 저장하고 명시적 삭제를 null로 전달한다', (rating) => {
    expect(postFormSchema.safeParse({ ...values, rating }).success).toBe(true);
    expect(postSpecificFields({ ...values, rating }).rating).toBe(rating);
  });

  it.each([0, 5.1, 3.81, NaN, Infinity, '3.8'])('잘못된 평점 %s를 거부한다', (rating) => {
    const invalid = { ...values, rating } as PostFormValues;
    expect(postFormSchema.safeParse(invalid).success).toBe(false);
    expect(() => validatePostRating(invalid)).toThrow('평점');
  });

  it('공백 제품은 제외하고 유효 제품이 정확히 하나일 때 허용한다', () => {
    expect(
      validatePostRating({
        ...values,
        rating: 3.8,
        products: [...values.products, { ...values.products[0]!, name: ' ' }],
      }),
    ).toBe(3.8);
  });

  it.each(['basic', 'visit', 'empty', 'multiple'])('%s 상태에서 평점을 거부한다', (state) => {
    const invalid = {
      ...values,
      rating: 3.8,
      ...(state === 'basic' || state === 'visit' ? { formType: state } : {}),
      ...(state === 'empty' ? { products: [] } : {}),
      ...(state === 'multiple' ? { products: [...values.products, ...values.products] } : {}),
    } as PostFormValues;
    expect(postFormSchema.safeParse(invalid).success).toBe(false);
    expect(() => validatePostRating(invalid)).toThrow('단일 제품');
  });

  it('폼 전환 시 평점을 초기화한다', () => {
    const setValue = vi.fn() as unknown as UseFormSetValue<PostFormValues>;
    changePostFormType(setValue, 'basic');
    expect(setValue).toHaveBeenCalledWith('rating', null);
  });

  it('이전 초안의 누락 값은 null로 복원하고 유효한 값은 유지한다', () => {
    const { rating: _rating, ...legacy } = values;
    expect(restoreDraftRating(legacy as PostFormValues)).toBeNull();
    expect(restoreDraftRating({ ...values, rating: 3.8 })).toBe(3.8);
    expect(restoreDraftRating({ ...values, rating: 3.8, products: [] })).toBeNull();
    expect(postSpecificFields(legacy as PostFormValues)).not.toHaveProperty('rating');
  });

  it('평점 키가 누락된 부적격 요청도 기존 점수를 초기화한다', () => {
    const { rating: _rating, ...legacy } = values;
    expect(
      postSpecificFields({ ...legacy, formType: 'basic' } as PostFormValues).rating,
    ).toBeNull();
    expect(postSpecificFields({ ...legacy, products: [] } as PostFormValues).rating).toBeNull();
    expect(
      postSpecificFields({
        ...legacy,
        products: [...values.products, ...values.products],
      } as PostFormValues).rating,
    ).toBeNull();
  });

  it.each([createPost, updatePost])('서버 직접 요청을 DB 호출 전에 거부한다', async (action) => {
    await expect(
      action({
        id: 'post',
        formValues: { ...values, rating: 3.8, products: [] },
        translations: [],
      }),
    ).rejects.toThrow('단일 제품');
    expect(requireAdmin).toHaveBeenCalled();
    expect(from).not.toHaveBeenCalled();
  });
});
