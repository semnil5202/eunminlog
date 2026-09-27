import { act, createElement, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
import { ManualTranslationSheet } from '@/features/translation/components/ManualTranslationSheet';
import { parseTranslationResult } from '@/features/translation/lib/prompt-parser';

vi.mock('@/components/ui/sheet', () => {
  const Wrapper = ({ children }: { children: ReactNode }) => children;
  return {
    Sheet: Wrapper,
    SheetContent: Wrapper,
    SheetHeader: Wrapper,
    SheetTitle: Wrapper,
    SheetDescription: Wrapper,
  };
});
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

afterEach(() => vi.unstubAllGlobals());

it('불완전한 결과는 적용 콜백을 호출하지 않고 기존 번역을 유지한다', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal('React', { createElement });
  const raw = ['en', 'ja', 'zh-CN', 'zh-TW', 'id', 'vi', 'th']
    .map(
      (locale) =>
        `---LOCALE:${locale}---\n---TITLE---\nSaved title\n---DESCRIPTION---\nSummary\n---CONTENT---\n<p>Translated</p>`,
    )
    .join('\n');
  const onResultsChange = vi.fn();
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  try {
    await act(async () =>
      root.render(
        createElement(ManualTranslationSheet, {
          open: true,
          onOpenChange: vi.fn(),
          formType: 'visit',
          title: '제목',
          description: '요약',
          content: '<p>본문</p>',
          savedResults: parseTranslationResult(raw),
          savedRawText: raw.slice(0, raw.indexOf('---LOCALE:th---')),
          onResultsChange,
        }),
      ),
    );
    const apply = [...host.querySelectorAll('button')].find(
      (button) => button.textContent === '적용하기',
    )!;
    await act(async () => apply.click());
    expect(onResultsChange).not.toHaveBeenCalled();
    expect(host.querySelector('[role="alert"]')?.textContent).toContain('th');
    expect(host.textContent).toContain('Saved title');
    expect(host.querySelector('textarea')?.getAttribute('aria-invalid')).toBe('true');
  } finally {
    await act(async () => root.unmount());
    host.remove();
  }
});
