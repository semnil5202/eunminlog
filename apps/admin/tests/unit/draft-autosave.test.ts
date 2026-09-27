import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { saveDraft } from '@/features/draft/api';
import { useAutoSaveDraft } from '@/features/draft/hooks/useAutoSaveDraft';
import { POST_FORM_DEFAULTS } from '@/features/post-editor/types/form';
import type { Draft } from '@/features/draft/types';

vi.mock('@/features/draft/api', () => ({ saveDraft: vi.fn() }));

let root: Root;
let host: HTMLElement;
let result: ReturnType<typeof useAutoSaveDraft>;
const saved = { id: 'draft-1' } as Draft;

function Harness({ alt = '', thumbnailAlt = '' }) {
  result = useAutoSaveDraft({
    getValues: () => ({ ...POST_FORM_DEFAULTS, title: '작성 중', thumbnailAlt }),
    getImageAlts: () => [{ src: '/image.webp', alt }],
  });
  return null;
}

async function render(alt = '', thumbnailAlt = '') {
  await act(async () => root.render(createElement(Harness, { alt, thumbnailAlt })));
}

async function advance(ms: number) {
  await act(async () => vi.advanceTimersByTimeAsync(ms));
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.mocked(saveDraft).mockReset().mockResolvedValue(saved);
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('임시저장 최신 alt 동기화', () => {
  it('연속 입력에도 최초 2분 주기에 최신 alt를 저장한다', async () => {
    await render('처음');
    await advance(50_000);
    await render('중간');
    await advance(50_000);
    await render('마지막');
    await advance(20_000);
    expect(saveDraft).toHaveBeenCalledTimes(1);
    expect(saveDraft).toHaveBeenLastCalledWith(
      expect.objectContaining({
        imageAlts: [{ src: '/image.webp', alt: '마지막' }],
      }),
    );
    await advance(120_000);
    expect(saveDraft).toHaveBeenCalledTimes(1);
  });

  it('수동 저장에 본문 alt와 썸네일 alt 및 불러온 draft id를 포함한다', async () => {
    await render('본문 설명', '썸네일 설명');
    await act(async () => result.loadDraftId('existing-draft'));
    await act(async () => {
      await result.saveManual();
    });
    expect(saveDraft).toHaveBeenLastCalledWith(
      expect.objectContaining({
        id: 'existing-draft',
        imageAlts: [{ src: '/image.webp', alt: '본문 설명' }],
        formData: expect.objectContaining({ thumbnailAlt: '썸네일 설명' }),
      }),
    );
  });

  it('실패한 자동 저장은 다음 주기에 재시도한다', async () => {
    vi.mocked(saveDraft).mockRejectedValueOnce(new Error('offline'));
    await render('설명');
    await advance(120_000);
    expect(result.isSaving).toBe(false);
    expect(result.lastSavedAt).toBeNull();
    await advance(120_000);
    expect(saveDraft).toHaveBeenCalledTimes(2);
    expect(result.draftId).toBe(saved.id);
  });

  it('진행 중 중복 자동 저장을 막고 응답 이후 변경 내용을 다음 주기에 저장한다', async () => {
    let finish!: (value: Draft) => void;
    vi.mocked(saveDraft).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    await render('저장 전');
    await advance(120_000);
    await render('저장 중 수정');
    await advance(120_000);
    expect(saveDraft).toHaveBeenCalledTimes(1);
    await act(async () => finish(saved));
    await advance(120_000);
    expect(saveDraft).toHaveBeenLastCalledWith(
      expect.objectContaining({
        id: saved.id,
        imageAlts: [{ src: '/image.webp', alt: '저장 중 수정' }],
      }),
    );
    expect(saveDraft).toHaveBeenCalledTimes(2);
  });

  it('수동 저장 도중 입력된 값도 저장 완료로 잘못 처리하지 않는다', async () => {
    let finish!: (value: Draft) => void;
    vi.mocked(saveDraft).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    await render('이전');
    let pending!: ReturnType<typeof result.saveManual>;
    await act(async () => {
      pending = result.saveManual();
    });
    await render('최신');
    await act(async () => {
      finish(saved);
      await pending;
    });
    await advance(120_000);
    expect(saveDraft).toHaveBeenCalledTimes(2);
    expect(saveDraft).toHaveBeenLastCalledWith(
      expect.objectContaining({
        imageAlts: [{ src: '/image.webp', alt: '최신' }],
      }),
    );
  });
});
