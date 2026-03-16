import type { TranslationLocale } from '@/shared/types/post';

export type FlaggedTerm = {
  original: string;
  suggestions: Record<string, string>[];
};

export type ImageAlt = {
  src: string;
  alt: string;
};

export type TranslationResult = {
  locale: TranslationLocale;
  title: string;
  content: string;
  description: string;
  place_name: string;
  address: string;
  product_name: string[];
  purchase_source: string[];
  price_prefix: string[];
  image_alts: ImageAlt[];
  thumbnail_alt: string;
  failed?: boolean;
};

export type TranslationStatus =
  | 'idle'
  | 'extracting'
  | 'reviewing'
  | 'translating'
  | 'success'
  | 'error';

export type { ContentSection } from '../lib/html-sections';

export type CheckableField =
  | 'title'
  | 'description'
  | 'place_name'
  | 'address'
  | 'product_name'
  | 'purchase_source'
  | 'price_prefix'
  | 'image_alts';

export type SelectiveTranslateOptions = {
  targetFields?: CheckableField[];
  targetSectionIndices?: number[];
};
