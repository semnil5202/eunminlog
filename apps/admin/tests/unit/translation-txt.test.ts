import { describe, expect, it } from 'vitest';
import {
  buildTranslationPrompt,
  getTranslationFields,
  type PromptBuildParams,
} from '@/features/translation/lib/prompt-builder';
import {
  parseTranslationResult,
  validateTranslationResult,
} from '@/features/translation/lib/prompt-parser';

const source: PromptBuildParams = {
  formType: 'visit',
  title: '제목',
  description: '요약',
  content: '<h2>제목</h2><p>본문</p><img src="https://example.com/image.webp">',
  placeName: '장소',
  thumbnailAlt: '썸네일',
  imageAlts: [{ src: 'image', alt: '사진' }],
};
const locales = ['en', 'ja', 'zh-CN', 'zh-TW', 'id', 'vi', 'th'];
function result(params = source) {
  return locales
    .map(
      (locale) =>
        `---LOCALE:${locale}---\n${Object.entries(getTranslationFields(params))
          .map(([field, count]) => {
            const value =
              field === 'CONTENT'
                ? params.content
                : count
                  ? Array.from({ length: count }, (_, i) => `${i + 1}. translated`).join('\n')
                  : 'translated';
            return `---${field}---\n${value}`;
          })
          .join('\n')}`,
    )
    .join('\n');
}

describe('번역 TXT 출력과 적용 검증', () => {
  it('직접 번역과 제한된 도구 사용 및 언어별 순차 저장을 지시한다', () => {
    const prompt = buildTranslationPrompt(source);
    expect(prompt).toContain('현재 대화의 모델인 당신이 직접 수행하세요');
    expect(prompt).toContain('외부 번역 API·사이트·라이브러리·다른 모델');
    expect(prompt).toContain('브라우저 번역 기능으로 대신하는 것도 금지');
    expect(prompt).toContain('의미 확인에만 허용');
    expect(prompt).toContain('번역용 패키지 설치나 외부 번역 서비스 접속을 시도하지 마세요');
    expect(prompt).toContain('en → ja → zh-CN → zh-TW → id → vi → th');
    expect(prompt).toContain('작업용 TXT에 순차 저장');
    expect(prompt).toContain('미완성 작업용 파일은 최종 결과로 제공하지 마세요');
  });
  it('UTF-8 파일 전문과 파일 미지원 안내를 지시하고 인라인 반환 지시를 제거한다', () => {
    const prompt = buildTranslationPrompt(source);
    expect(prompt).toContain('UTF-8');
    expect(prompt).toContain('translations.txt');
    expect(prompt).toContain('인라인으로 반환하지 마세요');
    expect(prompt).toContain('파일 생성이나 첨부를 지원하지 않거나');
    expect(prompt).not.toContain('plain text로 즉시 반환하세요');
  });
  it('BOM과 CRLF, 이스케이프 구분자를 정규화한다', () => {
    const raw = '\uFEFF' + result().replaceAll('---', '\\---').replaceAll('\n', '\r\n');
    const parsed = validateTranslationResult(raw, source);
    expect(parsed.errors).toEqual([]);
    expect(parsed.results).toHaveLength(7);
    expect(parsed.results[0]?.content).toBe(source.content);
    expect(parseTranslationResult(raw)[0]?.title).toBe('translated');
  });
  it('선택적인 빈 원문 필드를 요구하지 않는다', () => {
    const params: PromptBuildParams = {
      formType: 'product-review',
      title: '제목',
      content: '<p>본문</p>',
      description: '요약',
      productNames: ['', '제품'],
      purchaseSources: [''],
      imageAlts: [{ src: 'x', alt: '' }],
    };
    const prompt = buildTranslationPrompt(params);
    expect(prompt).not.toContain('---PURCHASE_SOURCES---');
    expect(prompt).not.toContain('---IMAGE_ALTS---');
    expect(validateTranslationResult(result(params), params).errors).toEqual([]);
  });
  it('기본 폼에서는 남아 있는 장소·제품 값을 번역 대상으로 사용하지 않는다', () => {
    const params: PromptBuildParams = {
      ...source,
      formType: 'basic',
      placeName: '이전 장소',
      address: '이전 주소',
      productNames: ['이전 제품'],
    };
    const prompt = buildTranslationPrompt(params);
    expect(prompt).not.toContain('---PLACE_NAME---');
    expect(prompt).not.toContain('---ADDRESS---');
    expect(prompt).not.toContain('---PRODUCT_NAMES---');
    expect(validateTranslationResult(result(params), params).errors).toEqual([]);
  });
  it.each([
    ['언어 누락', (raw: string) => raw.slice(0, raw.indexOf('---LOCALE:th---'))],
    ['언어 중복', (raw: string) => raw + '\n' + raw],
    ['필드 누락', (raw: string) => raw.replace('---TITLE---\ntranslated\n', '')],
    [
      '필드 중복',
      (raw: string) => raw.replace('---TITLE---', '---TITLE---\ntranslated\n---TITLE---'),
    ],
    ['빈 필드', (raw: string) => raw.replace('---TITLE---\ntranslated', '---TITLE---\n')],
    ['잘린 HTML', (raw: string) => raw.slice(0, -8)],
    [
      '태그 속성 변조',
      (raw: string) => raw.replace('src="https://example.com/image.webp"', 'onerror="alert(1)"'),
    ],
    ['잘못된 번호', (raw: string) => raw.replace('1. translated', '2. translated')],
    ['목록 항목 추가', (raw: string) => raw.replace('1. translated', '1. translated\n2. other')],
    [
      '없는 필드',
      (raw: string) => raw.replace('---TITLE---', '---UNKNOWN---\nunexpected\n---TITLE---'),
    ],
    ['없는 언어', (raw: string) => raw + '\n---LOCALE:fr---\n---TITLE---\nFrench'],
  ])('%s 시 전체 적용을 차단한다', (_name, mutate) => {
    const validated = validateTranslationResult(mutate(result()), source);
    expect(validated.errors.length).toBeGreaterThan(0);
    expect(validated.results).toEqual([]);
  });
  it('HTML 속성과 텍스트 내용의 의미적 번역 완결성은 구별한다', () => {
    const raw = result().replaceAll('본문', 'Translated content');
    expect(validateTranslationResult(raw, source).errors).toEqual([]);
  });
});
