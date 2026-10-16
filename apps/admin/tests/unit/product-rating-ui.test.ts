import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { useForm, type UseFormReturn } from 'react-hook-form';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ProductReviewFields } from '@/features/post-editor/components/ProductReviewFields';
import { POST_FORM_DEFAULTS, type PostFormValues } from '@/features/post-editor/types/form';

let form: UseFormReturn<PostFormValues>;
let root: Root;
let host: HTMLDivElement;
const product = { name: '음료', source: '', link: '', pricePrefix: '', price: '' };

function Harness() {
  form = useForm<PostFormValues>({
    defaultValues: {
      ...POST_FORM_DEFAULTS,
      formType: 'product-review',
      products: [product],
      rating: 3.8,
    },
  });
  return createElement(ProductReviewFields, { control: form.control, setValue: form.setValue });
}

beforeEach(async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal('React', { createElement });
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  await act(async () => root.render(createElement(Harness)));
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});

describe('제품 평점 입력 UI', () => {
  it('기존 점수를 표시하고 제품 여러개 전환 시 숨기고 초기화한다', async () => {
    const input = host.querySelector<HTMLInputElement>('#product-rating')!;
    expect(input.value).toBe('3.8');
    expect(input.min).toBe('1');
    expect(input.max).toBe('5');
    expect(input.step).toBe('0.1');
    await act(async () => form.setValue('products', [product, { ...product, name: '커피' }]));
    expect(host.querySelector('#product-rating')).toBeNull();
    expect(form.getValues('rating')).toBeNull();
    await act(async () => form.setValue('products', [product]));
    expect(host.querySelector<HTMLInputElement>('#product-rating')!.value).toBe('');
  });

  it('유일한 제품명을 지우면 평점 UI와 값도 제거한다', async () => {
    await act(async () => form.setValue('products.0.name', ' '));
    expect(host.querySelector('#product-rating')).toBeNull();
    expect(form.getValues('rating')).toBeNull();
  });
});
