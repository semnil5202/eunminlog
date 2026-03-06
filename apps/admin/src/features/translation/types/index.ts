import type { TranslationLocale } from '@/shared/types/post';

export type FlaggedTerm = {
  original: string;
  suggestions: string[];
};

export type TranslationResult = {
  locale: TranslationLocale;
  title: string;
  content: string;
  description: string;
  place_name: string;
  address: string;
  failed?: boolean;
};

export type TranslationStatus =
  | 'idle'
  | 'extracting'
  | 'reviewing'
  | 'translating'
  | 'success'
  | 'error';
