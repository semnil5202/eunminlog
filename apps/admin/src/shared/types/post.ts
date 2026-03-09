export type Category = 'delicious' | 'cafe' | 'travel';

export type SubCategory =
  | 'korean'
  | 'western'
  | 'japanese'
  | 'pub'
  | 'hotplace'
  | 'study'
  | 'domestic'
  | 'overseas'
  | 'accommodation';

export type PostFormType = 'visit' | 'product-review';

export type TranslationLocale = 'en' | 'ja' | 'zh-CN' | 'zh-TW' | 'id' | 'vi' | 'th';

export type Post = {
  id: string;
  slug: string;
  title: string;
  description: string;
  content: string;
  category: Category;
  sub_category: SubCategory;
  thumbnail: string;
  is_sponsored: boolean;
  is_recommended: boolean;
  is_multilingual: boolean;
  rating: number | null;
  place_name: string | null;
  address: string | null;
  price_prefix: string | null;
  price: number | null;
  product_name: string[] | null;
  purchase_source: string[] | null;
  purchase_link: string[] | null;
  created_at: string;
  updated_at: string;
};

export type PostTranslation = {
  id: string;
  post_id: string;
  locale: TranslationLocale;
  title: string;
  description: string;
  content: string;
  place_name: string | null;
  address: string | null;
  created_at: string;
  updated_at: string;
};
