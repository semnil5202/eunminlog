# Admin App Specification

> Date: 2026-03-04
> Last Updated: 2026-03-06
> Status: Phase 1 완료, Phase 3 Tiptap 에디터 + 이미지 삽입 + 폼 형식/메타 폼/번역/폼 검증(react-hook-form + Zod)/UX 구현 완료 (저장/S3 업로드 미구현), GPT-5 Nano API 실제 연동 완료 (mock 제거), 게시글 목록 페이지 구현 완료, Phase 5-1 (SearchFilter 리팩토링 + Pagination + 카테고리 관리) 진행 예정

## 1. Overview

### 1-1. 목적

은민로그 관리자 앱. 포스트 작성/편집, 미디어 업로드, 다국어 번역, 빌드 트리거를 수행하는 내부 도구.

### 1-2. 사용자

- 운영자 1-2명 (Semin & Chaeun)
- Supabase Dashboard에서 계정 수동 생성. 회원가입 플로우 불필요.

### 1-3. 기술 스택

| 항목        | 기술                                                                  |
| ----------- | --------------------------------------------------------------------- |
| Framework   | Next.js 15 (App Router, React 19)                                     |
| 렌더링      | CSR 기반. Server Action/API Route는 보안 민감 로직에만 사용           |
| 에디터      | Tiptap (ProseMirror 기반 리치 텍스트 에디터)                          |
| 인증        | Supabase Auth (email/password)                                        |
| DB          | Supabase PostgreSQL (`posts`, `post_translations`)                    |
| 미디어      | AWS S3 (`media-eunminlog` 버킷) + CloudFront (`media.eunminlog.site`) |
| 번역        | OpenAI GPT-5 Nano (Server Action에서 호출). 번역+요약+용어 추출       |
| 빌드 트리거 | GitHub Actions API (`workflow_dispatch`)                              |
| 배포        | Vercel Hobby 플랜                                                     |
| 스타일링    | Tailwind CSS v4 (`@eunminlog/config/theme.css` 공유)                  |
| UI 컴포넌트 | shadcn/ui (Radix UI + Tailwind)                                       |
| 폼 관리     | react-hook-form (mode: `'onSubmit'`)                                  |
| 폼 검증     | Zod (한국어 에러 메시지)                                              |
| 토스트      | sonner (`<Toaster position="top-right" richColors />`)                |
| Port        | 4322 (local HTTPS dev), 3001 (next dev fallback)                      |

### 1-4. 로컬 개발 서버

Admin 앱은 HTTPS 환경에서 로컬 개발한다 (Supabase Auth 등 보안 기능을 위해).

| 항목          | 값                                                       |
| ------------- | -------------------------------------------------------- |
| URL           | `https://local-admin.eunminlog.site:4322`                |
| 인증서        | mkcert 로컬 CA                                           |
| 설정 스크립트 | `pnpm --filter @eunminlog/admin setup:local` (최초 1회)  |
| 실행 명령     | `pnpm --filter @eunminlog/admin dev`                     |
| 서버 구현     | Next.js `--experimental-https` (mkcert 인증서 자동 사용) |

### 1-5. 핵심 제약사항

| 제약                       | 이유                               | 대응                                                                         |
| -------------------------- | ---------------------------------- | ---------------------------------------------------------------------------- |
| Vercel Hobby 10초 타임아웃 | Serverless Function 실행 시간 제한 | GPT 번역/요약을 Server Action에서 호출 (언어별 병렬 처리로 타임아웃 내 완료) |
| S3 퍼블릭 액세스 차단      | 보안 정책                          | Pre-signed URL로 업로드, CloudFront OAC로 서빙                               |
| Admin은 SEO 불필요         | 관리자 전용, 크롤링 대상 아님      | CSR 기반, `robots: noindex`                                                  |

---

## 2. Page & Route Structure

### 2-1. 라우트 맵

```
/                          → 핵심 지표 (게시글 조회수/추천수/댓글수) — 메트릭스 페이지
/posts                     → 게시글 목록 (SearchFilter + 테이블 + 정렬 + 페이지네이션) — 구현 완료 (페이지네이션 미구현)
/posts/new                 → 포스트 생성 (폼 형식 + 메타 폼 + Tiptap 에디터 + 번역) — 구현 완료 (저장 미연동)
/posts/[id]/edit           → 포스트 편집 (기존 데이터 로드 → 폼/에디터 반영 → 수정) — 미구현
/categories                → 카테고리 관리 (검색 + 그룹 테이블) — 구현 완료 (mock 데이터)
/categories/new            → 카테고리 생성 (대분류/소분류) — 구현 완료 (저장 미연동)
/categories/[id]/edit      → 카테고리 수정 (기존 데이터 로드 → 폼 반영 → 수정) — 미구현
```

> **구현 결정**: Route Groups (`(authenticated)` 등)를 사용하지 않고 **flat 구조**를 채택했다. 사이드바가 전체 페이지에 글로벌로 적용되며, 인증 가드는 추후 auth feature에서 추가한다.

### 2-2. 인증 가드 (미구현)

- 모든 `/dashboard`, `/posts/*` 라우트는 인증 필수 (예정).
- 비인증 사용자는 로그인 페이지로 리다이렉트 (예정).
- 인증 상태는 Supabase Auth 세션으로 관리. CSR에서 `supabase.auth.getSession()`으로 확인.
- 로그인 페이지의 URL은 auth feature 구현 시 확정.

### 2-3. 레이아웃 구조

```
RootLayout (app/layout.tsx)
└── SidebarLayout (app/sidebar-layout.tsx — 'use client')
    ├── AppSidebar (shared/components/layout/AppSidebar.tsx)
    └── SidebarInset > main
        ├── /               → MetricsPage (핵심 지표)
        ├── /posts          → PostListPage (게시글 목록) — 구현 완료
        ├── /posts/new      → NewPostPage (포스트 생성) — 폼 형식 + 메타 폼 + 에디터 + 번역 구현 완료
        ├── /posts/[id]/edit → EditPostPage (포스트 편집) — 미구현
        ├── /categories     → CategoryListPage (카테고리 관리) — 구현 완료 (mock)
        ├── /categories/new → NewCategoryPage (카테고리 생성) — 구현 완료 (저장 미연동)
        └── /categories/[id]/edit → EditCategoryPage (카테고리 수정) — 미구현
```

**SidebarLayout 역할**:

- `SidebarProvider` + `AppSidebar` + `SidebarInset`로 전체 레이아웃 구성.
- `'use client'` 컴포넌트로 분리 (shadcn Sidebar가 클라이언트 상태 필요).

**AppSidebar 구성** (5개 네비게이션 그룹, Collapsible):

- **핵심 지표** (BarChart3): 게시글 조회수/추천수/댓글수 (`/`), 광고 지표 (미구현)
- **에디터** (FileEdit): 새 게시글 작성 (`/posts/new`), 게시글 작성/수정/삭제 (`/posts`)
- **카테고리** (FolderTree): 카테고리 생성/수정/삭제 (`/categories`)
- **부가기능 관리** (MessageSquare): 댓글 조회/삭제, 추천수 관리 (미구현)
- **협찬 관리** (HandCoins): 협찬 조회 (미구현)

로고: "은민로그" (`text-title1 font-bold text-primary-600`). 하단에 로그아웃 버튼 (기능 미연결).

---

## 3. Feature 분리

7개 Feature로 구성한다. Feature 간 직접 import 금지 -- 공유 필요 시 `shared/`로 이동.

| Feature           | 설명                                   | 주요 페이지                      | 상태                                                                                 |
| ----------------- | -------------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------ |
| `metrics`         | 핵심 지표 (조회수/추천수/댓글수)       | `/`                              | Mock 구현 완료                                                                       |
| `auth`            | 로그인/로그아웃, 세션 관리             | TBD (로그인 페이지)              | 미구현                                                                               |
| `post-editor`     | Tiptap 에디터, 포스트 생성/편집 폼     | `/posts/new`, `/posts/[id]/edit` | 에디터 + 폼 형식 + 메타 폼 + 썸네일 + 번역 연동 구현 완료 (저장/S3 업로드 미구현)    |
| `post-management` | 포스트 목록, 삭제, 발행 상태 관리      | `/posts`                         | 목록 구현 완료 (삭제 미구현)                                                         |
| `media`           | 이미지 업로드, Pre-signed URL          | 에디터 내 사용                   | 미구현                                                                               |
| `translation`     | GPT-5 Nano 다국어 번역 (API 연동 완료) | 에디터 내 사용                   | 구현 완료 (고유명사 추출 + 번역 + 미리보기 + 실패 fallback + 재시도). DB 저장 미연동 |
| `build-trigger`   | GitHub Actions 빌드 트리거             | 대시보드/에디터 내 사용          | 미구현                                                                               |

> **Note**: `metrics`는 현재 `app/page.tsx`에 직접 구현되어 있으며, 복잡도가 높아지면 `features/metrics/`로 분리 예정. 현재는 shared SearchFilter와 shadcn Table/Select를 사용하는 단일 페이지.

---

## 4. Feature 상세 요구사항

### 4-1. auth

#### 기능 요구사항

| ID     | 요구사항                                         | 우선순위 |
| ------ | ------------------------------------------------ | -------- |
| AUTH-1 | Email/password 로그인 폼                         | P0       |
| AUTH-2 | 로그인 에러 메시지 표시 (잘못된 이메일/비밀번호) | P0       |
| AUTH-3 | 로그아웃 (세션 파기)                             | P0       |
| AUTH-4 | 인증 상태 전역 관리 (Context 또는 hook)          | P0       |
| AUTH-5 | 인증 가드 (비인증 시 로그인 페이지 리다이렉트)   | P0       |

#### Supabase Auth Flow

```
[로그인 페이지]
  → 이메일/비밀번호 입력
  → supabase.auth.signInWithPassword({ email, password })
  → 성공: /dashboard로 리다이렉트
  → 실패: 에러 메시지 표시

[로그아웃]
  → supabase.auth.signOut()
  → /로 리다이렉트

[세션 확인]
  → supabase.auth.getSession()
  → 세션 있음: 인증 상태 유지
  → 세션 없음/만료: /로 리다이렉트

[세션 갱신]
  → supabase.auth.onAuthStateChange() 리스너로 자동 갱신
```

#### Server Action vs CSR 구분

| 작업            | 처리 위치                 | 이유                 |
| --------------- | ------------------------- | -------------------- |
| 로그인/로그아웃 | CSR (Supabase Client SDK) | 클라이언트 세션 관리 |
| 세션 확인       | CSR (Supabase Client SDK) | 실시간 상태 확인     |

#### 폴더 구조

```
features/auth/
├── components/
│   └── LoginForm.tsx          # 로그인 폼 UI (email, password 입력 + submit)
├── hooks/
│   └── useAuth.ts             # 인증 상태 관리 hook (login, logout, session)
└── containers/
    └── LoginContainer.tsx     # LoginForm + useAuth 조합
```

---

### 4-2. post-editor

#### 폼 형식 (Form Type)

포스트 작성/편집 폼은 **폼 형식**에 따라 입력 필드가 달라진다. 폼 형식은 UI 전용 개념으로, DB에 별도 컬럼으로 저장하지 않는다 (체험 방문 전용 필드의 nullable 여부로 구분).

| 폼 형식 값       | 라벨      | 설명                                       | 상태      |
| ---------------- | --------- | ------------------------------------------ | --------- |
| `visit`          | 체험 방문 | 장소/주소/가격대 필드 표시 + 공통 필드     | 구현 완료 |
| `product-review` | 제품 리뷰 | 공통 필드만 표시 (장소/주소/가격대 미표시) | 구현 완료 |

**공통 필드** (모든 폼 형식에 공유):

- 폼 형식 선택 (select)
- 썸네일 (이미지 업로드)
- 본문 (제목 입력 + Tiptap 에디터)
- 카테고리 / 서브카테고리 (select)
- 3줄 요약 (textarea + AI 요약 생성)
- 번역 기능 (번역본 생성 + 번역본 확인)

**체험 방문 전용 필드** (`visit` 선택 시에만 표시):

- 장소명 (`place_name`)
- 주소 (`address`)
- 가격 접두어 (`price_prefix`) + 가격 (`price`)

**타입 정의**: `PostFormType = 'visit' | 'product-review'` (`shared/types/post.ts`)
**상수**: `FORM_TYPE_OPTIONS` (`features/post-editor/constants/category.ts`)

#### 에디터 페이지 레이아웃 순서

```
폼 형식 (select)
    ↓
썸네일 (이미지 업로드)
    ↓
본문 (제목 입력 + Separator + Tiptap 에디터)
    ↓
카테고리 / 서브카테고리 (select x 2)
    ↓
[체험 방문 전용 필드] ← formType === 'visit' 일 때만 표시
  ├── 장소 (text input)
  ├── 주소 (text input)
  └── 가격 (price_prefix: text 선택 + price: number 필수, 만원 단위)
    ↓
3줄 요약 (textarea + "요약 생성" 버튼)
    ↓
액션 버튼 (번역본 생성 / 번역본 확인하기 / 작성 완료)
```

#### 기능 요구사항

| ID    | 요구사항                                                                              | 우선순위 | 상태                 |
| ----- | ------------------------------------------------------------------------------------- | -------- | -------------------- |
| PE-1  | Tiptap 리치 텍스트 에디터 (Heading, Bold, Italic, List, Link, Image, Blockquote)      | P0       | 구현 완료            |
| PE-2  | 폼 형식 선택 (visit / product-review)                                                 | P0       | 구현 완료            |
| PE-3  | 포스트 메타데이터 폼 (title, category, sub_category, thumbnail, description)          | P0       | 구현 완료            |
| PE-4  | 이미지 삽입 (미디어 업로드 연동)                                                      | P0       | 초안 완료 (blob URL) |
| PE-5  | 이미지 삭제 및 순서 변경 (드래그 앤 드롭)                                             | P1       | 미구현               |
| PE-6  | 포스트 저장 (Supabase `posts` 테이블 upsert)                                          | P0       | 미구현               |
| PE-7  | 포스트 편집 (기존 데이터 로드 → 폼/에디터 반영 → 수정). 상세: Section 4-2-A 참조      | P0       | 미구현               |
| PE-7A | slug 변경 경고 모달 (게시글 수정 시 slug 변경 시 표시). 상세: Section 4-2-A, redirect-specs.md | P0 | 미구현               |
| PE-8  | is_multilingual 토글 (기본값 `true`)                                                  | P0       | 미구현               |
| PE-9  | is_sponsored / is_recommended 토글                                                    | P0       | 미구현               |
| PE-10 | rating 입력 (1.0-5.0, 0.5 단위)                                                       | P1       | 미구현               |
| PE-11 | place_name, address, price_prefix, price 입력 (체험 방문 전용)                        | P1       | 구현 완료            |
| PE-12 | 3줄 요약 AI 생성 (Server Action, GPT-5 Nano)                                          | P0       | 구현 완료            |
| PE-13 | 번역 트리거 (에디터 내 번역본 생성/확인)                                              | P0       | 구현 완료            |
| PE-14 | 저장 시 빌드 트리거 옵션                                                              | P1       | 미구현               |
| PE-15 | 미리보기 (선택적)                                                                     | P2       | 미구현               |
| PE-16 | 썸네일 업로드 (WebP 변환, blob URL 미리보기)                                          | P0       | 구현 완료            |
| PE-17 | 폼 검증 — react-hook-form + Zod. 버튼 클릭 시 검증 → 미입력 필드 focus + 에러 메시지  | P0       | 구현 완료            |
| PE-18 | Loading spinner — 요약 생성, 번역본 생성하기 버튼에 LoaderIcon animate-spin 표시      | P0       | 구현 완료            |
| PE-19 | Label 스타일 — 모든 label 검은색(`text-base font-bold`) + 필수값 `*` primary-600 표시 | P0       | 구현 완료            |

#### 포스트 메타데이터 폼 필드

| 필드         | 입력 타입     | 필수 | DB 컬럼           | 폼 형식    | 비고                                                  |
| ------------ | ------------- | ---- | ----------------- | ---------- | ----------------------------------------------------- |
| 제목         | text input    | Y    | `title`           | 공통       | 40자 제한 + 글자수 카운터                             |
| 설명         | textarea      | Y    | `description`     | 공통       | 3줄 요약 + AI 생성 버튼                               |
| Slug         | text input    | Y    | `slug`            | 공통       | URL slug, unique. 자동 생성 + 수동 편집 가능 (미구현) |
| 카테고리     | select        | Y    | `category`        | 공통       | `delicious`, `cafe`, `travel`                         |
| 서브카테고리 | select        | Y    | `sub_category`    | 공통       | 카테고리에 따라 동적 변경                             |
| 썸네일       | 이미지 업로드 | Y    | `thumbnail`       | 공통       | WebP 변환, blob URL 미리보기                          |
| 협찬 여부    | toggle        | N    | `is_sponsored`    | 공통       | 기본값 `false` (미구현)                               |
| 추천 여부    | toggle        | N    | `is_recommended`  | 공통       | 기본값 `false` (미구현)                               |
| 다국어 제공  | toggle        | N    | `is_multilingual` | 공통       | 기본값 `true` (미구현)                                |
| 평점         | number input  | N    | `rating`          | 공통       | 1.0-5.0, 0.5 단위 (미구현)                            |
| 장소명       | text input    | N    | `place_name`      | visit 전용 | Schema.org `itemReviewed`                             |
| 주소         | text input    | N    | `address`         | visit 전용 | Schema.org                                            |
| 가격 접두어  | text input    | N    | `price_prefix`    | visit 전용 | 예: "메인메뉴 평균: ", "1인 코스: "                   |
| 가격         | number input  | N    | `price`           | visit 전용 | 원 단위. 접두어 + 가격 조합으로 표시                  |

#### 카테고리-서브카테고리 매핑

```
delicious (맛집) → korean (한식), western (양식), japanese (일식), pub (주점)
cafe (카페)      → hotplace (핫플), study (카공)
travel (여행)    → domestic (국내), overseas (해외), accommodation (숙소)
```

#### Tiptap 에디터 구성 (구현 완료)

**Extension 구성** (`features/post-editor/configs/tiptap-extensions.ts`):

| Extension              | 구성                                                                                                                                                                                                                                 | 상태      |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------- |
| `CustomStarterKit`     | StarterKit에서 `bulletList`, `heading`, `codeBlock`, `code` 비활성화. listItem, blockquote, bold, italic, strike, orderedList, horizontalRule에 인라인 스타일 적용                                                                   | 구현 완료 |
| `CustomBulletList`     | `list-style-position: outside; list-style-type: revert;`                                                                                                                                                                             | 구현 완료 |
| `CustomHeading`        | h2-h6 지원 (h1 비활성화). 레벨별 font-size/line-height/font-weight/color/margin 인라인 스타일. Markdown 입력 규칙 (`## ` ~ `###### `)                                                                                                | 구현 완료 |
| `CustomLink`           | `openOnClick: false`. 색상 `#5e83fe`, 밑줄, URL `https?://` 검증                                                                                                                                                                     | 구현 완료 |
| `CustomUnderline`      | `class="underline"` 적용                                                                                                                                                                                                             | 구현 완료 |
| `CustomResizableImage` | `@tiptap/extension-image` 기반 커스텀 확장. DOM NodeView로 4코너 리사이즈 핸들 구현. 드래그로 에디터 너비 대비 % 단위 리사이즈. `style` 속성에 `width: X%` 저장. `inline: true`. 현재 blob URL 사용 (S3 presigned URL 업로드 미구현) | 구현 완료 |
| `Placeholder`          | 빈 에디터 placeholder 텍스트                                                                                                                                                                                                         | 미구현    |

**에디터 출력 포맷**: HTML 문자열 (인라인 스타일 포함). DB `content` 컬럼에 HTML로 저장.

> **완료**: `docs/database.md`의 `content` 컬럼 설명이 "본문 (HTML -- Tiptap 에디터 출력)"으로 업데이트됨.

**HTML 출력 인라인 스타일 상세**:

| 요소                  | 인라인 스타일                                                                                        |
| --------------------- | ---------------------------------------------------------------------------------------------------- |
| Bold (`<strong>`)     | `font-family: inherit;`                                                                              |
| Italic (`<em>`)       | `font-family: inherit;`                                                                              |
| Strikethrough (`<s>`) | `font-family: inherit;`                                                                              |
| Underline (`<u>`)     | `class="underline"` (Tailwind 유틸리티)                                                              |
| Heading h2            | `font-size: 22px; line-height: 30px; font-weight: 600; color: #111827; margin: 1rem 0 0.5rem 0;`     |
| Heading h3            | `font-size: 20px; line-height: 28px; font-weight: 600; color: #111827; margin: 0.875rem 0 0.5rem 0;` |
| Heading h4            | `font-size: 18px; line-height: 26px; font-weight: 600; color: #111827; margin: 0.75rem 0 0.5rem 0;`  |
| Heading h5            | `font-size: 16px; line-height: 24px; font-weight: 600; color: #111827; margin: 0.625rem 0 0.5rem 0;` |
| Heading h6            | `font-size: 14px; line-height: 20px; font-weight: 600; color: #111827; margin: 0.5rem 0 0.5rem 0;`   |
| Link (`<a>`)          | `color: #5e83fe; text-decoration: underline; text-underline-offset: 2px; cursor: pointer;`           |
| BulletList (`<ul>`)   | `list-style-position: outside; list-style-type: revert;`                                             |
| OrderedList (`<ol>`)  | `list-style-position: outside;`                                                                      |
| ListItem (`<li>`)     | `margin: 0; padding: 0; list-style-type: revert; margin-left: 22px;`                                 |
| Blockquote            | `padding-left: 17px; border-left: 3px solid #ddd; color: #555;`                                      |
| Image (`<img>`)       | `style="width: X%; height: auto;"` (X는 에디터 너비 대비 퍼센트, 기본값 100%)                        |
| HorizontalRule        | `margin: 16px 0;`                                                                                    |

**ProseMirror CSS** (`globals.css`에 추가됨 -- 에디터 내부 전용):

```css
.ProseMirror:focus {
  outline: none;
}
.ProseMirror a:hover {
  color: var(--color-primary-strong);
}
.ProseMirror img {
  max-width: 100%;
  height: auto;
}
.ProseMirror > ol {
  list-style-type: decimal !important;
}
.ProseMirror ol ol,
.ProseMirror ul ol {
  list-style-type: lower-alpha !important;
}
.ProseMirror ol ol ol,
.ProseMirror ul ol ol {
  list-style-type: lower-roman !important;
}
```

**Toolbar 구성**:

| 그룹        | 버튼                                             | 위치 |
| ----------- | ------------------------------------------------ | ---- |
| FontStyles  | Bold, Italic, Underline                          | 좌측 |
| TiptapLink  | Link (모달 입력)                                 | 좌측 |
| TextAlign   | AlignLeft, AlignCenter, AlignRight, AlignJustify | 좌측 |
| List        | BulletList, OrderedList                          | 좌측 |
| UploadImage | Image (파일 선택 → blob URL 삽입, 임시)          | 좌측 |
| History     | Undo, Redo                                       | 우측 |

그룹 사이에 `VerticalDivider` 구분선 삽입.

**이미지 삽입 기능** (초안 구현 완료):

- **삽입 방식**: UploadImage 툴바 버튼 클릭 → 숨겨진 `<input type="file">` 트리거 → 파일 선택 → `URL.createObjectURL()` → `editor.chain().focus().setImage({ src })` 삽입
- **허용 포맷**: jpeg, png, jpg, gif, webp
- **리사이즈**: 이미지 클릭 시 4코너에 파란색 리사이즈 핸들 표시. 핸들 드래그로 에디터 `.ProseMirror` 너비 대비 % 단위 리사이즈 (최소 50px, 최대 에디터 너비). 선택 시 파선 테두리(`1px dashed #4a90d9`) 표시.
- **HTML 출력**: `<img style="width: X%; height: auto;" src="..." />` (X는 에디터 너비 대비 퍼센트, 기본값 100%)
- **현재 제한**: blob URL 사용 (S3 presigned URL 업로드 미구현). 드래그앤드롭/붙여넣기 이미지 처리 미구현. 이미지 크롭 미구현.

**에디터 페이지 구성** (`/posts/new`):

- `max-w-[688px]` 컨테이너 (Client 뷰어와 동일 너비)
- 페이지 헤더: "게시글 작성" 제목 + 설명 텍스트
- 레이아웃 순서: 폼 형식 → 썸네일 → 본문(제목+에디터) → 카테고리 → [체험방문 전용 필드] → 3줄 요약 → 액션 버튼
- 본문 영역: 제목 입력 (`text input`, 40자 제한, 글자수 카운터) + `<Separator />` + `TiptapEditorContainer`
- 체험 방문 전용 필드: `VisitFields` 컴포넌트 (폼 형식이 `visit`일 때만 렌더링)
- 3줄 요약: textarea + "요약 생성" 버튼 (Server Action `generateSummary` -- GPT-5 Nano API 연동 완료)
- 액션 버튼: "번역본 생성하기" (카테고리 선택 + 미번역 시) / "용어 검토 계속하기" (Sheet 닫은 후 재오픈) / "번역본 확인하기" (번역 완료 시) / "작성 완료"
- `TiptapEditorContainer` (SSR-safe: `isMounted` 패턴 + `TiptapEditorSkeleton` 로딩 상태)

**폼 검증 (react-hook-form + Zod — PE-17)**:

react-hook-form + Zod 기반 폼 검증. "작성 완료" / "번역본 생성하기" 버튼은 **항상 활성화** 상태이며, 클릭 시 Zod schema로 검증한다. 검증 실패 시 첫 번째 미입력 필드로 focus 이동 + 에러 메시지 표시.

**검증 모드**: react-hook-form `mode: 'onSubmit'` — 버튼 클릭 전까지 에러를 표시하지 않으며, 클릭 후에는 `onChange`로 실시간 재검증한다.

**에러 메시지 스타일**: 각 input 하단에 빨간색 `text-sm` (14px)로 표시. Zod schema에 한국어 에러 메시지를 직접 정의한다.

| 검증 대상 필드               | Zod 에러 메시지 (예시)         | 폼 형식    |
| ---------------------------- | ------------------------------ | ---------- |
| 제목 (`title`)               | "제목을 입력해주세요."         | 공통       |
| 본문 (`content`)             | "본문을 입력해주세요."         | 공통       |
| 썸네일 (`thumbnail`)         | "썸네일을 등록해주세요."       | 공통       |
| 카테고리 (`category`)        | "카테고리를 선택해주세요."     | 공통       |
| 서브카테고리 (`subCategory`) | "서브카테고리를 선택해주세요." | 공통       |
| 3줄 요약 (`description`)     | "3줄 요약을 입력해주세요."     | 공통       |
| 장소명 (`placeName`)         | "장소명을 입력해주세요."       | visit 전용 |
| 주소 (`address`)             | "주소를 입력해주세요."         | visit 전용 |
| 가격 (`price`)               | "가격을 입력해주세요."         | visit 전용 |

**번역 완료 검증**: 카테고리(대분류 + 소분류)가 선택된 상태에서 번역 없이 "작성 완료" 클릭 시 "번역본 생성이 먼저 필요합니다." 에러 메시지를 표시한다. 번역이 완료된 후에만 작성 완료가 가능하다.

**개별 버튼 비활성화 (disabled) 조건**:

- "요약 생성" 버튼: 이미 요약 완료(`isSummarized`) 또는 요약 진행 중(`isSummarizing`)이면 비활성화

**Loading spinner (PE-18)**:

| 버튼            | 스피너 조건              | 아이콘                                              |
| --------------- | ------------------------ | --------------------------------------------------- |
| 요약 생성       | `isSummarizing === true` | `LoaderIcon` (lucide-react) `animate-spin` `size-3` |
| 번역본 생성하기 | `isExtracting === true`  | `LoaderIcon` (lucide-react) `animate-spin` `size-4` |

**Label 스타일 (PE-19)**:

모든 폼 필드의 label에 일관된 스타일을 적용한다:

- 기본 스타일: `text-base font-bold` (검은색)
- 필수 표시: `<span className="text-primary-600">*</span>`
- 적용 대상: 폼 형식, 썸네일, 본문, 카테고리, 장소, 주소, 가격, 3줄 요약

#### 4-2-A. 게시글 수정 페이지 (`/posts/[id]/edit`) — PE-7 상세

**진입점:**

- `/posts` 목록 테이블에서 게시글 **제목**을 하이퍼링크로 표시
- 하이퍼링크 스타일: 파란색 글자 + 파란색 밑줄 (`text-blue-600 underline`)
- 클릭 시 `/posts/{id}/edit`로 이동 (`<Link href={...}>`)

**데이터 로드:**

- 페이지 진입 시 `getPost(postId)` Server Action 호출
- 반환된 데이터(post + translations)를 react-hook-form `defaultValues`에 세팅
- Tiptap 에디터에도 기존 content를 주입
- formType 판별: `place_name`이 존재하면 `visit`, 아니면 `product-review`

**수정 플로우 (다국어가 아닌 경우 — `is_multilingual === false`):**

1. 사용자가 폼 값을 수정
2. "수정 완료" 버튼 클릭
3. slug가 변경된 경우 **(PE-7A)**: slug 변경 경고 모달 표시
   - 메시지: "slug 수정 시 기존 경로로 접근할 경우 리다이렉트가 발생하여 크롤러에 영향이 갑니다"
   - 확인/취소 버튼
   - 확인 시 다음 단계 진행
4. slug가 변경되지 않은 경우: 확인 모달 "수정하시겠습니까?" (확인/취소)
5. 확인 시 `updatePost` Server Action 호출 (slug 변경 시 prev_slug 자동 저장)

**수정 플로우 (다국어인 경우 — `is_multilingual === true`):**

1. 사용자가 폼 값을 수정
2. 수정된 값이 하나라도 있으면(`watch`로 dirty 감지):
   - "번역본 생성" 버튼 **활성화**
   - "수정 완료" 버튼 **비활성화**
3. 번역본 생성 → 번역 플로우는 생성 플로우와 동일 (용어 추출 → 번역 → 프리뷰)
4. 번역 완료 후 "수정 완료" 버튼 활성화, "번역본 생성" 버튼 비활성화
5. "수정 완료" 클릭 시:
   - slug가 변경된 경우 **(PE-7A)**: slug 변경 경고 모달 표시 (위와 동일)
   - 확인 시 `updatePost` + `saveTranslations` 호출 (slug 변경 시 prev_slug 자동 저장)

**slug 변경 경고 모달 (PE-7A):**

- 카테고리 수정의 CM-7과 동일한 패턴
- 게시글의 slug가 변경될 때만 표시 (다른 필드만 변경된 경우 기존 확인 모달 사용)
- 상세: [`docs/redirect-specs.md`](redirect-specs.md)

**dirty 감지 기준 (다국어 수정 시):**

- react-hook-form의 `watch`를 사용하여 초기값 대비 변경 여부를 판단
- 비교 대상 필드: title, content, description, slug, category, subCategory, thumbnail, placeName, address, pricePrefix, price
- 하나라도 변경되면 번역 재생성이 필요한 것으로 간주

**UI 차이점 (생성 vs 수정):**

| 항목              | 생성 (`/posts/new`)  | 수정 (`/posts/[id]/edit`)          |
| ----------------- | -------------------- | ---------------------------------- |
| 페이지 제목       | "게시글 작성"        | "게시글 수정"                      |
| 페이지 설명       | "새로운 게시글을..." | "게시글을 수정합니다."             |
| 완료 버튼 텍스트  | "작성 완료"          | "수정 완료"                        |
| 뒤로가기 링크     | 없음                 | "목록으로 돌아가기" (`/posts`)     |
| 초기 데이터       | 빈 폼               | 서버에서 로드한 기존 데이터        |
| API 호출          | `createPost`         | `updatePost`                       |
| 번역 버튼 활성화  | 항상 (카테고리 선택 시) | dirty 상태일 때만 (다국어 게시글) |

---

#### 미디어 갤러리 -- 연속 이미지 처리 (B 방식)

- Tiptap 에디터에서는 이미지를 개별 노드로 삽입/삭제/순서 변경만 관리.
- Client(Astro) 렌더링 시 HTML 내 연속 `<img>` 태그를 감지하여 CSS snap 갤러리(`scroll-snap-type: x mandatory`)로 자동 변환.
- Admin 에디터에서는 별도의 갤러리 UI를 구현하지 않는다. 이미지를 순서대로 삽입하면 Client에서 갤러리로 표시됨.

#### Server Action vs CSR 구분

| 작업                                 | 처리 위치                                                | 이유                                         |
| ------------------------------------ | -------------------------------------------------------- | -------------------------------------------- |
| 에디터 렌더링/조작                   | CSR                                                      | UI 인터랙션                                  |
| 포스트 저장 (Supabase insert/update) | Server Action                                            | Supabase Service Role Key 보호               |
| 포스트 조회 (편집 시 데이터 로드)    | Server Action                                            | Supabase Service Role Key 보호               |
| 이미지 업로드                        | CSR → Server Action (Pre-signed URL 생성) → CSR (S3 PUT) | 하이브리드                                   |
| 번역 (GPT-5 Nano)                    | Server Action (언어별 병렬 호출)                         | API Key 보호, `Promise.allSettled` 병렬 처리 |
| 빌드 트리거                          | Server Action                                            | GitHub Token 보호                            |

#### 폴더 구조

```
features/post-editor/
├── configs/
│   ├── tiptap-extensions.ts         # ✅ Extension 설정 (CustomStarterKit, Heading, Link, Underline, CustomResizableImage 등)
│   ├── image.ts                     # ✅ CustomResizableImage 확장 (DOM NodeView, 4코너 리사이즈 핸들)
│   └── image-carousel.ts           # ✅ 이미지 캐러셀 설정
├── components/
│   ├── TiptapEditor.tsx             # ✅ Tiptap EditorContent 래퍼 (에디터 영역 UI)
│   ├── TiptapEditorSkeleton.tsx     # ✅ 에디터 로딩 스켈레톤
│   ├── Toolbar.tsx                  # ✅ 에디터 툴바 (FontStyles + Link + List + TextAlign + Image + History)
│   ├── CategorySelector.tsx         # ✅ 카테고리/서브카테고리 select 2개 조합
│   ├── ThumbnailUpload.tsx          # ✅ 썸네일 업로드 (WebP 변환, blob URL 미리보기, 삭제)
│   ├── VisitFields.tsx              # ✅ 체험 방문 전용 필드 (장소, 주소, 가격대)
│   ├── icons/                       # ✅ SVG 아이콘 13개 (Bold, Italic, Underline, Link, Unorder, Order, Image, Undo, Redo, AlignLeft, AlignCenter, AlignRight, AlignJustify)
│   │   └── index.ts                 # barrel export
│   └── toolbars/                    # ✅ 툴바 그룹 컴포넌트
│       ├── FontStyles.tsx           # Bold, Italic, Underline 토글
│       ├── TiptapLink.tsx           # Link 모달 (Portal 기반)
│       ├── List.tsx                 # BulletList, OrderedList 토글
│       ├── TextAlign.tsx            # ✅ 텍스트 정렬 (Left, Center, Right, Justify)
│       ├── UploadImage.tsx          # ✅ 파일 선택 → blob URL 삽입 (S3 업로드 미연동)
│       ├── History.tsx              # Undo, Redo
│       ├── VerticalDivider.tsx      # 그룹 간 구분선
│       ├── types.ts                 # 공유 toolbar prop 타입
│       └── index.ts                 # barrel export
├── hooks/
│   ├── useTiptapEditor.ts           # ✅ 에디터 인스턴스 관리 (content 양방향 바인딩, HTML 출력)
│   ├── usePostEditor.ts             # (미구현) 에디터 상태 관리 (content + meta + dirty 체크)
│   └── usePostSave.ts               # (미구현) 포스트 저장 로직
├── lib/
│   └── image.ts                     # ✅ toWebP() — 이미지 파일을 WebP Blob으로 변환 (Canvas API)
├── api/
│   └── actions.ts                   # ✅ Server Actions (generateSummary — GPT-5 Nano API 연동)
├── containers/
│   └── TiptapEditorContainer.tsx    # ✅ SSR-safe 에디터 래퍼 (isMounted + Skeleton + Toolbar + Editor)
└── constants/
    └── category.ts                  # ✅ FORM_TYPE_OPTIONS, CATEGORY_OPTIONS, SUB_CATEGORY_MAP
```

> **Note**: `✅`는 구현 완료, `(미구현)`은 향후 Phase에서 구현 예정.

---

### 4-3. post-management

#### 기능 요구사항

| ID   | 요구사항                                            | 우선순위 | 상태      |
| ---- | --------------------------------------------------- | -------- | --------- |
| PM-1 | 포스트 목록 테이블 (제목, 발행일, 수정일 표시)      | P0       | 구현 완료 |
| PM-2 | 포스트 삭제 (확인 다이얼로그 포함)                  | P0       | 미구현    |
| PM-3 | 포스트 편집 페이지로 이동 — 테이블 제목 하이퍼링크  | P0       | 미구현    |
| PM-4 | 카테고리/서브카테고리 필터링                        | P1       | 미구현    |
| PM-5 | 검색 (제목, slug 기준)                              | P2       | 미구현    |
| PM-6 | 빌드 트리거 버튼 (대시보드 레벨)                    | P1       | 미구현    |
| PM-7 | 정렬 드롭다운 (최신 발행순 / 최신 수정순)           | P0       | 구현 완료 |
| PM-8 | SearchFilter (날짜 범위 + 검색) + "새 글 작성" 버튼 | P0       | 구현 완료 |

#### 게시글 목록 페이지 (`/posts`) — 구현 완료

- SearchFilter: react-hook-form 기반 (`registerFrom`, `registerTo`, `registerQuery` props)
- 테이블 컬럼: 제목 / 발행일 / 수정일
- 정렬 드롭다운: 최신 발행순 (기본) / 최신 수정순
- "새 글 작성" 버튼: `/posts/new`로 이동
- 검색 버튼: `variant="outline"` (아웃라인 스타일)

#### 포스트 목록 테이블 컬럼 (현재 구현)

| 컬럼   | 표시 내용    | 비고             |
| ------ | ------------ | ---------------- |
| 제목   | `title`      | 텍스트           |
| 발행일 | `created_at` | 포맷: YYYY-MM-DD |
| 수정일 | `updated_at` | 포맷: YYYY-MM-DD |

#### 포스트 목록 테이블 컬럼 (향후 확장 예정)

| 컬럼     | 표시 내용                   | 비고                     |
| -------- | --------------------------- | ------------------------ |
| 제목     | `title`                     | 클릭 시 편집 페이지 이동 |
| 카테고리 | `category` / `sub_category` | 뱃지 형태                |
| 협찬     | `is_sponsored`              | 아이콘 또는 뱃지         |
| 추천     | `is_recommended`            | 아이콘 또는 뱃지         |
| 다국어   | `is_multilingual`           | 아이콘 또는 뱃지         |
| 작성일   | `created_at`                | 포맷: YYYY-MM-DD         |
| 수정일   | `updated_at`                | 포맷: YYYY-MM-DD         |
| 액션     | 편집, 삭제                  | 버튼                     |

#### Server Action vs CSR 구분

| 작업             | 처리 위치                                  | 이유                                                               |
| ---------------- | ------------------------------------------ | ------------------------------------------------------------------ |
| 포스트 목록 조회 | Server Action                              | Supabase 통신                                                      |
| 포스트 삭제      | Server Action                              | Supabase 통신                                                      |
| 필터링/검색      | CSR (클라이언트 필터링) 또는 Server Action | 데이터 규모에 따라 결정. 초기에는 전체 로드 후 CSR 필터링으로 충분 |

#### 폴더 구조

```
features/post-management/
├── components/
│   ├── PostTable.tsx          # 포스트 목록 테이블 UI
│   ├── PostTableRow.tsx       # 개별 포스트 행
│   ├── PostFilters.tsx        # 카테고리/서브카테고리 필터 UI
│   └── DeleteConfirmDialog.tsx  # 삭제 확인 다이얼로그
├── hooks/
│   ├── usePostList.ts         # 포스트 목록 데이터 + 필터 상태
│   └── usePostDelete.ts       # 포스트 삭제 로직
├── api/
│   └── post-list-actions.ts   # Server Actions (getPosts, deletePost)
└── containers/
    └── DashboardContainer.tsx # 포스트 테이블 + 필터 + 빌드 트리거 통합
```

---

### 4-4. media

#### 기능 요구사항

| ID      | 요구사항                                | 우선순위 |
| ------- | --------------------------------------- | -------- |
| MEDIA-1 | 이미지 업로드 (단일/복수)               | P0       |
| MEDIA-2 | Pre-signed URL 생성 (Server Action)     | P0       |
| MEDIA-3 | S3 직접 PUT 업로드 (CSR)                | P0       |
| MEDIA-4 | 파일 유효성 검사 (형식, 크기)           | P0       |
| MEDIA-5 | 업로드 진행률 표시                      | P1       |
| MEDIA-6 | 업로드 완료 후 에디터에 이미지 URL 삽입 | P0       |
| MEDIA-7 | 썸네일 업로드 (메타 폼 연동)            | P0       |

#### 미디어 업로드 파이프라인

```
[브라우저]                    [Server Action]                [AWS S3]
    │                              │                           │
    ├─ 파일 선택 ─────────────────>│                           │
    │                              │                           │
    │  1. 파일 메타 전달           │                           │
    │     (name, type, size)       │                           │
    │                              │                           │
    │<── 2. Pre-signed URL 반환 ───┤                           │
    │     (PUT URL, 만료시간)      │  generatePresignedUrl()   │
    │                              │  ├─ UUID 파일명 생성      │
    │                              │  ├─ 형식/크기 검증        │
    │                              │  └─ PutObjectCommand      │
    │                              │                           │
    ├─ 3. S3 직접 PUT ────────────────────────────────────────>│
    │     (Pre-signed URL로)       │                           │
    │                              │                           │
    │<─ 4. 업로드 완료 (200) ──────────────────────────────────┤
    │                              │                           │
    ├─ 5. CDN URL 조합             │                           │
    │     https://media.eunminlog.site/{key}                   │
    │                              │                           │
    └─ 6. 에디터에 이미지 삽입     │                           │
```

#### 파일 유효성 규칙

| 항목      | 제한                                                  |
| --------- | ----------------------------------------------------- |
| 허용 형식 | `image/jpeg`, `image/png`, `image/webp`, `image/avif` |
| 최대 크기 | 10MB                                                  |
| 파일명    | UUID v4로 대체 (원본 파일명 사용 안 함)               |
| 키 구조   | `posts/{YYYY}/{MM}/{uuid}.{ext}`                      |

#### CDN URL

업로드 완료 후 이미지 접근 URL:

```
https://media.eunminlog.site/posts/{YYYY}/{MM}/{uuid}.{ext}
```

#### Server Action vs CSR 구분

| 작업                          | 처리 위치     | 이유                                                          |
| ----------------------------- | ------------- | ------------------------------------------------------------- |
| 파일 선택 UI                  | CSR           | 브라우저 File API                                             |
| 파일 유효성 검사 (클라이언트) | CSR           | 빠른 피드백 (서버 요청 전 차단)                               |
| Pre-signed URL 생성           | Server Action | AWS 자격 증명 보호 (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY) |
| S3 PUT 업로드                 | CSR           | Pre-signed URL로 브라우저에서 직접 업로드                     |
| CDN URL 조합                  | CSR           | 정적 도메인 + 키 조합                                         |

#### 폴더 구조

```
features/media/
├── components/
│   ├── ImageUploader.tsx      # 파일 선택 + 드래그 앤 드롭 UI
│   └── UploadProgress.tsx     # 업로드 진행률 표시
├── hooks/
│   └── useImageUpload.ts      # 업로드 로직 (검증 → Pre-signed URL → S3 PUT → URL 반환)
├── api/
│   └── media-actions.ts       # Server Action (generatePresignedUrl)
└── constants/
    └── media.ts               # 허용 형식, 최대 크기, CDN 도메인 상수
```

---

### 4-5. translation

#### 기능 요구사항

| ID   | 요구사항                                                         | 우선순위 |
| ---- | ---------------------------------------------------------------- | -------- |
| TR-1 | GPT-5 Nano 번역 호출 (Server Action에서 언어별 병렬 호출)        | P0       |
| TR-2 | 번역 대상 locale 7개: en, ja, zh-CN, zh-TW, id, vi, th           | P0       |
| TR-3 | 번역 대상 필드: title, description, content, place_name, address | P0       |
| TR-4 | 번역 진행 상태 표시 (locale별 진행/완료/실패)                    | P0       |
| TR-5 | 번역 결과 `post_translations` 테이블에 저장                      | P0       |
| TR-6 | `is_multilingual === false`이면 번역 스킵                        | P0       |
| TR-7 | 번역 재시도 (실패 시)                                            | P1       |
| TR-8 | 개별 locale 번역 실행 (선택적 재번역)                            | P2       |

#### GPT 번역 Flow (Server Action)

```
[브라우저]                    [Server Action]                    [OpenAI API]
    │                              │                                  │
    ├─ 1. "번역본 생성하기" 클릭   │                                  │
    │     (고유명사 확인 완료)     │                                  │
    │                              │                                  │
    ├─ translatePost() 호출 ──────>│                                  │
    │                              ├─ 2. Promise.allSettled()         │
    │                              │     7개 locale 병렬 번역 요청 ──>│
    │                              │     model: gpt-5-nano            │
    │                              │     response_format: json_object │
    │                              │                                  │
    │                              │<── 3. 번역 결과 수신 ────────────┤
    │                              │     (locale별 성공/실패 분리)    │
    │                              │                                  │
    │<── 4. TranslationResult[] ───┤                                  │
    │     (성공 locale + 실패 locale)                                 │
    │                              │                                  │
    ├─ 5. 번역 상태 UI 업데이트    │                                  │
    │     ├─ 성공: 미리보기 Sheet  │                                  │
    │     └─ 실패: toast 알림 +    │                                  │
    │          "다시 시도" 버튼    │                                  │
    │                              │                                  │
    ├─ 6. (실패 locale 재시도)     │                                  │
    │     retrySingleLocale() ────>│── 단일 locale 재번역 ──────────>│
    │                              │                                  │
    └─ 7. post_translations upsert ────────> [Server Action → Supabase] (미구현)
```

#### 번역 API 호출 전략

- **호출 위치**: Server Action에서 OpenAI SDK (`openai` npm 패키지) 사용. 공유 클라이언트: `shared/lib/openai.ts`.
- **모델**: GPT-5 Nano (`gpt-5-nano`). 번역+요약+용어 추출 모두 사용.
- **모델 제약**: `temperature` 파라미터 미지원 (기본값 1만 사용).
- **응답 포맷**: `response_format: { type: 'json_object' }` 사용으로 JSON 파싱 안정성 확보.
- **API Key 보안**: `OPENAI_API_KEY` 환경 변수 (서버 전용, `NEXT_PUBLIC_` prefix 불필요). Server Action에서만 접근하므로 클라이언트 노출 없음.
- **병렬 처리**: 7개 locale 번역을 `Promise.allSettled()`로 병렬 실행. 개별 locale 실패가 전체를 중단시키지 않음 (`TranslationResult.failed?: boolean`).
- **번역 대상 필드**: title, description(3줄 요약), content, place_name, address. 주소(address)는 locale별 표기 방식 적용 (일본식, 중국식, 영어권 역순 등).
- **번역 저장**: 번역 결과를 Server Action으로 `post_translations` 테이블에 upsert 예정 (미구현).

#### 번역 프롬프트 전략

> **상세 프롬프트 설계서**: [`docs/gpt-prompts.md`](gpt-prompts.md) — 요약 생성, 용어 추출, 본문 번역 3가지 프롬프트의 시스템/유저 메시지, 응답 포맷, 제약 조건을 정의.

```
System: You are a professional translator. Translate the following blog post content
from Korean to {target_language}. Maintain the original HTML formatting and structure.
Do not translate proper nouns (restaurant names, place names, brand names).
Return a JSON object with keys: title, description, content.

User: {title}\n---\n{description}\n---\n{content}\n---\nplace_name: {place_name}\naddress: {address}
```

- 응답 포맷: JSON (`{ title, description, content, place_name, address }`)
- `response_format: { type: "json_object" }` 사용으로 JSON 파싱 안정성 확보.

#### Server Action vs CSR 구분

| 작업                                      | 처리 위치     | 이유                           |
| ----------------------------------------- | ------------- | ------------------------------ |
| GPT API 호출 (GPT-5 Nano)                 | Server Action | API Key 보호, 언어별 병렬 처리 |
| 번역 결과 저장 (post_translations upsert) | Server Action | Supabase Service Role Key 보호 |
| 번역 상태 UI                              | CSR           | 실시간 상태 업데이트           |

#### 폴더 구조

```
features/translation/
├── components/
│   ├── TranslationPreviewSheet.tsx  # ✅ 번역 결과 미리보기 Sheet
│   ├── TermReviewList.tsx           # ✅ 고유명사 검토 리스트
│   └── TermReviewItem.tsx           # ✅ 고유명사 검토 아이템
├── containers/
│   └── TranslationSheetContainer.tsx # ✅ 고유명사 추출 → 번역 실행 통합 컨테이너
├── api/
│   └── actions.ts                   # ✅ Server Actions (extractFlaggedTerms, translatePost, retrySingleLocale)
├── types/
│   └── index.ts                     # ✅ FlaggedTerm, TranslationResult (failed?: boolean) 타입
└── constants/
    └── locale.ts                    # ✅ 번역 대상 locale 설정
```

> **현재 구현 상태**: GPT-5 Nano API 실제 연동 완료 (mock 제거). 고유명사 추출 + 번역 실행 + 미리보기 Sheet + 실패 fallback + locale별 재시도까지 구현 완료. 번역 결과 DB 저장(post_translations UPSERT)은 미구현. 에디터 페이지(`/posts/new`)에서 직접 연동하여 사용.

#### 번역 Sheet UX (구현 완료)

**TranslationSheetContainer (고유명사 검토 + 번역 실행)**:

- 상태 흐름: `reviewing` → `translating` → `success` / `error`
- `success` 시 0.8초 후 `onTranslationComplete` 콜백 호출 + Sheet 자동 닫힘
- Sheet 닫은 후 "용어 검토 계속하기" 버튼으로 Sheet 재오픈 가능
- `error` 시 "다시 시도" 버튼 표시
- Sheet가 닫힐 때 상태 초기화 (`reviewing`, confirmedTerms 리셋)

**TranslationPreviewSheet (번역 결과 확인)**:

- 언어 필터 탭: 한국어 | 영어 | 일본어 | 중국어 | 대만어 | 인도네시아어 | 베트남어 | 태국어 (8개)
- 기본 선택값: 영어 (`en`)
- 한국어 탭: 원문 (title, place_name, address, content) 표시
- 다국어 탭: 번역 결과 (title, place_name, address, content) 표시
- 번역 데이터 없는 locale: "번역 데이터가 없습니다." 표시
- 실패 locale: "다시 시도" 버튼 표시 (`onRetryLocale` 콜백 → `retrySingleLocale` Server Action)
- UI 스타일: Sheet title `text-lg`, description `text-base`, 필터 탭 `text-sm`, 필드 label `text-sm font-semibold text-muted-foreground`, 제목 `text-lg font-bold`, 본문 `prose prose-sm`
- Sheet 너비: `w-full sm:max-w-[688px]`

**GPT API 실패 fallback 처리**:

- 요약 생성 실패: `toast.error` 알림 (sonner)
- 용어 추출 실패: `toast.error` 알림 + "번역본 재생성하기" 버튼 텍스트로 변경
- 번역 실패 (locale별): 실패 locale별 `toast.error` 알림 + TranslationPreviewSheet에서 "다시 시도" 버튼 표시
- `retrySingleLocale` Server Action: 단일 locale만 재번역 실행
- `TranslationResult.failed?: boolean`: 부분 성공 허용 (일부 locale 실패해도 성공한 locale 결과는 유지)

**번역 버튼 활성화 조건**:

| 버튼               | 표시 조건                                                        | 비활성화 조건                                                                             |
| ------------------ | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| 번역본 생성하기    | `needsTranslation && !isTranslated && flaggedTerms.length === 0` | `isExtracting` (로딩 중에만). 필수 필드 미입력 시 클릭하면 Zod 검증 → focus + 에러 메시지 |
| 용어 검토 계속하기 | `needsTranslation && !isTranslated && flaggedTerms.length > 0`   | (항상 활성화)                                                                             |
| 번역본 확인하기    | `isTranslated`                                                   | (항상 활성화)                                                                             |

---

### 4-6. build-trigger

#### 기능 요구사항

| ID   | 요구사항                                       | 우선순위 |
| ---- | ---------------------------------------------- | -------- |
| BT-1 | GitHub Actions `workflow_dispatch` API 호출    | P0       |
| BT-2 | 빌드 트리거 버튼 (대시보드, 에디터 저장 후)    | P0       |
| BT-3 | 빌드 대상 환경 선택 (production / development) | P1       |
| BT-4 | 트리거 결과 표시 (성공/실패)                   | P0       |
| BT-5 | 빌드 상태 조회 (GitHub Actions Run 상태)       | P2       |

#### 빌드 트리거 Flow

```
[브라우저]              [Server Action]              [GitHub API]
    │                        │                           │
    ├─ 빌드 트리거 클릭 ───>│                           │
    │                        │                           │
    │                        ├─ POST /repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches
    │                        │  ├─ ref: main 또는 develop │
    │                        │  └─ Authorization: Bearer {GITHUB_TOKEN}
    │                        │                           │
    │<── 트리거 결과 ────────┤                           │
    │    (204 No Content = 성공)                         │
    │                                                    │
    └─ UI 상태 업데이트                                  │
```

#### GitHub API 설정

| 항목         | 값                                                                                       |
| ------------ | ---------------------------------------------------------------------------------------- |
| API Endpoint | `https://api.github.com/repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches` |
| Method       | POST                                                                                     |
| Auth         | `Authorization: Bearer {GITHUB_TOKEN}`                                                   |
| Body         | `{ "ref": "main" }` 또는 `{ "ref": "develop" }`                                          |
| 성공 응답    | 204 No Content                                                                           |

- `GITHUB_TOKEN`은 Server Action에서만 접근. 환경 변수로 관리. (`GITHUB_TOKEN` -- workflow dispatch 권한이 있는 Personal Access Token 또는 Fine-grained Token)

#### Server Action vs CSR 구분

| 작업                          | 처리 위치     | 이유              |
| ----------------------------- | ------------- | ----------------- |
| 빌드 트리거 (GitHub API 호출) | Server Action | GitHub Token 보호 |
| 빌드 상태 조회                | Server Action | GitHub Token 보호 |
| 트리거 버튼 UI                | CSR           | UI 인터랙션       |

#### 폴더 구조

```
features/build-trigger/
├── components/
│   └── BuildTriggerButton.tsx  # 빌드 트리거 버튼 (환경 선택 포함)
├── hooks/
│   └── useBuildTrigger.ts      # 트리거 호출 + 상태 관리
└── api/
    └── build-actions.ts        # Server Action (triggerBuild, getBuildStatus)
```

---

### 4-7. category-management

#### 기능 요구사항

| ID   | 요구사항                                                          | 우선순위 | 상태                      |
| ---- | ----------------------------------------------------------------- | -------- | ------------------------- |
| CM-1 | 카테고리 목록 테이블 (대분류-소분류 그룹 구조)                    | P0       | 구현 완료 (mock)          |
| CM-2 | 검색 필터 (카테고리명 검색 -- SearchFilter.Query만 사용)          | P1       | 구현 완료                 |
| CM-3 | 새 카테고리 생성 버튼 + 생성 페이지                               | P1       | 구현 완료 (저장 미연동)   |
| CM-4 | 다국어 지원 여부 표시                                             | P2       | 구현 완료                 |
| CM-5 | 카테고리 수정 페이지 (대분류/소분류 모두)                         | P0       | 미구현                    |
| CM-6 | 수정 진입점 -- 테이블 카테고리명 하이퍼링크                       | P0       | 미구현                    |
| CM-7 | slug 변경 경고 모달                                               | P0       | 미구현                    |
| CM-8 | 카테고리명만 변경 확인 모달                                       | P0       | 미구현                    |
| CM-9 | 다국어 지원 체크박스 수정 불가 (disabled)                          | P0       | 미구현                    |
| CM-10 | 생성 페이지 다국어 체크박스 클릭 시 경고 토스트                   | P1       | 미구현                    |

#### 카테고리 목록 페이지 (`/categories`) -- 구현 완료

- **라우팅**: 사이드바 "카테고리 생성/수정/삭제" → `/categories`
- **파일**: `apps/admin/src/app/categories/page.tsx`
- **데이터**: mock 데이터 기반 (DB 미연동). 기존 상수 `CATEGORY_OPTIONS`, `SUB_CATEGORY_MAP` (`features/post-editor/constants/category.ts`) 활용
- **pageSize**: 100 고정 → 페이지네이션 불필요

#### 필터 영역

- SearchFilter 컴파운드 컴포넌트 사용 (Section 5-4 참조)
- 카테고리 페이지는 **검색어만** 표시 (기간 필터 제외)

```tsx
<SearchFilter onSearch={...}>
  <SearchFilter.Query register={...} placeholder="카테고리명 검색" />
</SearchFilter>
```

#### 테이블 구조

대분류-소분류 그룹 구조로 표시한다. 대분류 행 아래에 해당 소분류 행들이 이어서 나타난다.

| 컬럼              | 대분류 행                          | 소분류 행                          | 비고           |
| ----------------- | ---------------------------------- | ---------------------------------- | -------------- |
| 대분류 카테고리명 | 대분류명 표시 **(하이퍼링크)**     | 비워둠                             | 그룹 헤더 역할 |
| 소분류 카테고리명 | 비워둠                             | 소분류명 표시 **(하이퍼링크)**     |                |
| 포함된 글         | 비워둠 (또는 합계)                 | 해당 소분류 포함 글 수             | mock 데이터    |
| 다국어 지원 여부  | 비워둠                             | 다국어 지원 여부 표시              | mock 데이터    |
| 생성일            | 비워둠                             | 생성일 (YYYY-MM-DD)                | mock 데이터    |

**수정 진입점 (CM-6):**

- 대분류 카테고리명, 소분류 카테고리명을 `<Link>` 태그로 감싸고 하이퍼링크 스타일 적용
- 스타일: `text-blue-600 underline` (파란색 글자 + 파란색 밑줄)
- 클릭 시 `/categories/{id}/edit`로 이동

**표시 예시**:

```
대분류 카테고리명 | 소분류 카테고리명 | 포함된 글 | 다국어 | 생성일
─────────────────────────────────────────────────────────────────
맛집 (링크)      |                   |    28     |        | 2026-01-05
                 | 한식 (링크)       | 12        | 지원   | 2026-01-10
                 | 양식 (링크)       | 8         | 지원   | 2026-01-10
                 | 일식 (링크)       | 5         | 지원   | 2026-01-10
                 | 주점 (링크)       | 3         | 미지원 | 2026-01-15
```

- 정렬 드롭다운 없음 (고정 순서: CATEGORY_OPTIONS / SUB_CATEGORY_MAP 정의 순)
- 좌측 버튼: `+ 새 카테고리 생성`

#### 카테고리 생성 페이지 (`/categories/new`) -- 구현 완료

- **파일**: `apps/admin/src/app/categories/new/page.tsx`
- 대분류/소분류 각각 독립된 카드 UI
- 대분류: 카테고리명 + 슬러그 생성 (SlugField)
- 소분류: 대분류 선택 + 카테고리명 + 슬러그 생성 + 다국어 지원 체크박스
- **다국어 체크박스 경고 토스트 (CM-10)**: 체크박스 클릭 시 `toast.info` 표시 -- "한 번 설정하면 현재는 변경이 불가합니다. 추후 변경 기능이 지원될 예정입니다."
- 저장 미연동 (Server Action `createCategory` 미구현)

#### 카테고리 수정 페이지 (`/categories/[id]/edit`) -- CM-5 상세

**진입점:**

- `/categories` 목록 테이블에서 카테고리 **이름**을 하이퍼링크로 표시
- 하이퍼링크 스타일: 파란색 글자 + 파란색 밑줄 (`text-blue-600 underline`)
- 클릭 시 `/categories/{id}/edit`로 이동 (`<Link href={...}>`)

**데이터 로드:**

- 페이지 진입 시 `getCategory(categoryId)` Server Action 호출
- 반환된 데이터를 폼 초기값에 세팅

**대분류 수정 시:**

- 대분류 카테고리 생성 영역 UI만 표시 (소분류 영역은 숨김)
- 서버에서 받아온 초기값(name, slug)을 각 input에 세팅
- 뒤로가기 링크: "목록으로 돌아가기" (`/categories`)
- 페이지 제목: "카테고리 수정"

**소분류 수정 시:**

- 소분류 카테고리 생성 영역 UI만 표시 (대분류 영역은 숨김)
- 서버에서 받아온 초기값(parent_id, name, slug)을 각 input에 세팅
- 대분류 선택 드롭다운: 기존 parent 값이 선택된 상태로 표시
- **다국어 지원 체크박스: `disabled` 처리** (CM-9) -- 서버에서 받아온 값 그대로 표시, 수정 불가
- 뒤로가기 링크: "목록으로 돌아가기" (`/categories`)

**수정 완료 동작:**

- "수정" 버튼 클릭 시 `updateCategory` Server Action 호출 (PUT 요청)
- slug가 변경된 경우 **(CM-7)**: 경고 모달 표시
  - 메시지: "slug 수정 시 기존 경로로 접근할 경우 리다이렉트가 발생하여 크롤러에 영향이 갑니다"
  - 확인/취소 버튼
  - 확인 시 PUT 요청 진행
- slug가 변경되지 않고 카테고리명만 변경된 경우 **(CM-8)**: 확인 모달 표시
  - 메시지: "{대분류/소분류} 카테고리를 {이전 이름}에서 → {새 이름}으로 수정하시겠습니까?"
  - 확인/취소 버튼
  - 확인 시 PUT 요청 진행
- slug와 카테고리명 모두 변경된 경우: slug 경고 모달(CM-7)만 표시 (slug 변경이 더 중요한 경고)

**UI 차이점 (생성 vs 수정):**

| 항목               | 생성 (`/categories/new`)           | 수정 (`/categories/[id]/edit`)           |
| ------------------ | ---------------------------------- | ---------------------------------------- |
| 페이지 제목        | "새 카테고리 생성"                 | "카테고리 수정"                          |
| 표시 영역          | 대분류 + 소분류 모두               | 해당 depth 영역만 (대분류 or 소분류)     |
| 초기 데이터        | 빈 폼                             | 서버에서 로드한 기존 데이터              |
| 다국어 체크박스    | 활성화 (클릭 시 토스트 경고)       | `disabled` (수정 불가)                   |
| 완료 버튼 텍스트   | "추가"                             | "수정"                                   |
| API 호출           | `createCategory`                   | `updateCategory`                         |
| 뒤로가기 링크      | "목록으로 돌아가기"                | "목록으로 돌아가기"                      |

#### 폴더 구조

```
features/category-management/
├── components/
│   ├── CategoryTable.tsx          # 카테고리 목록 그룹 테이블 UI
│   ├── CategoryTableRow.tsx       # 대분류/소분류 행
│   └── SlugWarningDialog.tsx      # slug 변경 경고 모달 (CM-7)
├── mock/
│   └── categories.ts              # mock 데이터 (CATEGORY_OPTIONS + SUB_CATEGORY_MAP 기반)
├── api/
│   └── category-actions.ts        # Server Actions (getCategory, createCategory, updateCategory)
└── containers/
    └── CategoryListContainer.tsx  # 테이블 + 검색 필터 통합 컨테이너
```

---

## 5. Shared 모듈

Feature 간 공유되는 모듈은 두 곳에 나뉜다:

- `shared/` — 프로젝트 고유 공유 컴포넌트, 라이브러리, 타입
- `components/ui/` — shadcn/ui 생성 컴포넌트 (Radix UI 기반 프리미티브)

### 5-1. 현재 구현된 구조

```
src/
├── shared/
│   ├── components/
│   │   ├── layout/
│   │   │   └── AppSidebar.tsx       # 글로벌 사이드바 (5개 nav 그룹, Collapsible)
│   │   ├── filter/
│   │   │   └── SearchFilter.tsx     # 공유 검색 필터 (컴파운드 컴포넌트: SearchFilter.DateRange + SearchFilter.Query)
│   │   └── pagination/
│   │       └── Pagination.tsx       # 공유 페이지네이션 (page, totalPages, onPageChange)
│   ├── lib/
│   │   ├── supabase.ts              # Supabase 브라우저 클라이언트 (lazy init)
│   │   ├── supabase-server.ts       # Supabase 서버 클라이언트 (Service Role Key)
│   │   └── openai.ts                # OpenAI GPT-5 Nano 클라이언트 (Server Action용)
│   └── types/
│       └── post.ts                  # Post, PostTranslation, Category, SubCategory, TranslationLocale
├── components/ui/                   # shadcn/ui 생성 컴포넌트 (아래 목록)
├── hooks/
│   └── use-mobile.ts                # shadcn 모바일 감지 hook
└── lib/
    └── utils.ts                     # shadcn cn() 유틸리티 (clsx + tailwind-merge)
```

### 5-2. 설치된 shadcn/ui 컴포넌트

`src/components/ui/` 에 위치. shadcn CLI로 생성되며 직접 수정 가능.

| 컴포넌트    | 파일            | 용도                           |
| ----------- | --------------- | ------------------------------ |
| Button      | button.tsx      | 공용 버튼                      |
| Input       | input.tsx       | 텍스트 입력                    |
| Select      | select.tsx      | 드롭다운 셀렉트                |
| Table       | table.tsx       | 데이터 테이블                  |
| Calendar    | calendar.tsx    | 날짜 선택기 (react-day-picker) |
| Popover     | popover.tsx     | 팝오버 컨테이너                |
| Sidebar     | sidebar.tsx     | 사이드바 레이아웃 시스템       |
| Collapsible | collapsible.tsx | 접이식 섹션                    |
| Separator   | separator.tsx   | 구분선                         |
| Sheet       | sheet.tsx       | 모바일 시트                    |
| Skeleton    | skeleton.tsx    | 로딩 스켈레톤                  |
| Tooltip     | tooltip.tsx     | 툴팁                           |

### 5-3. 추가 예정 공용 컴포넌트

Feature 구현 시 필요에 따라 추가:

| 컴포넌트   | 위치                                        | 용도                                          |
| ---------- | ------------------------------------------- | --------------------------------------------- |
| Pagination | shared/components/pagination/Pagination.tsx | 페이지네이션 (게시글 목록, 핵심 지표 등)      |
| Toggle     | shared/components/ui/ 또는 shadcn           | 토글 스위치 (is_sponsored, is_recommended 등) |
| Dialog     | shadcn                                      | 확인/취소 다이얼로그                          |
| Badge      | shadcn                                      | 상태 뱃지 (카테고리, 협찬, 추천)              |
| Toast      | sonner (`<Toaster />` in layout)            | 알림 토스트 (성공/에러/정보) — **설치 완료**  |

### 5-4. SearchFilter 컴파운드 컴포넌트

SearchFilter는 컴파운드 컴포넌트 패턴으로 리팩토링한다. 기간 필터와 검색어 필터를 서브 컴포넌트로 분리하여, 페이지마다 필요한 필터만 조합할 수 있도록 한다.

**리팩토링 전** (현재):

```tsx
<SearchFilter registerFrom={...} registerTo={...} registerQuery={...} onSearch={...} />
```

**리팩토링 후**:

```tsx
// 기간 + 검색어 (기존 페이지: /, /posts)
<SearchFilter onSearch={...}>
  <SearchFilter.DateRange registerFrom={...} registerTo={...} />
  <SearchFilter.Query register={...} placeholder="검색어 입력" />
</SearchFilter>

// 검색어만 (카테고리 페이지: /categories)
<SearchFilter onSearch={...}>
  <SearchFilter.Query register={...} placeholder="카테고리명 검색" />
</SearchFilter>
```

**서브 컴포넌트**:

| 서브 컴포넌트            | Props                                                | 설명                                  |
| ------------------------ | ---------------------------------------------------- | ------------------------------------- |
| `SearchFilter.DateRange` | `registerFrom`, `registerTo` (UseFormRegisterReturn) | "기간" 라벨 + date input 2개 + 화살표 |
| `SearchFilter.Query`     | `register` (UseFormRegisterReturn), `placeholder?`   | "검색어" 라벨 + text input            |

**SearchFilter 루트 컴포넌트 Props**:

| Prop       | 타입         | 설명                                                        |
| ---------- | ------------ | ----------------------------------------------------------- |
| `onSearch` | `() => void` | 검색 버튼 클릭 또는 Enter 시 호출                           |
| `children` | `ReactNode`  | SearchFilter.DateRange, SearchFilter.Query 등 서브 컴포넌트 |

검색 버튼은 SearchFilter 루트 컴포넌트가 렌더링한다 (서브 컴포넌트 아래에 위치).

### 5-5. Pagination 공유 컴포넌트

**위치**: `apps/admin/src/shared/components/pagination/Pagination.tsx`

**Props**:

| Prop           | 타입                     | 설명                  |
| -------------- | ------------------------ | --------------------- |
| `page`         | `number`                 | 현재 페이지 (1-based) |
| `totalPages`   | `number`                 | 전체 페이지 수        |
| `onPageChange` | `(page: number) => void` | 페이지 변경 콜백      |

**디자인**: `< 1 2 3 4 5 6 7 8 9 ... >` 형태

- 최대 9개 페이지 번호 동시 표시
- 9개 초과 시 `...` (ellipsis) 표시
- `...` 클릭 시 다음 그룹 첫 페이지로 이동 (예: 1~9 표시 중 `...` 클릭 → 10페이지, 이후 10~18 표시)
- `<` / `>` 버튼으로 이전/다음 페이지 이동
- 첫 페이지에서 `<` 비활성화, 마지막 페이지에서 `>` 비활성화
- URL 쿼리 파라미터 `page` 연동 (`?page=N`)

**적용 페이지**:

| 페이지            | pageSize | 페이지네이션 사용 | URL 쿼리 예시                                  |
| ----------------- | -------- | ----------------- | ---------------------------------------------- |
| `/` (핵심 지표)   | 10       | O                 | `/?page=1&from=...&to=...&q=...`               |
| `/posts` (게시글) | 10       | O                 | `/posts?page=1&from=...&to=...&q=...&sort=...` |
| `/categories`     | 100      | X (불필요)        | `/categories?q=...`                            |

---

## 6. 환경 변수

### 6-1. 공개 (클라이언트 노출)

`NEXT_PUBLIC_` prefix 필수.

| 변수명                          | 용도                   | 예시                           |
| ------------------------------- | ---------------------- | ------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase Project URL   | `https://xxx.supabase.co`      |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Anonymous Key | `eyJ...`                       |
| `NEXT_PUBLIC_MEDIA_CDN_URL`     | 미디어 CDN 도메인      | `https://media.eunminlog.site` |

### 6-2. 비공개 (서버 전용)

Server Action/API Route에서만 접근.

| 변수명                      | 용도                                  | 예시                   |
| --------------------------- | ------------------------------------- | ---------------------- |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role Key (RLS 우회)  | `eyJ...`               |
| `OPENAI_API_KEY`            | OpenAI API Key (GPT-5 Nano 번역+요약) | `sk-...`               |
| `AWS_ACCESS_KEY_ID`         | AWS 자격 증명 (S3 Pre-signed URL)     | `AKIA...`              |
| `AWS_SECRET_ACCESS_KEY`     | AWS 자격 증명                         | `wJal...`              |
| `AWS_S3_BUCKET`             | S3 버킷 이름                          | `media-eunminlog`      |
| `AWS_REGION`                | AWS 리전                              | `ap-northeast-2`       |
| `GITHUB_TOKEN`              | GitHub Personal Access Token          | `ghp_...`              |
| `GITHUB_REPO`               | GitHub 리포지토리 (owner/repo)        | `semnil5202/eunminlog` |
| `GITHUB_WORKFLOW_ID`        | GitHub Actions Workflow ID            | `deploy-client.yml`    |

> **보안 참고**: `OPENAI_API_KEY`는 Server Action에서만 사용하므로 클라이언트에 노출되지 않는다. OpenAI Dashboard에서 사용량 제한(Rate Limit)과 월 비용 상한(Usage Limit) 설정을 권장한다.

---

## 7. 전체 폴더 구조

### 7-1. 현재 구현된 구조 (Phase 1 완료 + Tiptap 에디터 + 폼 형식 + 번역)

```
apps/admin/
├── scripts/
│   ├── start-local-server.cjs       # HTTPS dev 서버 (mkcert)
│   └── setup-local-https.sh         # mkcert 초기 설정 스크립트
└── src/
    ├── app/                         # Next.js App Router (flat 구조)
    │   ├── layout.tsx               # RootLayout (SidebarLayout 래핑)
    │   ├── sidebar-layout.tsx       # 'use client' — SidebarProvider + AppSidebar
    │   ├── page.tsx                 # / — 핵심 지표 (MetricsPage)
    │   ├── globals.css              # Tailwind + shadcn + 테마 import + ProseMirror CSS
    │   ├── posts/
    │   │   ├── page.tsx             # /posts — 게시글 목록 (SearchFilter + 테이블 + 정렬 + 페이지네이션)
    │   │   ├── new/
    │   │   │   └── page.tsx         # /posts/new — 포스트 생성 (폼 형식 + 메타 폼 + 에디터 + 번역)
    │   │   └── [id]/
    │   │       └── edit/
    │   │           └── page.tsx     # /posts/[id]/edit — 포스트 편집 (placeholder)
    │   └── categories/
    │       ├── page.tsx             # /categories — 카테고리 관리 (검색 + 그룹 테이블)
    │       ├── new/
    │       │   └── page.tsx         # /categories/new — 카테고리 생성 (대분류/소분류)
    │       └── [id]/
    │           └── edit/
    │               └── page.tsx     # /categories/[id]/edit — 카테고리 수정
    ├── features/
    │   ├── post-editor/             # Tiptap 에디터 + 포스트 폼 feature
    │   │   ├── configs/
    │   │   │   ├── tiptap-extensions.ts
    │   │   │   ├── image.ts
    │   │   │   └── image-carousel.ts
    │   │   ├── components/
    │   │   │   ├── TiptapEditor.tsx
    │   │   │   ├── TiptapEditorSkeleton.tsx
    │   │   │   ├── Toolbar.tsx
    │   │   │   ├── CategorySelector.tsx    # 카테고리/서브카테고리 select
    │   │   │   ├── ThumbnailUpload.tsx     # 썸네일 업로드 (WebP 변환)
    │   │   │   ├── VisitFields.tsx         # 체험 방문 전용 필드 (장소/주소/가격대)
    │   │   │   ├── icons/           # 13 SVG icons + index.ts
    │   │   │   └── toolbars/        # FontStyles, TiptapLink, List, TextAlign, UploadImage, History, VerticalDivider + types.ts + index.ts
    │   │   ├── hooks/
    │   │   │   └── useTiptapEditor.ts
    │   │   ├── lib/
    │   │   │   └── image.ts         # toWebP() 이미지 변환
    │   │   ├── api/
    │   │   │   └── actions.ts       # Server Actions (generateSummary)
    │   │   ├── containers/
    │   │   │   └── TiptapEditorContainer.tsx
    │   │   └── constants/
    │   │       └── category.ts      # FORM_TYPE_OPTIONS, CATEGORY_OPTIONS, SUB_CATEGORY_MAP
    │   ├── category-management/      # 카테고리 관리 feature
    │   │   ├── components/
    │   │   │   ├── CategoryTable.tsx          # 카테고리 그룹 테이블 UI
    │   │   │   ├── CategoryTableRow.tsx       # 대분류/소분류 행
    │   │   │   └── SlugWarningDialog.tsx      # slug 변경 경고 모달
    │   │   ├── mock/
    │   │   │   └── categories.ts              # mock 데이터
    │   │   ├── api/
    │   │   │   └── category-actions.ts        # Server Actions (getCategory, createCategory, updateCategory)
    │   │   └── containers/
    │   │       └── CategoryListContainer.tsx  # 테이블 + 검색 필터 통합
    │   └── translation/             # 번역 feature (부분 구현)
    │       ├── components/
    │       │   ├── TranslationPreviewSheet.tsx  # 번역 결과 미리보기 Sheet
    │       │   ├── TermReviewList.tsx           # 고유명사 검토 리스트
    │       │   └── TermReviewItem.tsx           # 고유명사 검토 아이템
    │       ├── containers/
    │       │   └── TranslationSheetContainer.tsx # 고유명사 추출 → 번역 실행 통합 컨테이너
    │       ├── api/
    │       │   └── actions.ts       # Server Actions (extractFlaggedTerms, translatePost)
    │       ├── types/
    │       │   └── index.ts         # FlaggedTerm, TranslationResult 타입
    │       └── constants/
    │           └── locale.ts        # 번역 대상 locale 설정
    ├── components/ui/               # shadcn/ui 생성 컴포넌트
    │   ├── button.tsx
    │   ├── calendar.tsx
    │   ├── collapsible.tsx
    │   ├── input.tsx
    │   ├── popover.tsx
    │   ├── select.tsx
    │   ├── separator.tsx
    │   ├── sheet.tsx
    │   ├── sidebar.tsx
    │   ├── skeleton.tsx
    │   ├── table.tsx
    │   └── tooltip.tsx
    ├── hooks/
    │   └── use-mobile.ts            # shadcn 모바일 감지 hook
    ├── lib/
    │   └── utils.ts                 # shadcn cn() 유틸리티
    └── shared/
        ├── components/
        │   ├── layout/
        │   │   └── AppSidebar.tsx   # 글로벌 사이드바
        │   ├── filter/
        │   │   └── SearchFilter.tsx # 공유 검색 필터 (컴파운드 컴포넌트)
        │   └── pagination/
        │       └── Pagination.tsx   # 공유 페이지네이션
        ├── lib/
        │   ├── supabase.ts          # Supabase 브라우저 클라이언트
        │   ├── supabase-server.ts   # Supabase 서버 클라이언트
        │   └── openai.ts            # OpenAI GPT-5 Nano 클라이언트 (Server Action용)
        └── types/
            └── post.ts              # Post, PostTranslation, PostFormType 타입
```

### 7-2. 계획된 Feature 구조 (Phase 2 이후)

Feature 구현 시 아래 구조로 확장:

```
src/features/
├── auth/
│   ├── components/
│   │   └── LoginForm.tsx
│   ├── hooks/
│   │   └── useAuth.ts
│   └── containers/
│       └── LoginContainer.tsx
├── post-editor/
│   ├── components/
│   │   ├── TiptapEditor.tsx
│   │   ├── EditorToolbar.tsx
│   │   ├── PostMetaForm.tsx
│   │   └── ImageUploadButton.tsx
│   ├── hooks/
│   │   ├── usePostEditor.ts
│   │   └── usePostSave.ts
│   ├── api/
│   │   └── post-actions.ts
│   ├── containers/
│   │   └── PostEditorContainer.tsx
│   └── constants/
│       └── categories.ts
├── post-management/
│   ├── components/
│   │   ├── PostTable.tsx
│   │   ├── PostTableRow.tsx
│   │   ├── PostFilters.tsx
│   │   └── DeleteConfirmDialog.tsx
│   ├── hooks/
│   │   ├── usePostList.ts
│   │   └── usePostDelete.ts
│   ├── api/
│   │   └── post-list-actions.ts
│   └── containers/
│       └── DashboardContainer.tsx
├── media/
│   ├── components/
│   │   ├── ImageUploader.tsx
│   │   └── UploadProgress.tsx
│   ├── hooks/
│   │   └── useImageUpload.ts
│   ├── api/
│   │   └── media-actions.ts
│   └── constants/
│       └── media.ts
├── translation/
│   ├── components/
│   │   └── TranslationStatus.tsx
│   ├── hooks/
│   │   └── useTranslation.ts
│   ├── api/
│   │   └── translation-actions.ts
│   └── constants/
│       └── locales.ts
└── build-trigger/
    ├── components/
    │   └── BuildTriggerButton.tsx
    ├── hooks/
    │   └── useBuildTrigger.ts
    └── api/
        └── build-actions.ts
```

---

## 8. 의존성 패키지

`apps/admin/package.json` 기준. 설치 완료된 패키지.

| 패키지                          | 용도                                        | 상태      |
| ------------------------------- | ------------------------------------------- | --------- |
| `@supabase/supabase-js`         | Supabase 클라이언트 (Auth + DB)             | 설치 완료 |
| `@tiptap/core`                  | Tiptap 코어 (Extension 커스텀에 필요)       | 설치 완료 |
| `@tiptap/react`                 | Tiptap React 통합                           | 설치 완료 |
| `@tiptap/starter-kit`           | Tiptap 기본 Extension 번들                  | 설치 완료 |
| `@tiptap/extension-bullet-list` | BulletList Extension (커스텀 스타일 적용)   | 설치 완료 |
| `@tiptap/extension-heading`     | Heading Extension (h2-h6, 인라인 스타일)    | 설치 완료 |
| `@tiptap/extension-link`        | 링크 Extension                              | 설치 완료 |
| `@tiptap/extension-underline`   | Underline Extension                         | 설치 완료 |
| `@tiptap/extension-image`       | 이미지 Extension (미사용, 향후 media 연동)  | 설치 완료 |
| `@tiptap/extension-placeholder` | Placeholder Extension (미사용, 향후 적용)   | 설치 완료 |
| `@tiptap/extension-text-align`  | TextAlign Extension (좌/중/우/양쪽 정렬)    | 설치 완료 |
| `@tiptap/pm`                    | ProseMirror 코어 (peer dependency)          | 설치 완료 |
| `@aws-sdk/client-s3`            | S3 Pre-signed URL 생성 (Server Action)      | 설치 완료 |
| `@aws-sdk/s3-request-presigner` | Pre-signed URL 유틸리티                     | 설치 완료 |
| `shadcn`                        | shadcn/ui CLI + 컴포넌트 런타임             | 설치 완료 |
| `radix-ui`                      | Radix UI 프리미티브 (shadcn 의존)           | 설치 완료 |
| `class-variance-authority`      | 컴포넌트 variant 유틸리티 (shadcn)          | 설치 완료 |
| `clsx` + `tailwind-merge`       | 조건부 클래스 + Tailwind 충돌 해결 (shadcn) | 설치 완료 |
| `lucide-react`                  | 아이콘 라이브러리                           | 설치 완료 |
| `date-fns`                      | 날짜 유틸리티 (Calendar 컴포넌트)           | 설치 완료 |
| `react-day-picker`              | 달력 UI (shadcn Calendar)                   | 설치 완료 |
| `tw-animate-css`                | Tailwind 애니메이션 (shadcn)                | 설치 완료 |
| `openai`                        | OpenAI SDK (GPT-5 Nano API 호출)            | 설치 완료 |
| `sonner`                        | 토스트 알림 라이브러리                      | 설치 완료 |
| `react-hook-form`               | 폼 상태 관리                                | 설치 완료 |
| `@hookform/resolvers`           | react-hook-form + Zod 연동                  | 설치 완료 |
| `zod`                           | 폼 검증 스키마                              | 설치 완료 |

---

## 9. 데이터 Flow 요약

### 9-1. 포스트 생성 전체 Flow

```
1. [로그인] → Supabase Auth 세션 획득

2. [에디터] → Tiptap으로 본문 작성 + 메타 입력
     ├─ 이미지 삽입 시: media feature 호출
     │    ├─ Server Action: Pre-signed URL 생성
     │    ├─ CSR: S3 PUT 업로드
     │    └─ CDN URL을 에디터에 삽입
     └─ is_multilingual 토글 설정

3. [저장] → Server Action: posts 테이블 INSERT
     └─ 성공 시 post ID 반환

4. [번역] → is_multilingual === true인 경우
     ├─ Server Action: GPT-5 Nano API 호출 (7개 locale 병렬, Promise.allSettled)
     ├─ Server Action: post_translations UPSERT (locale별) — 미구현
     └─ 번역 상태 UI 업데이트 (성공/실패 locale 분리, 실패 시 재시도)

5. [빌드 트리거] → (선택적)
     ├─ Server Action: GitHub API workflow_dispatch
     └─ 트리거 결과 표시

6. [Client 반영] → GitHub Actions가 Astro SSG 빌드 → S3 배포 → CloudFront 무효화
```

### 9-2. 포스트 편집 Flow

```
1. [대시보드] → 포스트 목록에서 편집 클릭

2. [데이터 로드] → Server Action: posts 테이블에서 해당 포스트 조회
     └─ 에디터에 기존 데이터 반영 (content, meta)

3. [편집] → 에디터에서 수정

4. [저장] → Server Action: posts 테이블 UPDATE
     └─ updated_at 자동 갱신

5. [번역] → is_multilingual === true이고 content/title/description 변경 시
     ├─ 기존 번역 덮어쓰기 (UPSERT)
     └─ 또는 개별 locale 재번역 (선택적)

6. [빌드 트리거] → (선택적)
```

---

## 10. 구현 순서

| Phase | Feature             | 작업                                                                                                 | 우선순위 | 상태                                                             |
| ----- | ------------------- | ---------------------------------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------- |
| 1     | shared + infra      | Supabase 클라이언트, 타입 정의, HTTPS 로컬 dev 서버, 사이드바, 핵심 지표 페이지 (mock), SearchFilter | P0       | **완료**                                                         |
| 2     | auth                | 로그인/로그아웃, 인증 가드                                                                           | P0       | 미착수                                                           |
| 3     | post-editor         | Tiptap 에디터, 폼 형식, 메타 폼, 썸네일, 카테고리, 체험방문 필드, 3줄 요약, 포스트 저장(생성)        | P0       | **에디터 + 폼 형식 + 메타 폼 구현 완료** (저장/S3 업로드 미구현) |
| 3-1   | translation         | 고유명사 추출, GPT-5 Nano 번역 실행 (병렬), 미리보기 Sheet, 실패 fallback, locale 재시도             | P0       | **구현 완료** (DB 저장 미연동)                                   |
| 4     | media               | Pre-signed URL, S3 업로드, 에디터 이미지 삽입                                                        | P0       | 미착수                                                           |
| 5     | post-management     | 게시글 목록, 삭제                                                                                    | P0       | **목록 구현 완료** (삭제 미구현)                                 |
| 5-1   | shared (리팩토링)   | SearchFilter 컴파운드 컴포넌트 리팩토링 + Pagination 공유 컴포넌트 구현                              | P0       | 미착수                                                           |
| 5-2   | category-management | 카테고리 관리 페이지 (`/categories`) — 검색 + 그룹 테이블 (mock 데이터)                              | P1       | 미착수                                                           |
| 5-3   | post-management     | `/posts` + `/` 페이지에 Pagination 적용 (pageSize 10, URL `page` 쿼리 연동)                          | P0       | 미착수                                                           |
| 6     | post-editor         | 포스트 편집 (기존 데이터 로드 + 수정)                                                                | P0       | 미착수                                                           |
| 7     | translation (완성)  | 번역 결과 DB 저장 (post_translations UPSERT)                                                         | P0       | 미착수                                                           |
| 8     | build-trigger       | GitHub Actions 트리거, 환경 선택                                                                     | P1       | 미착수                                                           |
| 9     | post-editor         | 이미지 순서 변경, rating 입력                                                                        | P1       | 미착수                                                           |
| 10    | post-management     | 필터링, 검색                                                                                         | P2       | 미착수                                                           |
| 11    | metrics             | GA4 API 연동 (mock → 실제 데이터)                                                                    | P2       | 미착수                                                           |

---

## 11. DB 스키마 업데이트 필요 사항

### 11-1. `content` 컬럼 포맷 변경

| 항목                        | Before       | After                |
| --------------------------- | ------------ | -------------------- |
| `posts.content`             | MDX/Markdown | HTML (Tiptap 출력)   |
| `post_translations.content` | MDX/Markdown | HTML (GPT 번역 결과) |

Tiptap 에디터 도입에 따라 `content` 컬럼에 저장되는 포맷이 HTML로 변경된다. Client(Astro)에서 HTML을 직접 렌더링하므로 별도의 Markdown → HTML 변환이 불필요해진다.

> **완료**: `docs/database.md`의 `content` 컬럼 설명이 "본문 (HTML -- Tiptap 에디터 출력)"으로 업데이트됨.

### 11-2. `posts` 테이블 가격 필드 변경

| 항목                 | Before             | After                                      |
| -------------------- | ------------------ | ------------------------------------------ |
| `posts.price_min`    | integer (nullable) | **삭제** — `price_prefix` + `price`로 대체 |
| `posts.price_max`    | integer (nullable) | **삭제** — `price_prefix` + `price`로 대체 |
| `posts.price_prefix` | (없음)             | text (nullable) — 가격 접두어              |
| `posts.price`        | (없음)             | integer (nullable) — 가격 (원 단위)        |

가격 표시 형식: `${price_prefix}${price.toLocaleString()}원` (예: "메인메뉴 평균: 15,000원")

> **완료**: `docs/database.md`에 `price_prefix`, `price` 컬럼 반영됨. Supabase ALTER 실행은 미완료.

**마이그레이션 SQL** (Supabase 콘솔에서 실행):

```sql
ALTER TABLE posts ADD COLUMN price_prefix text;
ALTER TABLE posts ADD COLUMN price integer;
-- 기존 price_min/price_max 데이터가 있다면 마이그레이션 후:
ALTER TABLE posts DROP COLUMN price_min;
ALTER TABLE posts DROP COLUMN price_max;
```

### 11-3. `post_translations` 테이블 장소 번역 컬럼 추가

| 항목                           | 변경                                 |
| ------------------------------ | ------------------------------------ |
| `post_translations.place_name` | text (nullable) — 번역된 장소명 추가 |
| `post_translations.address`    | text (nullable) — 번역된 주소 추가   |

> **완료**: `docs/database.md`에 반영됨. Supabase ALTER 실행은 미완료.
> **상세 스펙**: [`docs/place-i18n-specs.md`](place-i18n-specs.md)

**마이그레이션 SQL**:

```sql
ALTER TABLE post_translations ADD COLUMN place_name text;
ALTER TABLE post_translations ADD COLUMN address text;
```

---

## 12. 보안 체크리스트

- [ ] Supabase RLS(Row Level Security) 정책 설정 -- 인증된 사용자만 posts/post_translations CRUD 가능
- [ ] OpenAI API Key에 사용량 제한(Rate Limit) 및 월 비용 상한(Usage Limit) 설정
- [ ] AWS IAM 정책 -- Pre-signed URL 생성용 최소 권한 원칙 (PutObject only on media-eunminlog bucket)
- [ ] GitHub Token -- workflow dispatch 최소 권한 (Fine-grained Token 권장)
- [x] OpenAI API Key 클라이언트 노출 문제 해소 — Server Action에서만 호출하므로 `OPENAI_API_KEY` (서버 전용)
- [ ] Admin 앱 Vercel 배포 시 접근 제한 (Vercel Authentication 또는 Supabase Auth로 충분)
