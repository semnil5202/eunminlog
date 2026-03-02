import type { CategorySlug, AllSubCategorySlug } from './category';
import type { Locale } from './common';

export type Post = {
  id: string;
  slug: string;
  title: string;
  description: string;
  content: string;
  category: CategorySlug;
  sub_category: AllSubCategorySlug;
  thumbnail: string;
  is_sponsored: boolean;
  is_recommended: boolean;
  is_multilingual: boolean;
  rating: number;
  place_name: string;
  address: string;
  price_level: string;
  created_at: string;
  updated_at: string;
};

export type PostTranslation = {
  id: string;
  post_id: string;
  locale: Locale;
  title: string;
  description: string;
  content: string;
  created_at: string;
  updated_at: string;
};

export type LocalizedPost = {
  title: string;
  description: string;
  content: string;
  locale: Locale;
} & Omit<Post, 'title' | 'description' | 'content'>;
