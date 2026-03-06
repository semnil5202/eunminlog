import type { PostFormType } from '@/shared/types/post';

export const FORM_TYPE_OPTIONS: { value: PostFormType; label: string }[] = [
  { value: 'visit', label: '체험 방문' },
  { value: 'product-review', label: '제품 리뷰' },
];
