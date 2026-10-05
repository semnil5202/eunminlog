import { describe, expect, it, vi } from 'vitest';
import type { UseFormSetValue } from 'react-hook-form';

import { changePostFormType } from '@/features/post-editor/lib/form-type';
import { POST_FORM_DEFAULTS, type PostFormValues } from '@/features/post-editor/types/form';
import {
  postSpecificFields,
  translationSpecificFields,
} from '@/features/post-management/lib/post-fields';
import type { TranslationResult } from '@/features/translation/types';

const populatedValues: PostFormValues = {
  ...POST_FORM_DEFAULTS,
  formType: 'product-review',
  isCoupangPartners: true,
  placeName: '이전 장소',
  address: '이전 주소',
  pricePrefix: '이전 가격 설명',
  price: '10000',
  products: [
    {
      name: '이전 제품',
      source: '이전 구매처',
      link: 'https://example.com',
      pricePrefix: '이전 제품 가격',
      price: '20000',
    },
  ],
};

describe('기본 폼 전환 정합성', () => {
  it.each(['basic', 'visit', 'product-review'] as const)(
    '%s 폼으로 전환 시 이전 폼의 입력을 지우고 변경 상태로 표시한다',
    (formType) => {
      const values = structuredClone(populatedValues);
      const setValue = vi.fn((field: keyof PostFormValues, value: unknown) => {
        Object.assign(values, { [field]: value });
      }) as unknown as UseFormSetValue<PostFormValues>;

      changePostFormType(setValue, formType);

      expect(values).toMatchObject({
        formType,
        isCoupangPartners: false,
        placeName: '',
        address: '',
        pricePrefix: '',
        price: '',
        products: [{ name: '', source: '', link: '', pricePrefix: '', price: '' }],
      });
      expect(setValue).toHaveBeenCalledWith('formType', formType, { shouldDirty: true });
    },
  );

  it('초안에 이전 값이 남아도 기본 폼의 게시글·번역 저장값에서 제외한다', () => {
    const values = { ...populatedValues, formType: 'basic' as const };
    const translation: TranslationResult = {
      locale: 'en',
      title: 'Title',
      description: 'Description',
      content: '<p>Content</p>',
      place_name: 'Old place',
      address: 'Old address',
      product_name: ['Old product'],
      purchase_source: ['Old store'],
      price_prefix: ['Old price'],
      image_alts: [],
      thumbnail_alt: '',
    };

    expect(postSpecificFields(values)).toEqual({
      place_name: null,
      address: null,
      price_prefix: null,
      price: null,
      product_name: null,
      purchase_source: null,
      purchase_link: null,
      is_coupang_partners: false,
    });
    expect(translationSpecificFields('basic', translation)).toEqual({
      place_name: null,
      address: null,
      product_name: null,
      purchase_source: null,
      price_prefix: null,
    });
  });
});
