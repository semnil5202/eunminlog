# Client: Tiptap HTML Viewer 대응

> Admin Tiptap 에디터가 출력하는 HTML을 Client(Astro SSG)에서 올바르게 렌더링하기 위한 작업 목록.
> 에디터 출력 포맷 상세: [`docs/admin-specs.md`](docs/admin-specs.md) Section 4-2.

## 현재 상태 분석

Client `PostLayout.astro`는 `prose prose-gray prose-lg` (Tailwind Typography)로 본문을 렌더링한다. Tiptap HTML은 인라인 스타일을 포함하므로, Tailwind Typography 스타일과 인라인 스타일이 공존하게 된다. 인라인 스타일은 CSS specificity에서 우선하므로 대부분의 heading/list/link 스타일은 에디터 출력 그대로 표시된다. 그러나 아래 항목들은 추가 대응이 필요하다.

## P0 (필수)

- [ ] **`insertInArticleAds()` Markdown → HTML 마이그레이션** (Critical)
  - **현재**: `features/post-detail/lib/ads.ts`에서 `markdown.split(/(?=^## )/m)`으로 Markdown `## ` 헤딩 기준 분할
  - **문제**: Tiptap 출력은 `<h2 style="...">` HTML 태그이므로 기존 정규식 매칭이 실패
  - **해결**: 정규식을 `(?=<h2[\s>])` 패턴으로 변경하여 `<h2>` 또는 `<h2 style="...">`을 매칭
  - 기존 Markdown 포스트가 있다면 하위 호환도 고려 (Markdown `## `과 HTML `<h2>` 둘 다 매칭하는 union 정규식, 또는 마이그레이션 완료 후 Markdown 패턴 제거)

- [ ] **Ordered List 중첩 레벨 CSS**
  - 에디터 내부에서는 `.ProseMirror > ol` 셀렉터로 처리하지만, Client에는 ProseMirror 래퍼가 없음
  - `[itemprop='articleBody']` 또는 `.prose` 컨테이너 기준으로 동일한 CSS 적용 필요
  - `global.css` 또는 `PostLayout.astro` 스코프에 추가:
    ```css
    [itemprop='articleBody'] > ol {
      list-style-type: decimal;
    }
    [itemprop='articleBody'] ol ol,
    [itemprop='articleBody'] ul ol {
      list-style-type: lower-alpha;
    }
    [itemprop='articleBody'] ol ol ol,
    [itemprop='articleBody'] ul ol ol {
      list-style-type: lower-roman;
    }
    ```

- [ ] **Link `target="_blank"` 처리**
  - Tiptap 출력 `<a>` 태그에 `target="_blank"`가 없음
  - 외부 링크 클릭 시 현재 페이지를 벗어나는 문제 발생
  - 해결 방안 (택 1):
    - **(A) 빌드 타임 변환**: `PostLayout.astro` frontmatter에서 `content` HTML을 파싱하여 `<a>` 태그에 `target="_blank" rel="noopener noreferrer"` 추가
    - **(B) 클라이언트 JS**: `[itemprop='articleBody'] a` 셀렉터로 이벤트 위임하여 `target="_blank"` 동적 설정
    - **권장**: (A) 빌드 타임 변환 -- SSG 특성상 한 번만 처리하면 됨, JS 불필요

- [ ] **본문 컨테이너 max-width 확인**
  - 에디터 `max-w-[688px]`과 Client 뷰어 너비가 일치해야 인라인 스타일(특히 heading font-size)이 의도된 비율로 표시됨
  - 현재 `PostLayout.astro` main은 3-column grid의 `1fr`이므로, 게시글 본문 `<article>` 또는 `.prose` 컨테이너에 `max-w-[688px]` 제한이 필요한지 검토

## P1 (중요)

- [ ] **Link hover 색상**
  - 현재 `PostLayout.astro`에 `hover:prose-a:underline`이 있으나, Tiptap 링크는 이미 `text-decoration: underline` 인라인 스타일 포함
  - hover 시 색상 변경이 필요하면 `[itemprop='articleBody'] a:hover { color: var(--color-primary-strong); }` 추가
  - 단, Tiptap 인라인 스타일 `color: #5e83fe`와 Tailwind Typography `prose-a:text-primary-600`이 충돌 -- 인라인 스타일이 우선하므로, hover 색상은 `!important` 또는 별도 CSS 변수 필요

- [ ] **Tailwind Typography vs 인라인 스타일 충돌 정리**
  - Tiptap 출력에는 heading/link/list에 인라인 스타일이 포함되어 Tailwind Typography 스타일을 덮어씀
  - 공존 시 의도치 않은 이중 마진/패딩이 발생할 수 있음
  - 검토 필요 항목:
    - `prose-headings:font-bold` vs 인라인 `font-weight: 600` (공존 가능, 인라인 우선)
    - `prose-a:text-primary-600 prose-a:no-underline` vs 인라인 `color: #5e83fe; text-decoration: underline` (인라인 우선)
    - `prose-blockquote:border-primary-400` vs 인라인 `border-left: 3px solid #ddd` (인라인 우선)
  - **결론**: Tiptap HTML을 사용하는 새 포스트에서는 인라인 스타일이 우선 적용되므로 대부분 문제 없음. 단, 기존 Markdown 포스트와의 스타일 일관성이 깨질 수 있으므로 마이그레이션 계획 필요.

- [ ] **반응형 Typography (모바일 heading 크기)**
  - Tiptap heading 인라인 스타일이 고정 px 값 사용 (h2: 22px, h3: 20px 등)
  - 모바일 화면에서 너무 크거나 작을 수 있음
  - CSS `@media` 쿼리로 `[itemprop='articleBody'] h2` 등의 `font-size`를 오버라이드 (`!important` 필요)
  - 또는 에디터 측에서 인라인 스타일 대신 CSS 클래스 기반으로 전환하는 것을 검토 (장기)

## P2 (선택)

- [ ] **Underline 클래스 호환성**
  - Tiptap 출력: `<u class="underline">` -- Tailwind 환경에서 `.underline { text-decoration-line: underline; }` 자동 적용
  - Client Astro는 Tailwind 사용 중이므로 별도 작업 불필요
  - 단, Tailwind purge 대상에서 `underline` 클래스가 미사용으로 제거될 가능성 확인 필요 (HTML 콘텐츠는 빌드 타임 동적 생성이므로 Tailwind content 경로에 포함되지 않을 수 있음 -- `safelist`에 `underline` 추가 권장)

- [ ] **연속 이미지 갤러리 CSS snap 변환** (media feature 이미지 삽입 구현 후)
  - Tiptap 에디터에서 연속 `<img>` 삽입 시, Client에서 `scroll-snap-type: x mandatory` 갤러리로 자동 변환
  - 빌드 타임 또는 클라이언트 JS로 연속 `<img>` 감지 + 래퍼 `<div>` 생성
