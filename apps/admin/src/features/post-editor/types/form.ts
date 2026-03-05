import { z } from 'zod';

export const TITLE_MAX_LENGTH = 40;

export const postFormSchema = z
  .object({
    formType: z.enum(['visit', 'product-review']),
    title: z.string().min(1).max(TITLE_MAX_LENGTH),
    content: z.string().min(1),
    category: z.string().min(1),
    subCategory: z.string().min(1),
    thumbnail: z.string().min(1),
    description: z.string().min(1),
    placeName: z.string(),
    address: z.string(),
    pricePrefix: z.string(),
    price: z.string(),
  })
  .superRefine((data, ctx) => {
    if (data.formType === 'visit') {
      if (!data.placeName.trim())
        ctx.addIssue({ code: 'custom', path: ['placeName'], message: '필수' });
      if (!data.address.trim())
        ctx.addIssue({ code: 'custom', path: ['address'], message: '필수' });
      if (!data.price.trim()) ctx.addIssue({ code: 'custom', path: ['price'], message: '필수' });
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
  description: '',
  placeName: '',
  address: '',
  pricePrefix: '',
  price: '',
};
