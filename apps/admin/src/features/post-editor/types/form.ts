import { z } from 'zod';
import { getSingleProductName, isValidRating } from '@eunminlog/config/rating';

export const TITLE_MAX_LENGTH = 50;

const productSchema = z.object({
  name: z.string(),
  source: z.string(),
  link: z.string(),
  pricePrefix: z.string(),
  price: z.string(),
});

export const postFormSchema = z
  .object({
    formType: z.enum(['basic', 'visit', 'product-review']),
    isCoupangPartners: z.boolean(),
    title: z.string().min(1, '제목을 입력해주세요.').max(TITLE_MAX_LENGTH),
    content: z
      .string()
      .min(1, '본문을 입력해주세요.')
      .refine((val) => val.replace(/<[^>]*>/g, '').trim().length > 0, '본문을 입력해주세요.'),
    category: z.string().min(1, '대분류를 선택해주세요.'),
    subCategory: z.string().min(1, '소분류를 선택해주세요.'),
    thumbnail: z.string().min(1, '썸네일을 등록해주세요.'),
    thumbnailAlt: z.string(),
    slug: z.string().min(1, '슬러그를 입력해주세요.'),
    description: z.string().min(1, '3줄 요약을 입력해주세요.'),
    placeName: z.string(),
    address: z.string(),
    pricePrefix: z.string(),
    price: z.string(),
    products: z.array(productSchema),
    rating: z
      .number()
      .nullable()
      .refine((value) => value === null || isValidRating(value), {
        message: '평점은 1~5 사이에서 소수 한 자리까지 입력해주세요.',
      }),
  })
  .superRefine((data, ctx) => {
    if (
      data.rating !== null &&
      (data.formType !== 'product-review' ||
        !getSingleProductName(data.products.map((product) => product.name)))
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['rating'],
        message: '평점은 단일 제품 리뷰에서만 입력할 수 있습니다.',
      });
    }
    if (data.formType === 'visit') {
      if (!data.placeName.trim())
        ctx.addIssue({ code: 'custom', path: ['placeName'], message: '장소를 입력해주세요.' });
      if (!data.address.trim())
        ctx.addIssue({ code: 'custom', path: ['address'], message: '주소를 입력해주세요.' });
    }
  });

export type PostFormValues = z.infer<typeof postFormSchema>;

export const POST_FORM_DEFAULTS: PostFormValues = {
  formType: 'visit',
  isCoupangPartners: false,
  rating: null,
  title: '',
  content: '',
  category: '',
  subCategory: '',
  thumbnail: '',
  thumbnailAlt: '',
  slug: '',
  description: '',
  placeName: '',
  address: '',
  pricePrefix: '',
  price: '',
  products: [{ name: '', source: '', link: '', pricePrefix: '', price: '' }],
};
