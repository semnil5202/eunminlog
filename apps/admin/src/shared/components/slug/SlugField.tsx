'use client';

import { useCallback, useState } from 'react';
import { toast } from 'sonner';

import { Input } from '@/components/ui/input';
import { AiGenerateButton } from '@/shared/components/ui/AiGenerateButton';
import { fetchSlugSuggestions } from '@/features/post-editor/api/client';
import { checkSlugDuplicate } from '@/features/post-editor/api/actions';

type SlugFieldProps = {
  sourceText: string;
  value: string;
  onChange: (slug: string) => void;
  placeholder?: string;
  disabled?: boolean;
  table?: 'posts' | 'categories';
  excludeId?: string;
};

export function SlugField({
  sourceText,
  value,
  onChange,
  placeholder = 'slug 입력',
  disabled = false,
  table = 'posts',
  excludeId,
}: SlugFieldProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGenerated, setIsGenerated] = useState(false);
  const [isDuplicate, setIsDuplicate] = useState(false);

  const handleCheckDuplicate = useCallback(
    async (slug: string) => {
      if (!slug.trim()) {
        setIsDuplicate(false);
        return;
      }
      try {
        const duplicate = await checkSlugDuplicate(slug, table, excludeId);
        setIsDuplicate(duplicate);
      } catch {
        // DB 연동 전에는 무시
      }
    },
    [table, excludeId],
  );

  const handleGenerate = async () => {
    if (!sourceText.trim()) {
      toast.error('슬러그를 생성할 텍스트를 먼저 입력해주세요.');
      return;
    }

    setIsGenerating(true);
    try {
      const slugs = await fetchSlugSuggestions(sourceText);
      setSuggestions(slugs);
      setIsGenerated(true);
      if (!value) onChange(slugs[0]);
    } catch {
      toast.error('슬러그 생성에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Input
          name="slug"
          placeholder={placeholder}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setIsDuplicate(false);
          }}
          onBlur={(e) => handleCheckDuplicate(e.target.value)}
          disabled={disabled}
          className={isDuplicate ? 'border-red-500' : ''}
        />
        <AiGenerateButton
          onClick={handleGenerate}
          isLoading={isGenerating}
          isCompleted={isGenerated}
          disabled={!sourceText.trim() || disabled}
          hasExistingValue={!!value.trim()}
        />
      </div>

      {isDuplicate && (
        <p className="text-[14px] text-red-500">이미 사용 중인 슬러그입니다.</p>
      )}

      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {suggestions.map((slug) => (
            <button
              key={slug}
              type="button"
              onClick={() => {
                onChange(slug);
                handleCheckDuplicate(slug);
              }}
              className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                value === slug
                  ? 'border-primary-600 bg-primary-50 font-medium text-primary-700'
                  : 'border-input text-muted-foreground hover:border-primary-400 hover:text-foreground'
              }`}
            >
              {slug}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
