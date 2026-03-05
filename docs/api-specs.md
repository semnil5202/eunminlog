# Admin API Specs

Admin 앱에서 필요한 API 엔드포인트 목록. Server Action 기반으로 구현하며, Supabase service role 키를 사용한다.

## 1. 인증 (Phase 2)

Supabase Auth 클라이언트 SDK 사용 (Server Action 아님).

| 기능 | 메서드 | 비고 |
|------|--------|------|
| 로그인 | `supabase.auth.signInWithPassword()` | email/password |
| 로그아웃 | `supabase.auth.signOut()` | |
| 세션 확인 | `supabase.auth.getSession()` | 앱 로드 시 |

---

## 2. 게시글 CRUD (Phase 3~4)

### 2.1 게시글 생성 — `createPost`

**Type:** Server Action

**Input:**
```typescript
{
  title: string;
  description: string;
  slug: string;                              // unique
  category: Category;
  sub_category: SubCategory;
  content: string;                           // Tiptap HTML
  thumbnail: string;                         // S3 CDN URL
  is_sponsored?: boolean;                    // default: false
  is_recommended?: boolean;                  // default: false
  is_multilingual?: boolean;                 // default: true
  rating?: number | null;                    // 1.0~5.0
  place_name?: string | null;
  address?: string | null;
  price_prefix?: string | null;              // 가격 접두어 (예: "메인메뉴 평균: ")
  price?: number | null;                     // 원 단위
}
```

**Output:** `{ postId: string }` or error

**DB:** `INSERT INTO posts`

---

### 2.2 게시글 수정 — `updatePost`

**Type:** Server Action

**Input:** `{ postId: string } & Partial<CreatePostInput>`

**Output:** `{ success: boolean }` or error

**DB:** `UPDATE posts WHERE id = postId`

---

### 2.3 게시글 조회 (편집용) — `getPost`

**Type:** Server Action

**Input:** `{ postId: string }`

**Output:**
```typescript
{
  post: Post;
  translations: PostTranslation[];
}
```

**DB:** `SELECT * FROM posts WHERE id = ?` + `SELECT * FROM post_translations WHERE post_id = ?`

---

### 2.4 게시글 목록 — `listPosts`

**Type:** Server Action

**Input:**
```typescript
{
  limit?: number;          // default: 20
  offset?: number;
  category?: Category;
  search?: string;         // title ILIKE
}
```

**Output:** `{ posts: Post[]; total: number }`

**DB:** `SELECT * FROM posts` + 필터/페이지네이션

---

### 2.5 게시글 삭제 — `deletePost`

**Type:** Server Action

**Input:** `{ postId: string }`

**Output:** `{ success: boolean }`

**DB:** `DELETE FROM post_translations WHERE post_id = ?` → `DELETE FROM posts WHERE id = ?`

---

## 3. 미디어 업로드 (Phase 4)

### 3.1 S3 Pre-signed URL 발급 — `getPresignedUrl`

**Type:** Server Action

**Input:**
```typescript
{
  fileName: string;
  fileType: 'image/jpeg' | 'image/png' | 'image/webp';
  fileSize: number;        // bytes, max 10MB
}
```

**Output:**
```typescript
{
  presignedUrl: string;    // PUT용 S3 URL (1시간 유효)
  cdnUrl: string;          // 업로드 완료 후 접근 URL (media.eunminlog.site/...)
}
```

**Flow:**
1. Client → Server Action `getPresignedUrl()` (AWS SDK v3 SigV4)
2. Client → `PUT presignedUrl` (S3 직접 업로드)
3. Client가 `cdnUrl`을 폼/에디터에 반영

**사용처:** `ThumbnailUpload`, `UploadImage` (에디터 이미지)

---

## 4. 번역 (Phase 4)

### 4.1 번역본 생성 — `generateTranslations`

**Type:** Server Action

**Input:**
```typescript
{
  postId: string;
  title: string;
  description: string;
  content: string;                           // Tiptap HTML
  place_name?: string | null;
  address?: string | null;
  targetLocales: TranslationLocale[];        // ['en','ja','zh-CN','zh-TW','id','vi','th']
}
```

**Output:**
```typescript
{
  translations: {
    locale: TranslationLocale;
    title: string;
    description: string;
    content: string;
    place_name?: string;
    address?: string;
  }[];
}
```

**External:** OpenAI GPT-5 Nano API (`OPENAI_API_KEY`)

**DB:** `INSERT INTO post_translations` (locale별 레코드)

**주의:**
- HTML 구조 보존, 텍스트 노드만 번역
- 코드/URL은 번역하지 않음

---

### 4.2 번역 조회 — `getTranslations`

**Type:** Server Action

**Input:** `{ postId: string; locale?: TranslationLocale }`

**Output:** `{ translations: PostTranslation[] }`

---

## 5. 빌드 트리거 (Phase 4)

### 5.1 GitHub Actions 빌드 트리거 — `triggerBuild`

**Type:** Server Action

**Input:**
```typescript
{
  environment: 'production' | 'development';
}
```

**Output:** `{ success: boolean; workflowRunId?: string }`

**External:** GitHub Actions API — `POST /repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches`

**Credentials:** `GITHUB_TOKEN` (env)

---

## 6. 핵심 지표 (Phase 4)

### 6.1 게시글 지표 조회 — `getPostMetrics`

**Type:** Server Action 또는 API Route

**Input:**
```typescript
{
  dateFrom?: string;       // ISO 8601
  dateTo?: string;
  sortBy?: 'views' | 'recommendations' | 'comments';
  search?: string;
}
```

**Output:**
```typescript
{
  metrics: {
    id: string;
    title: string;
    views: number;
    recommendations: number;
    comments: number;
    publishedAt: string;
  }[];
}
```

**현재:** mock 데이터 (`apps/admin/src/app/page.tsx`)

**향후:** GA4 Reporting API 또는 Supabase 커스텀 이벤트 테이블

---

## 환경변수

| 변수 | 범위 | 용도 |
|------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Supabase URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | 클라이언트 인증 |
| `SUPABASE_SERVICE_ROLE_KEY` | Private | Server Action DB 접근 |
| `OPENAI_API_KEY` | Private | GPT-5 Nano 번역+요약 |
| `GITHUB_TOKEN` | Private | 빌드 트리거 |
| `AWS_ACCESS_KEY_ID` | Private | S3 Pre-signed URL |
| `AWS_SECRET_ACCESS_KEY` | Private | S3 Pre-signed URL |

---

## 구현 우선순위

| 순서 | API | Phase |
|------|-----|-------|
| 1 | `createPost`, `updatePost`, `getPost` | 3 |
| 2 | `signIn`, `signOut`, `getSession` | 2 |
| 3 | `getPresignedUrl` | 4 |
| 4 | `generateTranslations` | 4 |
| 5 | `listPosts`, `deletePost` | 4 |
| 6 | `triggerBuild` | 4 |
| 7 | `getPostMetrics` (GA4 연동) | 4 |
