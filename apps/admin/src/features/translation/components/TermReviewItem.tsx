import type { FlaggedTerm } from '../types';

type TermReviewItemProps = {
  term: FlaggedTerm;
  confirmedValue: string;
  onChange: (value: string) => void;
};

export function TermReviewItem({ term, confirmedValue, onChange }: TermReviewItemProps) {
  return (
    <div className="space-y-2">
      <div>
        <span className="text-xs text-muted-foreground">확인 필요 용어</span>
        <p className="text-sm font-semibold">{term.original}</p>
      </div>
      <div>
        <span className="text-xs text-muted-foreground">추천 번역</span>
        <div className="mt-1 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => onChange(term.original)}
            className="border border-primary-400 bg-primary-50 px-2 py-0.5 text-xs transition-colors hover:bg-primary-100"
          >
            {term.original}
          </button>
          {term.suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => onChange(suggestion)}
              className="border border-input px-2 py-0.5 text-xs transition-colors hover:bg-accent"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
      <div>
        <span className="text-xs text-muted-foreground">확정 번역</span>
        <input
          type="text"
          value={confirmedValue}
          onChange={(e) => onChange(e.target.value)}
          placeholder="확정 번역을 영어로 입력하세요."
          className="mt-1 h-8 w-full border border-input bg-transparent px-3 text-sm shadow-xs outline-none placeholder:text-muted-foreground"
        />
      </div>
    </div>
  );
}
