import { LoaderIcon, Sparkles } from 'lucide-react';

import { Separator } from '@/components/ui/separator';

import type { FlaggedTerm } from '../types';
import { TermReviewItem } from './TermReviewItem';

type TermReviewListProps = {
  terms: FlaggedTerm[];
  confirmedTerms: Map<number, string>;
  onConfirmTerm: (index: number, value: string) => void;
  onTranslateRequest: () => void;
  isTranslating: boolean;
};

export function TermReviewList({
  terms,
  confirmedTerms,
  onConfirmTerm,
  onTranslateRequest,
  isTranslating,
}: TermReviewListProps) {
  const allConfirmed = terms.every((_, i) => {
    const value = confirmedTerms.get(i);
    return value !== undefined && value.trim() !== '';
  });

  return (
    <div className="flex flex-col gap-4">
      {terms.map((term, index) => (
        <div key={term.original}>
          <TermReviewItem
            term={term}
            confirmedValue={confirmedTerms.get(index) ?? ''}
            onChange={(value) => onConfirmTerm(index, value)}
          />
          {index < terms.length - 1 && <Separator className="mt-4" />}
        </div>
      ))}
      <button
        type="button"
        onClick={onTranslateRequest}
        disabled={!allConfirmed || isTranslating}
        className="mt-2 inline-flex h-10 w-full items-center justify-center gap-1.5 bg-primary-600 text-sm font-bold text-white shadow-xs transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isTranslating ? (
          <LoaderIcon className="size-4 animate-spin" />
        ) : (
          <Sparkles className="size-4" />
        )}
        {isTranslating ? '번역 중...' : 'AI 번역 요청'}
      </button>
    </div>
  );
}
