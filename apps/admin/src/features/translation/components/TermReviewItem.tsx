import { useState } from 'react';

import type { FlaggedTerm } from '../types';

const LOCALE_LABELS: Record<string, string> = {
  en: 'EN',
  ja: 'JA',
  'zh-CN': 'ZH-CN',
  'zh-TW': 'ZH-TW',
  id: 'ID',
  vi: 'VI',
  th: 'TH',
};

const LOCALE_KEYS = ['en', 'ja', 'zh-CN', 'zh-TW', 'id', 'vi', 'th'];

type TermReviewItemProps = {
  term: FlaggedTerm;
  confirmedValue: Record<string, string>;
  onChange: (value: Record<string, string>) => void;
};

/** 개별 번역 용어 검토 아이템. 로케일별 추천 카드 선택 및 직접 편집을 지원한다. */
export function TermReviewItem({ term, confirmedValue, onChange }: TermReviewItemProps) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const handleSelectSuggestion = (idx: number) => {
    setSelectedIdx(idx);
    onChange({ ...term.suggestions[idx] });
  };

  const handleLocaleChange = (locale: string, value: string) => {
    onChange({ ...confirmedValue, [locale]: value });
  };

  const isEmpty = LOCALE_KEYS.every((k) => !confirmedValue[k]?.trim());

  return (
    <div className="space-y-3">
      <div>
        <span className="text-xs text-muted-foreground">확인 필요 용어</span>
        <p className="text-sm font-semibold">{term.original}</p>
      </div>

      {term.suggestions.length > 0 && (
        <div>
          <span className="text-xs text-muted-foreground">추천 번역 선택</span>
          <div className="mt-1.5 flex flex-col gap-2">
            {term.suggestions.map((suggestion, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectSuggestion(idx)}
                className={`border px-3 py-2 text-left text-xs transition-colors ${
                  selectedIdx === idx
                    ? 'border-primary-400 bg-primary-50'
                    : 'border-input hover:bg-accent'
                }`}
              >
                <div className="flex flex-wrap gap-x-3 gap-y-1">
                  {LOCALE_KEYS.map((locale) => (
                    <span key={locale}>
                      <span className="font-semibold text-primary-600">
                        {LOCALE_LABELS[locale]}
                      </span>{' '}
                      {suggestion[locale] ?? ''}
                    </span>
                  ))}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {!isEmpty && (
        <div>
          <span className="text-xs text-muted-foreground">확정 번역 (직접 수정 가능)</span>
          <div className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-1.5">
            {LOCALE_KEYS.map((locale) => (
              <div key={locale} className="flex items-center gap-1.5">
                <span className="w-10 shrink-0 text-xs font-semibold text-primary-600">
                  {LOCALE_LABELS[locale]}
                </span>
                <input
                  type="text"
                  value={confirmedValue[locale] ?? ''}
                  onChange={(e) => handleLocaleChange(locale, e.target.value)}
                  className="h-7 min-w-0 grow border border-input bg-transparent px-2 text-xs outline-none"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {isEmpty && (
        <p className="text-xs text-muted-foreground">추천 번역을 선택하거나 위 카드를 클릭하세요.</p>
      )}
    </div>
  );
}
