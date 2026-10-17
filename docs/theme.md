# Theme & Color System

## Overview

프로젝트 전체의 컬러 팔레트와 시맨틱 토큰은 `packages/config/theme.css` 파일에서 Tailwind CSS v4 `@theme inline` 블록으로 정의된다. 양 앱에서 이 파일을 import하여 동일한 디자인 토큰을 공유한다.

### 패키지 정보

- **패키지명**: `@eunminlog/config`
- **파일 위치**: `packages/config/theme.css`
- **방식**: Tailwind CSS v4 `@theme inline` (CSS custom property 기반)
- **버전**: 양 앱의 `tailwindcss`와 Vite/PostCSS 플러그인은 4.2.2를 기준으로 맞춘다. `@tailwindcss/vite` 4.2.2부터 Vite 8을 지원한다.

### Import 구조

```
packages/config/theme.css          <- 단일 소스 (Single Source of Truth)
  |
  +-- apps/client/src/styles/global.css    @import '@eunminlog/config/theme.css'
  +-- apps/admin/src/app/globals.css       @import '@eunminlog/config/theme.css'
```

---

## Color Palette

### Primary -- Sage Green

브랜드 메인 컬러. 네비게이션, 로고, 링크, 카테고리 뱃지 등 브랜드 아이덴티티를 나타내는 모든 요소에 사용.

| Token         | Hex       | 용도 예시                       |
| ------------- | --------- | ------------------------------- |
| `primary-50`  | `#f5f7f4` | 배경 하이라이트, hover 상태     |
| `primary-100` | `#e9efe7` | 카드 배경, 선택 상태            |
| `primary-200` | `#d4dfd1` | 보더, 구분선                    |
| `primary-300` | `#bdceb9` | 비활성 아이콘                   |
| `primary-400` | `#a6baa1` | **Base** -- 브랜드 기본 컬러    |
| `primary-500` | `#8ba484` | 강조 텍스트                     |
| `primary-600` | `#6f8b68` | **로고**, 링크, 내비게이션 활성 |
| `primary-700` | `#577052` | 로고 hover, 진한 강조           |
| `primary-800` | `#40543d` | 다크 배경 위 텍스트             |
| `primary-900` | `#2a3928` | 최고 대비 텍스트                |

### Secondary -- Soft Coral

보조 컬러. 협찬 콘텐츠, Editor's Pick 뱃지, CTA 버튼 등 사용자 주의를 끄는 요소에 사용.

| Token           | Hex       | 용도 예시                  |
| --------------- | --------- | -------------------------- |
| `secondary-50`  | `#fdf6f3` | 협찬 카드 배경             |
| `secondary-100` | `#faeae4` | 협찬 하이라이트            |
| `secondary-200` | `#f3d2c6` | 보더, 구분선               |
| `secondary-300` | `#e8b9a9` | 비활성 아이콘              |
| `secondary-400` | `#d4a594` | **Base** -- 보조 기본 컬러 |
| `secondary-500` | `#bf8a78` | 강조 텍스트                |
| `secondary-600` | `#a5705e` | 협찬 뱃지, CTA             |
| `secondary-700` | `#875849` | 진한 강조                  |
| `secondary-800` | `#664136` | 다크 배경 위 텍스트        |
| `secondary-900` | `#462c25` | 최고 대비 텍스트           |

### Gray

중립 컬러. 텍스트, 보더, 배경 등 UI 전반의 구조적 요소에 사용.

| Token      | Hex       | 용도 예시                  |
| ---------- | --------- | -------------------------- |
| `gray-0`   | `#ffffff` | 순백 배경                  |
| `gray-50`  | `#f8f9fa` | 페이지 배경                |
| `gray-100` | `#f3f4f6` | 카드/섹션 배경             |
| `gray-200` | `#e5e7eb` | 보더, 구분선               |
| `gray-300` | `#d1d5db` | 비활성 텍스트, placeholder |
| `gray-400` | `#9ca3af` | 보조 텍스트                |
| `gray-500` | `#6b7280` | 본문 보조 텍스트           |
| `gray-600` | `#4b5563` | 본문 텍스트                |
| `gray-700` | `#374151` | 강조 텍스트                |
| `gray-800` | `#1f2937` | 헤딩, 주요 텍스트          |
| `gray-900` | `#111827` | 최고 대비 텍스트           |

### Status Colors

상태 표현 전용 컬러. 각각 Error, Warning, Success를 나타낸다.

#### Red (Error)

| Token     | Hex       |
| --------- | --------- |
| `red-50`  | `#fef2f2` |
| `red-100` | `#fee2e2` |
| `red-200` | `#fecaca` |
| `red-300` | `#fca5a5` |
| `red-400` | `#f87171` |
| `red-500` | `#ef4444` |
| `red-600` | `#dc2626` |
| `red-700` | `#b91c1c` |
| `red-800` | `#991b1b` |
| `red-900` | `#7f1d1d` |

#### Yellow (Warning / Rating)

별점 아이콘은 Yellow 계열을 사용한다 (노란색 범용 컨벤션).

| Token        | Hex       |
| ------------ | --------- |
| `yellow-50`  | `#fffbeb` |
| `yellow-100` | `#fef3c7` |
| `yellow-200` | `#fde68a` |
| `yellow-300` | `#fcd34d` |
| `yellow-400` | `#fbbf24` |
| `yellow-500` | `#f59e0b` |
| `yellow-600` | `#d97706` |
| `yellow-700` | `#b45309` |
| `yellow-800` | `#92400e` |
| `yellow-900` | `#78350f` |

#### Green (Success)

| Token       | Hex       |
| ----------- | --------- |
| `green-50`  | `#f0fdf4` |
| `green-100` | `#dcfce7` |
| `green-200` | `#bbf7d0` |
| `green-300` | `#86efac` |
| `green-400` | `#4ade80` |
| `green-500` | `#22c55e` |
| `green-600` | `#16a34a` |
| `green-700` | `#15803d` |
| `green-800` | `#166534` |
| `green-900` | `#14532d` |

---

## Semantic Tokens

Palette 컬러를 역할(의미) 기반으로 재매핑한 토큰. 컴포넌트에서는 가능한 시맨틱 토큰을 우선 사용한다.

### Primary / Secondary Aliases

| Token                  | 참조값          | 용도                  |
| ---------------------- | --------------- | --------------------- |
| `primary-extralight`   | `primary-50`    | 가장 연한 브랜드 배경 |
| `primary-light`        | `primary-100`   | 연한 브랜드 배경      |
| `primary-normal`       | `primary-400`   | 기본 브랜드 컬러      |
| `primary-strong`       | `primary-500`   | 강조 브랜드 컬러      |
| `primary-heavy`        | `primary-700`   | 진한 브랜드 컬러      |
| `secondary-extralight` | `secondary-50`  | 가장 연한 보조 배경   |
| `secondary-light`      | `secondary-100` | 연한 보조 배경        |
| `secondary-normal`     | `secondary-400` | 기본 보조 컬러        |
| `secondary-strong`     | `secondary-500` | 강조 보조 컬러        |
| `secondary-heavy`      | `secondary-700` | 진한 보조 컬러        |

### Label

텍스트 컬러 체계. 정보 계층에 따라 사용.

| Token             | 참조값     | 용도                          |
| ----------------- | ---------- | ----------------------------- |
| `label-inverse`   | `gray-0`   | 다크 배경 위 흰색 텍스트      |
| `label-disable`   | `gray-300` | 비활성 상태                   |
| `label-assistive` | `gray-400` | 보조 안내 텍스트, placeholder |
| `label-tertiary`  | `gray-500` | 3차 텍스트 (메타 정보)        |
| `label-subtle`    | `gray-600` | 본문 보조 텍스트              |
| `label-normal`    | `gray-800` | 기본 본문 텍스트              |
| `label-strong`    | `gray-900` | 헤딩, 강조 텍스트             |

### Line

보더 및 구분선.

| Token         | 값                     | 용도        |
| ------------- | ---------------------- | ----------- |
| `line-normal` | `gray-500` / 20% alpha | 기본 구분선 |
| `line-subtle` | `gray-500` / 13% alpha | 약한 구분선 |

### Background

배경 컬러 체계.

| Token                | 참조값                 | 용도                    |
| -------------------- | ---------------------- | ----------------------- |
| `background-normal`  | `gray-0`               | 기본 페이지 배경 (흰색) |
| `background-subtle`  | `gray-50`              | 약간 톤다운된 배경      |
| `background-strong`  | `gray-100`             | 카드/섹션 배경          |
| `background-heavy`   | `gray-200`             | 강한 배경 구분          |
| `background-inverse` | `gray-800`             | 다크 배경 (Footer 등)   |
| `background-hover`   | `gray-500` / 6% alpha  | hover 상태 배경         |
| `background-dimmer`  | `gray-800` / 30% alpha | 오버레이/딤처리 배경    |

---

## Color Mapping Rules

기존 Tailwind 기본 컬러에서 커스텀 테마 토큰으로 전환 시 적용되는 매핑 규칙.

| 기존 컬러 (Before)  | 테마 토큰 (After) | 적용 대상                                     |
| ------------------- | ----------------- | --------------------------------------------- |
| `rose-*`            | `primary-*`       | 네비게이션, 로고, 링크, 뱃지 등 브랜드 액센트 |
| `amber-*` (협찬 UI) | `secondary-*`     | 협찬 카드, Editor's Pick 뱃지                 |
| `amber-*` (별점)    | `yellow-*`        | 별점 아이콘 (노란색 범용 컨벤션)              |
| `gray-*`            | `gray-*`          | 값 동일 (그대로 유지)                         |

### 로고 컬러

- 기본: `primary-600` (`#6F8B68`)
- Hover: `primary-700` (`#577052`)

---

## Usage

### Tailwind 클래스에서 사용

`@theme inline`으로 정의된 토큰은 Tailwind CSS v4에서 자동으로 유틸리티 클래스가 된다.

```html
<!-- Palette 컬러 직접 사용 -->
<div class="bg-primary-50 text-primary-900">...</div>
<span class="text-secondary-600">협찬</span>

<!-- Semantic 토큰 사용 (권장) -->
<p class="text-label-normal">본문 텍스트</p>
<div class="bg-background-subtle border-line-normal">카드</div>
<span class="text-label-assistive">보조 안내</span>

<!-- 상태 컬러 -->
<span class="text-red-500">에러 메시지</span>
<span class="text-yellow-400">별점 아이콘</span>
<span class="text-green-500">성공 메시지</span>
```

---

## Border Radius

Client 앱은 모든 `border-radius` 값을 `0px`로 재정의한다. 빠르고 간결한 인상을 위한 의도적 선택.

- **설정 위치**: `apps/client/src/styles/global.css` — `@theme inline`
- `rounded-xs` ~ `rounded-4xl` 전체가 `0px`
- 별도의 `rounded-none` 클래스 불필요 (기본값이 0)
- Admin 앱도 `--radius: 0` 기반으로 유사하게 sharp corners 적용 (`apps/admin/src/app/globals.css`)

---

### 새 토큰 추가 시

1. `packages/config/theme.css`의 `@theme inline` 블록에 CSS custom property 추가
2. 양 앱에서 별도 작업 없이 자동 반영 (import 구조 덕분)
3. 이 문서(`docs/theme.md`)에 추가된 토큰 기록
