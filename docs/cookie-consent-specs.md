# Cookie Consent & AdSense NPA 연동 스펙

> 작성일: 2026-03-06
> 상태: 구현 완료 (배너 UI + 쿠키 저장 + GA4 이벤트). AdSense NPA 연동은 AdSense 실제 연동 시점에 추가 작업 필요.
> 관련 문서: [ui-specs.md](ui-specs.md), [ga4-tracking.md](ga4-tracking.md), [seo-strategy.md](seo-strategy.md), [theme.md](theme.md)

---

## 1. 개요

### 1.1 목적

글로벌 개인정보보호 법규(GDPR, APPI, PIPL, PDPA 등)를 준수하면서 AdSense 광고 수익을 최적화한다. 쿠키 동의 상태에 따라 개인화 광고(PA)와 비개인화 광고(NPA)를 동적으로 전환한다.

### 1.2 비즈니스 목표

| 목표             | 설명                                                           |
| ---------------- | -------------------------------------------------------------- |
| 법규 준수        | GDPR(EU), APPI(일본), PIPL(중국), PDPA(태국) 등 주요 규제 대응 |
| 광고 수익 최적화 | 동의한 사용자에게 개인화 광고를 노출하여 CPM/CTR 극대화        |
| UX 최소 침해     | Sticky Footer Banner로 콘텐츠 가독성을 최대한 보존             |
| 추적 가능성      | 수락/거부 비율을 GA4로 측정하여 배너 UX 개선에 활용            |

### 1.3 법적 근거 요약

| Locale  | 법규         | 핵심 요구사항                                                        |
| ------- | ------------ | -------------------------------------------------------------------- |
| `en`    | GDPR (EU/UK) | 쿠키 사용 전 명시적 동의(opt-in) 필수. 거부 옵션 동등하게 제공       |
| `ja`    | APPI (일본)  | 2022 개정법 기준 쿠키를 개인관련정보로 취급. 제3자 제공 시 동의 필요 |
| `zh-CN` | PIPL (중국)  | 개인정보 처리 시 고지 + 동의 필수. 쿠키 기반 추적 포함               |
| `th`    | PDPA (태국)  | 쿠키를 포함한 개인데이터 수집 시 동의 필요                           |

### 1.4 제외 Locale 및 근거

| Locale  | 제외 사유                                                              |
| ------- | ---------------------------------------------------------------------- |
| `ko`    | 한국은 쿠키 동의 배너를 적용하는 사이트가 거의 없음 (관습/관용의 영역) |
| `id`    | 인도네시아 PDP Law 시행 초기, 쿠키 동의 강제성 약함                    |
| `vi`    | 베트남 개인정보보호법 시행 초기 단계                                   |
| `zh-TW` | 대만 PDPA는 쿠키 동의 의무가 약함                                      |

---

## 2. 대상 Locale 상수 정의

### 2.1 상수

```typescript
// apps/client/src/shared/constants/consent.ts

import type { Locale } from '@/shared/types/common';

export const CONSENT_REQUIRED_LOCALES: readonly Locale[] = ['en', 'ja', 'zh-CN', 'th'] as const;

export const CONSENT_COOKIE_NAME = 'cookie_consent';

export const CONSENT_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 365일 (초 단위)
```

### 2.2 판별 유틸리티

```typescript
// apps/client/src/shared/lib/consent.ts

import type { Locale } from '@/shared/types/common';
import { CONSENT_REQUIRED_LOCALES, CONSENT_COOKIE_NAME } from '@/shared/constants/consent';

export type ConsentState = 'undecided' | 'accepted' | 'rejected';

export function isConsentRequired(locale: Locale): boolean {
  return CONSENT_REQUIRED_LOCALES.includes(locale);
}

export function getConsentState(): ConsentState {
  if (typeof document === 'undefined') return 'undecided';

  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${CONSENT_COOKIE_NAME}=`));

  if (!match) return 'undecided';

  const value = match.split('=')[1];
  if (value === 'true') return 'accepted';
  if (value === 'false') return 'rejected';
  return 'undecided';
}

export function setConsentCookie(accepted: boolean): void {
  const maxAge = accepted ? CONSENT_COOKIE_MAX_AGE : 60 * 60 * 24; // 수락: 365일, 거부: 1일
  document.cookie = `${CONSENT_COOKIE_NAME}=${accepted}; path=/; max-age=${maxAge}; SameSite=Lax; Secure`;
}
```

---

## 3. UI 스펙 (Sticky Footer Banner)

### 3.1 디자인 원칙

- **Sticky Footer Banner**: 뷰포트 하단 고정. 콘텐츠 스크롤을 방해하지 않는다.
- **2-button 구성**: '수락'과 '거부'를 동등한 시각적 비중으로 제공 (GDPR 요구사항).
- **개인정보처리방침 링크**: 기존 privacy 페이지(`/privacy/` 또는 `/{locale}/privacy/`)로 연결.
- **z-index**: Toast(z-50), ImageLightbox(z-50) 보다 낮은 `z-40`으로 설정하여 다른 오버레이를 방해하지 않는다.

### 3.2 레이아웃

```
+---------------------------------------------------------------------+
| [Cookie Icon]  We use cookies for personalized ads and analytics.   |
|                Learn more (link)                                     |
|                                          [ Reject ]  [ Accept ]     |
+---------------------------------------------------------------------+
```

### 3.3 반응형 스펙

#### Mobile (`lg` 미만)

| 속성      | 값                                                              |
| --------- | --------------------------------------------------------------- |
| 위치      | `fixed bottom-0 left-0 right-0`                                 |
| 패딩      | `p-4`                                                           |
| 배경      | `bg-gray-800` (background-inverse)                              |
| 텍스트    | `text-gray-0` (label-inverse), `text-sm`                        |
| 버튼 배치 | 텍스트 아래, `flex gap-3` 가로 배열                             |
| 버튼 크기 | 각각 `grow` (동일 너비)                                         |
| 수락 버튼 | `bg-primary-500 text-gray-0 py-2.5 text-sm font-medium`         |
| 거부 버튼 | `border border-gray-400 text-gray-0 py-2.5 text-sm font-medium` |
| 링크      | `text-primary-300 underline text-sm`                            |
| 그림자    | `shadow-[0_-2px_10px_rgba(0,0,0,0.15)]`                         |
| 최대 너비 | 없음 (전체 폭)                                                  |

#### PC (`lg` 이상)

| 속성      | 값                                        |
| --------- | ----------------------------------------- |
| 위치      | `fixed bottom-0 left-0 right-0`           |
| 내부 래퍼 | `max-w-screen-xl mx-auto px-6`            |
| 레이아웃  | `flex items-center justify-between gap-6` |
| 패딩      | `py-4`                                    |
| 텍스트    | 좌측 영역, `text-sm`                      |
| 버튼 배치 | 우측 영역, `flex gap-3 shrink-0`          |
| 버튼 크기 | `px-6 py-2.5` (고정 너비)                 |
| 나머지    | Mobile과 동일                             |

### 3.4 애니메이션

- **표시**: `translate-y-full opacity-0` -> `translate-y-0 opacity-100` (300ms ease-out)
- **숨김**: 역순 (200ms ease-in), 애니메이션 완료 후 DOM에서 `hidden` 처리
- CSS `transition`으로 구현 (JavaScript 애니메이션 불필요)

### 3.5 접근성

| 속성               | 값                                               |
| ------------------ | ------------------------------------------------ |
| `role`             | `dialog`                                         |
| `aria-modal`       | `false` (non-modal -- 콘텐츠 접근 차단하지 않음) |
| `aria-label`       | locale별 번역 (`consent.ariaLabel`)              |
| `aria-describedby` | 배너 설명 텍스트 요소 ID 참조                    |

---

## 4. 광고 로직 흐름도

### 4.1 전체 흐름

```
페이지 로드
  |
  +-- locale이 CONSENT_REQUIRED_LOCALES에 포함?
  |     |
  |     +-- NO (ko, id, vi, zh-TW)
  |     |     |
  |     |     +-- 개인화 광고(PA) 로드
  |     |     +-- 배너 미표시
  |     |     +-- [끝]
  |     |
  |     +-- YES (en, ja, zh-CN, th)
  |           |
  |           +-- cookie_consent 쿠키 확인
  |                 |
  |                 +-- 값 없음 (undecided)
  |                 |     |
  |                 |     +-- 비개인화 광고(NPA) 로드
  |                 |     +-- 배너 표시 (slide-up)
  |                 |     +-- 사용자 선택 대기
  |                 |           |
  |                 |           +-- [수락 클릭]
  |                 |           |     +-- cookie_consent=true 저장 (365일)
  |                 |           |     +-- 개인화 광고(PA)로 전환
  |                 |           |     +-- 배너 숨김 (slide-down)
  |                 |           |     +-- GA4 이벤트 전송 (cookie_consent, action: accept)
  |                 |           |
  |                 |           +-- [거부 클릭]
  |                 |                 +-- cookie_consent=false 저장 (1일)
  |                 |                 +-- NPA 유지
  |                 |                 +-- 배너 숨김 (slide-down)
  |                 |                 +-- GA4 이벤트 전송 (cookie_consent, action: reject)
  |                 |
  |                 +-- 값 = "true" (accepted)
  |                 |     |
  |                 |     +-- 개인화 광고(PA) 로드
  |                 |     +-- 배너 미표시
  |                 |
  |                 +-- 값 = "false" (rejected)
  |                       |
  |                       +-- 비개인화 광고(NPA) 로드
  |                       +-- 배너 미표시
```

### 4.2 AdSense NPA 파라미터

AdSense의 비개인화 광고 제어는 `adsbygoogle.js` 로드 전에 전역 변수를 설정하는 방식으로 동작한다.

```javascript
// NPA 모드 (비개인화 광고)
window.adsbygoogle = window.adsbygoogle || [];
window.adsbygoogle.requestNonPersonalizedAds = 1;

// PA 모드 (개인화 광고) -- 기본값이므로 설정 불필요
// window.adsbygoogle.requestNonPersonalizedAds = 0;
```

### 4.3 동의 후 PA 전환 전략

사용자가 '수락'을 클릭한 시점에 이미 NPA로 로드된 광고를 PA로 즉시 전환하기는 어렵다. AdSense 슬롯은 한 번 로드되면 동일 세션에서 재요청이 불가하기 때문이다.

**채택 전략**: 다음 페이지 이동 시 PA 적용

1. '수락' 클릭 -> `cookie_consent=true` 쿠키 저장
2. 현재 페이지의 광고는 NPA 유지 (이미 로드됨)
3. 다음 페이지 이동(또는 새로고침) 시 쿠키를 읽어 PA로 로드

이 전략은 사용자 경험에 거의 영향이 없다 -- 대부분의 사용자는 배너에 응답한 직후 콘텐츠를 계속 탐색하므로 자연스럽게 다음 페이지에서 PA가 적용된다.

---

## 5. 기술 구현 가이드

### 5.1 AdSense 로드 스크립트 (Layout.astro 변경)

현재 AdSense는 플레이스홀더 상태이며 `adsbygoogle.js`가 로드되지 않은 상태이다. 실제 AdSense 연동 시 다음 스크립트를 `Layout.astro`의 `<head>`에 추가한다.

```html
<!-- Layout.astro <head> 내부, gtag 스크립트 아래 -->
<script is:inline define:vars={{ locale, consentRequired: isConsentRequired(locale) }}>
  // 동의 필요 locale에서 동의 전/거부 상태이면 NPA 모드 설정
  if (consentRequired) {
    var match = document.cookie.split('; ').find(function(row) {
      return row.startsWith('cookie_consent=');
    });
    var consentValue = match ? match.split('=')[1] : null;

    if (consentValue !== 'true') {
      window.adsbygoogle = window.adsbygoogle || [];
      window.adsbygoogle.requestNonPersonalizedAds = 1;
    }
  }
</script>
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXXX" crossorigin="anonymous"></script>
```

**핵심 포인트**: NPA 설정은 `adsbygoogle.js` 로드 **전에** 이루어져야 한다. `is:inline` + `define:vars`로 빌드 타임에 locale 정보를 주입하고, 런타임에 쿠키를 읽어 NPA 여부를 결정한다.

### 5.2 배너 컴포넌트 구조

```
apps/client/src/
├── features/
│   └── consent/
│       └── components/
│           └── CookieConsentBanner.astro   # 배너 UI + 인라인 스크립트
└── shared/
    ├── constants/
    │   └── consent.ts                      # CONSENT_REQUIRED_LOCALES, 쿠키 설정
    └── lib/
        └── consent.ts                      # isConsentRequired(), getConsentState(), setConsentCookie()
```

**배치 원칙**:

- 배너 컴포넌트는 consent feature에 고유하므로 `features/consent/components/`에 위치한다.
- 상수와 유틸리티는 `Layout.astro`와 AdSense 로드 스크립트에서도 참조하므로 `shared/`에 위치한다.

### 5.3 CookieConsentBanner.astro

Astro 컴포넌트로 구현한다. JavaScript는 `<script>` 태그 내 인라인 스크립트로 처리한다 (React island 불필요).

**Props**:

```typescript
interface Props {
  locale: Locale;
}
```

**렌더링 조건**:

- `isConsentRequired(locale)` 가 `true` 인 locale에서만 배너 HTML을 렌더링한다.
- `false`인 locale에서는 컴포넌트가 아무것도 출력하지 않는다 (SSG 빌드 타임에 결정).

**클라이언트 스크립트 동작**:

1. DOM 로드 시 `getConsentState()` 호출
2. `undecided`이면 배너 표시 (slide-up 애니메이션)
3. `accepted` 또는 `rejected`이면 아무 동작 없음 (배너는 `hidden` 상태 유지)
4. 수락/거부 버튼 클릭 시:
   - `setConsentCookie(true/false)` 호출
   - GA4 이벤트 전송
   - 배너 숨김 애니메이션 실행

### 5.4 Layout.astro 삽입 위치

```astro
<!-- Layout.astro <body> 하단, Toast/ImageLightbox와 같은 레벨 -->
<Footer locale={locale} />
<CookieConsentBanner locale={locale} />
<Toast />
<ImageLightbox />
```

`CookieConsentBanner`는 `Footer` 바로 아래, `Toast`/`ImageLightbox` 위에 배치한다. `z-40`으로 Footer(z-auto) 위에 뜨되 Toast(z-50)에는 가리지 않는다.

### 5.5 SSG 빌드 타임 최적화

`isConsentRequired(locale)`는 빌드 타임에 평가되므로, 동의가 필요하지 않은 locale의 페이지에는 배너 HTML 자체가 포함되지 않는다. 이는 불필요한 DOM과 스크립트를 제거하여 번들 크기와 파싱 비용을 절약한다.

| Locale                    | 배너 HTML 포함 | NPA 판별 스크립트 포함 |
| ------------------------- | -------------- | ---------------------- |
| `ko`, `id`, `vi`, `zh-TW` | X              | X                      |
| `en`, `ja`, `zh-CN`, `th` | O              | O                      |

---

## 6. GA4 이벤트 스키마

### 6.1 Cookie Consent 이벤트 (`cookie_consent` -- 커스텀 이벤트)

사용자가 쿠키 동의 배너에서 수락 또는 거부를 선택한 시점에 발생한다.

| 파라미터         | 타입   | 예시                    | 설명               |
| ---------------- | ------ | ----------------------- | ------------------ |
| `action`         | string | `"accept"` / `"reject"` | 사용자 선택        |
| `content_locale` | string | `"en"`                  | 현재 페이지 locale |

### 6.2 구현

```typescript
// CookieConsentBanner.astro 내 인라인 스크립트

function handleConsent(accepted: boolean, locale: string): void {
  setConsentCookie(accepted);

  if (typeof window.gtag === 'function') {
    window.gtag('event', 'cookie_consent', {
      action: accepted ? 'accept' : 'reject',
      content_locale: locale,
    });
  }

  // 배너 숨김 애니메이션
  hideBanner();
}
```

### 6.3 GA4 커스텀 디멘션 추가 등록

기존 `docs/ga4-tracking.md` Section 4의 커스텀 디멘션 테이블에 추가:

| 디멘션 이름    | 범위  | 파라미터 키 | 설명                |
| -------------- | ----- | ----------- | ------------------- |
| Consent Action | Event | `action`    | 쿠키 동의 수락/거부 |

### 6.4 gtag.ts 타입 확장

기존 `GtagEvent` 타입에 `'cookie_consent'`를 추가해야 한다.

```typescript
// 변경 전
type GtagEvent = 'select_content' | 'search' | 'ad_impression' | 'ad_view' | 'ad_click';

// 변경 후
type GtagEvent =
  | 'select_content'
  | 'search'
  | 'ad_impression'
  | 'ad_view'
  | 'ad_click'
  | 'cookie_consent';
```

단, `CookieConsentBanner.astro`의 인라인 스크립트는 Astro `<script>` 태그 내에서 직접 `window.gtag()`를 호출하므로, `trackEvent()` 래퍼를 import하지 않아도 된다. 타입 확장은 향후 다른 곳에서 `trackEvent('cookie_consent', ...)`를 호출할 가능성에 대비한 것이다.

---

## 7. i18n 번역 키 목록

`apps/client/src/shared/lib/i18n/translations.ts`에 추가할 번역 키. 동의 필요 4개 locale에만 값이 필요하지만, 전체 8개 locale에 키를 일관되게 유지한다 (미사용 locale은 빈 문자열).

### 7.1 번역 키 정의

| 키                  | 용도                         |
| ------------------- | ---------------------------- |
| `consent.message`   | 배너 본문 메시지             |
| `consent.learnMore` | 개인정보처리방침 링크 텍스트 |
| `consent.accept`    | 수락 버튼 텍스트             |
| `consent.reject`    | 거부 버튼 텍스트             |
| `consent.ariaLabel` | 배너 `aria-label` 값         |

### 7.2 Locale별 번역

#### `consent.message`

| Locale  | 값                                                                   |
| ------- | -------------------------------------------------------------------- |
| `ko`    | `''` (미사용)                                                        |
| `en`    | `'We use cookies for personalized ads and analytics.'`               |
| `ja`    | `'パーソナライズ広告とアクセス分析のためにCookieを使用しています。'` |
| `zh-CN` | `'我们使用Cookie提供个性化广告和分析服务。'`                         |
| `zh-TW` | `''` (미사용)                                                        |
| `id`    | `''` (미사용)                                                        |
| `vi`    | `''` (미사용)                                                        |
| `th`    | `'เราใช้คุกกี้เพื่อแสดงโฆษณาที่เหมาะกับคุณและวิเคราะห์การเข้าชม'`    |

#### `consent.learnMore`

| Locale  | 값                    |
| ------- | --------------------- |
| `ko`    | `''`                  |
| `en`    | `'Learn more'`        |
| `ja`    | `'詳しく見る'`        |
| `zh-CN` | `'了解详情'`          |
| `zh-TW` | `''`                  |
| `id`    | `''`                  |
| `vi`    | `''`                  |
| `th`    | `'เรียนรู้เพิ่มเติม'` |

#### `consent.accept`

| Locale  | 값           |
| ------- | ------------ |
| `ko`    | `''`         |
| `en`    | `'Accept'`   |
| `ja`    | `'同意する'` |
| `zh-CN` | `'接受'`     |
| `zh-TW` | `''`         |
| `id`    | `''`         |
| `vi`    | `''`         |
| `th`    | `'ยอมรับ'`   |

#### `consent.reject`

| Locale  | 값           |
| ------- | ------------ |
| `ko`    | `''`         |
| `en`    | `'Reject'`   |
| `ja`    | `'拒否する'` |
| `zh-CN` | `'拒绝'`     |
| `zh-TW` | `''`         |
| `id`    | `''`         |
| `vi`    | `''`         |
| `th`    | `'ปฏิเสธ'`   |

#### `consent.ariaLabel`

| Locale  | 값                   |
| ------- | -------------------- |
| `ko`    | `''`                 |
| `en`    | `'Cookie consent'`   |
| `ja`    | `'Cookie同意'`       |
| `zh-CN` | `'Cookie同意'`       |
| `zh-TW` | `''`                 |
| `id`    | `''`                 |
| `vi`    | `''`                 |
| `th`    | `'ความยินยอมคุกกี้'` |

---

## 8. 파일 구조 및 수정 대상

### 8.1 신규 파일

| 파일                                                    | 역할                                                                        |
| ------------------------------------------------------- | --------------------------------------------------------------------------- |
| `features/consent/components/CookieConsentBanner.astro` | 쿠키 동의 배너 UI + 클라이언트 스크립트                                     |
| `shared/constants/consent.ts`                           | `CONSENT_REQUIRED_LOCALES`, `CONSENT_COOKIE_NAME`, `CONSENT_COOKIE_MAX_AGE` |
| `shared/lib/consent.ts`                                 | `isConsentRequired()`, `getConsentState()`, `setConsentCookie()`            |

### 8.2 수정 대상 파일

| 파일                              | 변경 내용                                                                                              |
| --------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `layouts/Layout.astro`            | (1) `CookieConsentBanner` import + 렌더링 추가, (2) AdSense 실제 연동 시 NPA 판별 인라인 스크립트 추가 |
| `shared/lib/i18n/translations.ts` | `consent.*` 번역 키 5개 추가 (8 locale)                                                                |
| `shared/lib/analytics/gtag.ts`    | `GtagEvent` 타입에 `'cookie_consent'` 추가                                                             |

### 8.3 수정 불필요 파일

| 파일                                       | 사유                                                                                    |
| ------------------------------------------ | --------------------------------------------------------------------------------------- |
| `shared/components/ad/FixedAdsense.astro`  | AdSense 실제 연동은 별도 작업. 본 스펙은 쿠키 동의 + NPA 제어에만 관여                  |
| `shared/components/ad/InFeedAdsense.astro` | 동일 사유                                                                               |
| `features/post-detail/lib/ads.ts`          | 동일 사유. In-Article 광고 삽입 로직은 NPA/PA 구분과 무관                               |
| `features/privacy/content.ts`              | 개인정보처리방침 페이지는 이미 쿠키/AdSense 관련 내용 포함. 배너에서 링크만 연결하면 됨 |

---

## 9. 구현 순서 (권장)

| 순서 | 작업                                    | 우선순위 | 관련 파일 | 비고                               |
| ---- | --------------------------------------- | -------- | --------- | ---------------------------------- |
| 1    | `shared/constants/consent.ts` 생성      | P0       | 신규      | 상수 정의                          |
| 2    | `shared/lib/consent.ts` 생성            | P0       | 신규      | 유틸리티 함수                      |
| 3    | `translations.ts`에 `consent.*` 키 추가 | P0       | 기존 수정 | 5키 x 8locale                      |
| 4    | `CookieConsentBanner.astro` 생성        | P0       | 신규      | 배너 UI + 스크립트                 |
| 5    | `Layout.astro`에 배너 삽입              | P0       | 기존 수정 | import + 렌더링                    |
| 6    | `gtag.ts` 타입 확장                     | P1       | 기존 수정 | `cookie_consent` 추가              |
| 7    | Layout.astro NPA 판별 스크립트 추가     | P1       | 기존 수정 | AdSense 실제 연동 시점에 함께 작업 |
| 8    | GA4 관리 콘솔에 커스텀 디멘션 등록      | P1       | GA4 설정  | `action` 디멘션                    |

> 순서 7은 AdSense 실제 연동(`adsbygoogle.js` 로드) 작업과 동시에 진행한다. 현재 광고가 플레이스홀더 상태이므로, 배너 UI와 쿠키 저장 로직을 먼저 구현하고 AdSense 연동은 후속 작업으로 분리할 수 있다.

---

## 10. 성능 영향

| 항목      | 영향              | 대응                                                           |
| --------- | ----------------- | -------------------------------------------------------------- |
| HTML 크기 | 미미 (~500B)      | SSG 빌드 타임에 consent 불필요 locale은 배너 HTML 미포함       |
| JS 번들   | 매우 작음 (~300B) | 인라인 스크립트, 외부 라이브러리 없음                          |
| LCP/CLS   | 영향 없음         | `position: fixed`로 레이아웃 시프트 없음. 콘텐츠 렌더링과 무관 |
| 쿠키 크기 | ~20B              | `cookie_consent=true` 또는 `false` 단일 값                     |

### 10.1 쿠키 만료 정책

| 사용자 선택 | 쿠키 만료 | 설계 의도                                                                 |
| ----------- | --------- | ------------------------------------------------------------------------- |
| 수락        | 365일     | 장기간 개인화 광고 유지. 연 1회 재동의 유도                               |
| 거부        | 1일       | 거부 의사를 단기간만 유지하여 다음 날 배너를 다시 표시. 광고 수익 최적화 |

---

## 11. 검증 방법

1. **Locale별 배너 표시 확인**: `en`, `ja`, `zh-CN`, `th` 페이지에서 배너 표시, `ko`, `id`, `vi`, `zh-TW`에서 미표시 확인
2. **쿠키 저장 확인**: DevTools > Application > Cookies에서 `cookie_consent` 값과 만료일 확인
3. **재방문 테스트**: 쿠키 저장 후 새 탭에서 동일 페이지 접속 시 배너 미표시 확인
4. **GA4 DebugView**: 수락/거부 클릭 시 `cookie_consent` 이벤트가 `action: accept/reject`, `content_locale` 파라미터와 함께 전송되는지 확인
5. **NPA 확인** (AdSense 실제 연동 후): Chrome DevTools Network 탭에서 AdSense 요청의 `npa=1` 파라미터 확인
6. **접근성**: 키보드로 배너 버튼 탐색 및 선택 가능 여부 확인

---

## 12. 향후 확장 가능성

- **Locale 추가**: `CONSENT_REQUIRED_LOCALES` 배열에 locale을 추가하면 즉시 적용. 코드 변경 최소화.
- **세분화된 동의**: 현재는 전체 동의/거부 2단계이나, 향후 '분석만 허용' / '광고만 허용' 등 세분화 가능.
- **동의 철회 UI**: Footer의 개인정보처리방침 링크 근처에 '쿠키 설정 변경' 링크를 추가하여 사용자가 이전 결정을 변경할 수 있는 경로 제공 가능.
- **Google Consent Mode v2**: 향후 `gtag('consent', 'update', ...)` API 연동으로 GA4의 consent-aware 모델링 기능 활용 가능.
