---
name: add-locale
description: '새 언어(locale)를 프로젝트에 추가한다. 타입, UI 문자열, Astro 설정, 카테고리 번역을 한 번에 업데이트한다.'
user_invocable: true
---

# /add-locale 스킬

새 언어를 프로젝트 전체에 추가합니다. 수정 대상 파일을 빠짐없이 업데이트합니다.

## 사용법

```
/add-locale <locale-code> <label>
```

- `locale-code`: BCP 47 코드 (예: `fr`, `de`, `pt-BR`)
- `label`: 해당 언어의 네이티브 이름 (예: `Français`, `Deutsch`, `Português`)

## 수정 대상 파일 (순서대로)

### 1. `apps/client/src/types/common.ts`

- `LOCALES` 배열에 새 locale 코드 추가
- `LOCALE_LABELS` 객체에 `'<code>': '<label>'` 추가

### 2. `apps/client/src/lib/i18n/translations.ts`

- `UI_STRINGS` 객체에 새 locale 키 추가
- 모든 UI 문자열을 해당 언어로 번역하여 채움
- 키 목록: `nav.home`, `nav.search`, `nav.language`, `pagination.prev`, `pagination.next`, `post.sponsored`, `post.editorsPick`, `post.rating`, `footer.copyright`, `footer.privacy`, `footer.sitemap`, `sidebar.sponsored`, `sidebar.editorsPick`

### 3. `apps/client/src/lib/i18n/categories.ts`

- `CATEGORY_LABELS` 객체에 새 locale 키 추가
- 카테고리/서브카테고리 이름을 해당 언어로 번역

### 4. `apps/client/astro.config.mjs`

- `i18n.locales` 배열에 새 locale 코드 추가

## 실행 절차

1. **인자 확인**: locale 코드와 label이 제공되었는지 확인한다.
2. **중복 확인**: `LOCALES` 배열에 이미 해당 코드가 있으면 중단한다.
3. **4개 파일 순차 수정**: 위 순서대로 각 파일을 Read → Edit한다.
4. **빌드 검증**: `pnpm --filter @eunminlog/client build`를 실행하여 새 locale 페이지가 정상 생성되는지 확인한다.
5. **결과 보고**: 추가된 locale 코드, 생성된 페이지 수를 출력한다.

## 주의사항

- `DEFAULT_LOCALE`은 변경하지 않는다 (항상 `ko`).
- 다국어 페이지 라우팅 (`[locale]/` 경로)은 Astro가 자동 처리하므로 페이지 파일 수정은 불필요하다.
- Mock 번역 데이터(`lib/mock/translations.ts`)는 이 스킬의 범위 밖이다. 포스트 콘텐츠 번역은 별도로 추가해야 한다.
