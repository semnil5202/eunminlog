import { z } from 'zod';

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
    formType: z.enum(['visit', 'product-review']),
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
  })
  .superRefine((data, ctx) => {
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
