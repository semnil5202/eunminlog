import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { ProductReviewFields } from '@/features/post-editor/components/ProductReviewFields';
import { changePostFormType } from '@/features/post-editor/lib/form-type';
import { restoreDraftRating } from '@/features/post-editor/lib/rating';
import {
  POST_FORM_DEFAULTS,
  postFormSchema,
  type PostFormValues,
} from '@/features/post-editor/types/form';
import type { PostFormType } from '@/shared/types/post';

export function RatingHarness() {
  const form = useForm<PostFormValues>({
    resolver: zodResolver(postFormSchema),
    defaultValues: {
      ...POST_FORM_DEFAULTS,
      formType: 'product-review',
      title: '제품 리뷰',
      content: '<p>리뷰</p>',
      category: 'reviews',
      subCategory: 'food',
      thumbnail: 'https://example.com/product.webp',
      slug: 'product',
      description: '요약',
      products: [{ name: '음료', source: '', link: '', pricePrefix: '', price: '' }],
    },
  });
  const values = form.watch();
  const [draft, setDraft] = useState<PostFormValues | null>(null);
  const [saved, setSaved] = useState<PostFormValues | null>(null);

  return (
    <main style={{ maxWidth: 760, margin: '24px auto', padding: 16 }}>
      <h1>제품 평점 테스트</h1>
      <form onSubmit={form.handleSubmit(setSaved)} noValidate>
        <label>
          폼 형식
          <select
            value={values.formType}
            onChange={(event) =>
              changePostFormType(form.setValue, event.target.value as PostFormType)
            }
          >
            <option value="product-review">제품 리뷰</option>
            <option value="visit">체험 방문</option>
            <option value="basic">일반 글</option>
          </select>
        </label>
        {values.formType === 'product-review' && (
          <ProductReviewFields control={form.control} setValue={form.setValue} />
        )}
        <button type="submit">저장 검증</button>
        <button type="button" onClick={() => setDraft(structuredClone(form.getValues()))}>
          임시저장
        </button>
        <button
          type="button"
          disabled={!draft}
          onClick={() => draft && form.reset({ ...draft, rating: restoreDraftRating(draft) })}
        >
          임시저장 복원
        </button>
        <button
          type="button"
          onClick={() => {
            const { rating: _rating, ...legacy } = form.getValues();
            form.reset({ ...legacy, rating: restoreDraftRating(legacy as PostFormValues) });
          }}
        >
          이전 초안 복원
        </button>
      </form>
      <output data-testid="rating-values">
        {JSON.stringify({ rating: values.rating, formType: values.formType })}
      </output>
      <output data-testid="rating-saved">
        {saved ? JSON.stringify({ rating: saved.rating }) : ''}
      </output>
    </main>
  );
}
