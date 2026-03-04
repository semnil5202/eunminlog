# Tiptap 에디터 구현 명세서

> 이 문서는 `dpm-core-client` 레포지토리의 Tiptap 리치 텍스트 에디터 구현을 다른 레포지토리의 AI Agent가 참조할 수 있도록 상세히 기술합니다.

---

## 1. 설치된 라이브러리

### 패키지 의존성 (apps/admin/package.json)

```json
{
  "@tiptap/core": "^3.18.0",
  "@tiptap/extension-bullet-list": "^3.18.0",
  "@tiptap/extension-heading": "^3.18.0",
  "@tiptap/extension-link": "^3.18.0",
  "@tiptap/extension-placeholder": "^3.19.0",
  "@tiptap/extension-underline": "^3.18.0",
  "@tiptap/react": "^3.18.0",
  "@tiptap/starter-kit": "^3.18.0"
}
```

### 사용 목적별 분류

| 패키지 | 용도 |
|--------|------|
| `@tiptap/core` | Tiptap 코어 엔진 (ProseMirror 래퍼) |
| `@tiptap/react` | React 바인딩 (`useEditor`, `EditorContent`) |
| `@tiptap/starter-kit` | 기본 확장 번들 (Doc, Paragraph, Text, Bold, Italic, Strike, History, HorizontalRule, Blockquote, ListItem, OrderedList 등) |
| `@tiptap/extension-bullet-list` | StarterKit 내장 bulletList를 비활성화하고 커스텀 설정으로 재정의 |
| `@tiptap/extension-heading` | StarterKit 내장 heading을 비활성화하고 커스텀 input rule + 인라인 스타일로 재정의 |
| `@tiptap/extension-link` | 하이퍼링크 삽입/편집 지원 |
| `@tiptap/extension-underline` | 밑줄 서식 지원 (StarterKit에 미포함) |
| `@tiptap/extension-placeholder` | 설치는 되어있으나 **실제 미사용** (커스텀 placeholder 구현 사용) |

> **참고**: `@tiptap/extension-placeholder`는 설치되어 있지만 코드에서는 직접 사용하지 않습니다. 대신 `TiptapEditor` 컴포넌트에서 `isEmpty` 상태를 추적하여 커스텀 placeholder를 absolute positioning으로 구현합니다.

---

## 2. 에디터 설계 구조

### 2.1 파일 트리

```
apps/admin/app/(auth)/notice/create/
├── page.tsx                          # 공지 작성 페이지 (폼 통합)
├── preview/
│   └── page.tsx                      # HTML 프리뷰 렌더러
├── _configs/
│   └── tiptap-extensions.ts          # 모든 Tiptap 확장 설정 (핵심 설정 파일)
├── _schemas/
│   └── notice-schema.ts              # Zod 폼 검증 (HTML content 포함)
├── _utils/
│   └── build-announcement-payload.ts # 폼 데이터 → API 요청 변환
└── _components/
    ├── TiptapEditorContainer.tsx      # 최상위 에디터 래퍼 (Toolbar + Editor)
    ├── TiptapEditor.tsx              # 에디터 본체 + useTiptapEditor 커스텀 훅
    ├── TiptapEditorSkeleton.tsx      # 로딩 스켈레톤 UI
    ├── Toolbar.tsx                   # 툴바 레이아웃 조합
    ├── icons/
    │   ├── index.ts                  # 아이콘 barrel export
    │   ├── BoldIcon.tsx
    │   ├── ItalicIcon.tsx
    │   ├── UnderlineIcon.tsx
    │   ├── LinkIcon.tsx
    │   ├── UnorderIcon.tsx           # Bullet List 아이콘
    │   ├── OrderIcon.tsx             # Ordered List 아이콘
    │   ├── UndoIcon.tsx
    │   └── RedoIcon.tsx
    └── toolbars/
        ├── index.ts                  # 툴바 컴포넌트 barrel export
        ├── types.ts                  # EditorProps 인터페이스 정의
        ├── FontStyles.tsx            # Bold / Italic / Underline 버튼 그룹
        ├── TiptapLink.tsx            # 링크 삽입/편집 모달
        ├── List.tsx                  # BulletList / OrderedList 버튼 그룹
        ├── History.tsx               # Undo / Redo 버튼 그룹
        └── VerticalDivider.tsx       # 툴바 구분선
```

### 2.2 컴포넌트 위계도

```
CreateNoticePage (page.tsx)
└── Form (React Hook Form + Zod)
    └── FormField[name="content"]
        └── TiptapEditorContainer          ← 에디터 진입점
            ├── Toolbar                    ← 툴바 영역
            │   ├── FontStyles             ← [B] [I] [U]
            │   ├── VerticalDivider        ← |
            │   ├── TiptapLink             ← [🔗] + Portal 모달
            │   ├── VerticalDivider        ← |
            │   ├── List                   ← [●] [1.]
            │   └── History                ← [↩] [↪]
            └── TiptapEditor               ← 에디터 본체
                ├── EditorContent          ← @tiptap/react
                └── Placeholder (조건부)    ← 커스텀 absolute div
```

---

## 3. 컴포넌트 상세 설명

### 3.1 `TiptapEditorContainer`

**역할**: 에디터의 최상위 컨테이너. Toolbar와 TiptapEditor를 조합하고, 마운트 전 하이드레이션 이슈를 방지합니다.

**파일**: `_components/TiptapEditorContainer.tsx`

```typescript
interface TiptapEditorContainerProps {
  content: string;         // HTML 문자열 (폼 상태)
  onChange: (content: string) => void;  // HTML 변경 콜백
  placeholder?: string;   // 기본값: 'ex. 디프만 00기 OT'
  className?: string;
}
```

**핵심 동작**:
- `useState(false)` → `useEffect`로 `isMounted`를 추적하여 SSR 하이드레이션 불일치 방지
- 마운트 전 또는 에디터 초기화 전에는 `TiptapEditorSkeleton`을 표시
- 외부 `rounded-lg border border-line-normal` 컨테이너 스타일 적용
- `aria-invalid` 시 `border-red-400`으로 에러 표시 지원

### 3.2 `TiptapEditor` + `useTiptapEditor` 훅

**역할**: Tiptap 에디터 인스턴스를 생성하고 렌더링합니다.

**파일**: `_components/TiptapEditor.tsx`

#### `useTiptapEditor` 훅

```typescript
interface UseTiptapEditorProps {
  content: string;
  onChange: (content: string) => void;
}
```

- `useEditor`로 에디터 인스턴스 생성
- `immediatelyRender: false` → SSR 안전 렌더링
- `onUpdate` 콜백에서 `editor.getHTML()`로 HTML 문자열 추출 후 `onChange` 호출
- `content` prop 변경 시 `editor.commands.setContent(content)`로 동기화 (양방향 바인딩)
- 에디터 영역 스타일: `h-[300px] w-full p-4 overflow-y-auto`, `line-height: 1.6`

#### `TiptapEditor` 컴포넌트

- `EditorContent`를 렌더링
- `isEmpty` 상태를 `editor.on('update')` 이벤트로 추적
- 에디터가 비어있고 `placeholder` prop이 있으면 커스텀 placeholder div를 `absolute top-0 left-0`으로 오버레이
- `pointer-events-none`으로 에디터 인터랙션에 간섭하지 않음

### 3.3 `Toolbar`

**역할**: 모든 툴바 컴포넌트를 수평 레이아웃으로 조합합니다.

**파일**: `_components/Toolbar.tsx`

**레이아웃**:
```
[B][I][U] | [🔗] | [●][1.] ────────────────── [↩][↪]
  좌측 정렬                                    우측 정렬
```

- 높이: `h-11` (44px)
- 배경: `bg-background-subtle`
- `overflow-x-auto`로 좁은 화면에서 수평 스크롤 지원
- `justify-between`으로 좌/우 영역 분리

### 3.4 `FontStyles`

**역할**: Bold, Italic, Underline 토글 버튼 그룹

**파일**: `_components/toolbars/FontStyles.tsx`

- 각 버튼 32x32px (`h-8 w-8`)
- `editor.chain().focus().toggleBold/Italic/Underline().run()` 호출
- `editor.isActive('bold')` 등으로 활성 상태 감지 → `bg-background-strong` 배경 적용
- `editor.can().chain()...` 으로 disabled 상태 판단

### 3.5 `TiptapLink`

**역할**: 링크 삽입 및 편집을 위한 URL 입력 모달

**파일**: `_components/toolbars/TiptapLink.tsx`

**핵심 동작**:
1. 버튼 클릭 시 기존 링크 URL을 `editor.getAttributes('link').href`로 가져옴
2. `createPortal`로 `document.body`에 모달 렌더링 (z-50)
3. 모달 위치를 버튼 하단에 동적 계산 (`getBoundingClientRect`)
4. scroll/resize 이벤트로 위치 업데이트
5. 외부 클릭 감지로 자동 닫기
6. Enter 키로 제출, Escape 키로 취소
7. URL이 비어있으면 `unsetLink()`, 있으면 `setLink({ href: url })`

**모달 UI**:
- 너비: 400px, `rounded-2xl`, `shadow-lg`
- Input + "완료" 버튼 조합
- `@dpm-core/shared`의 `Input`, `Button` 컴포넌트 사용

### 3.6 `List`

**역할**: BulletList / OrderedList 토글 버튼 그룹

**파일**: `_components/toolbars/List.tsx`

- `editor.chain().focus().toggleBulletList/OrderedList().run()` 호출
- 활성 상태 감지 + disabled 체크 동일 패턴

### 3.7 `History`

**역할**: Undo / Redo 버튼 그룹

**파일**: `_components/toolbars/History.tsx`

- `editor.chain().focus().undo/redo().run()` 호출
- disabled 시 `opacity-40` 적용 (다른 버튼들과 차별화)

### 3.8 `TiptapEditorSkeleton`

**역할**: 에디터 마운트 전 로딩 UI

**파일**: `_components/TiptapEditorSkeleton.tsx`

- 툴바 영역: 8개의 `Skeleton` 사각형 (32x32px) + `VerticalDivider` 조합
- 에디터 영역: `min-h-[300px]` 전체 너비 Skeleton
- `@dpm-core/shared`의 `Skeleton` 컴포넌트 사용

### 3.9 `VerticalDivider`

**역할**: 툴바 그룹 간 시각적 구분선

**파일**: `_components/toolbars/VerticalDivider.tsx`

```tsx
<div className="h-5 w-px bg-line-normal" />
```

### 3.10 `EditorProps` 타입

**파일**: `_components/toolbars/types.ts`

```typescript
import type { Editor } from '@tiptap/react';

export interface EditorProps {
  editor: Editor;
}
```

모든 툴바 하위 컴포넌트가 공유하는 인터페이스입니다.

---

## 4. Tiptap 확장(Extension) 설정 상세

### 설정 파일: `_configs/tiptap-extensions.ts`

모든 확장은 배열로 export됩니다:

```typescript
export const tiptapExtensions = [
  CustomStarterKit,
  CustomBulletList,
  CustomHeading,
  CustomLink,
  CustomUnderline,
];
```

### 4.1 CustomStarterKit

`@tiptap/starter-kit`을 기반으로 다음을 커스터마이징:

| 설정 | 값 | 설명 |
|------|---|------|
| `listItem` | `style: 'margin: 0; padding: 0; list-style-type: revert; margin-left: 22px;'` | 리스트 아이템 인라인 스타일 |
| `blockquote` | `style: 'padding-left: 17px; border-left: 3px solid #ddd; color: #555;'` | 인용문 스타일 |
| `bold` | `style: 'font-family: inherit;'` | 폰트 상속 보장 |
| `italic` | `style: 'font-family: inherit;'` | 폰트 상속 보장 |
| `strike` | `style: 'font-family: inherit;'` | 폰트 상속 보장 |
| `orderedList` | `style: 'list-style-position: outside;'` | 중첩 레벨 스타일은 CSS에서 처리 |
| `horizontalRule` | `style: 'margin: 16px 0;'` | 수평선 마진 |
| `dropcursor` | `width: 2` | 드래그 시 커서 너비 |
| `bulletList` | **`false`** (비활성화) | CustomBulletList로 대체 |
| `heading` | **`false`** (비활성화) | CustomHeading으로 대체 |
| `codeBlock` | **`false`** (비활성화) | 사용하지 않음 |
| `code` | **`false`** (비활성화) | 사용하지 않음 |

### 4.2 CustomBulletList

```typescript
BulletList.configure({
  HTMLAttributes: {
    style: 'list-style-position: outside; list-style-type: revert;',
  },
});
```

- 마크다운 지원: `-`, `+`, `*`
- `list-style-type: revert`로 브라우저 기본값 사용 (중첩 시 disc → circle → square 자동 처리)

### 4.3 CustomHeading

**가장 복잡한 커스텀 확장**. `Heading.extend()`로 확장합니다.

#### 마크다운 Input Rules

```typescript
// ## → h2, ### → h3, #### → h4, ##### → h5, ###### → h6
// (h1은 의도적으로 제외)
const levels: Level[] = [2, 3, 4, 5, 6];
```

> **주의**: `find` 패턴이 `new RegExp(\`^(#{${level - 1}})\\s$\`)` 로 되어있어, `##` 입력 시 h2가 됩니다. 즉 `#` 1개로는 heading이 생성되지 않습니다 (h1 비활성화).

#### 레벨별 인라인 스타일

| 레벨 | font-size | line-height | font-weight | color | margin |
|------|-----------|-------------|-------------|-------|--------|
| h2 | 22px | 30px | 600 | #111827 | 1rem 0 0.5rem 0 |
| h3 | 20px | 28px | 600 | #111827 | 0.875rem 0 0.5rem 0 |
| h4 | 18px | 26px | 600 | #111827 | 0.75rem 0 0.5rem 0 |
| h5 | 16px | 24px | 600 | #111827 | 0.625rem 0 0.5rem 0 |
| h6 | 14px | 20px | 600 | #111827 | 0.5rem 0 0.5rem 0 |

> **중요**: 이 스타일은 `renderHTML`에서 인라인 `style` 속성으로 직접 출력됩니다. 뷰어 측에서 별도의 heading CSS가 필요 없이, HTML 자체에 스타일이 포함됩니다.

### 4.4 CustomLink

```typescript
Link.configure({
  openOnClick: false,
  HTMLAttributes: {
    style: 'color: #5e83fe; text-decoration: underline; text-underline-offset: 2px; cursor: pointer;',
  },
  validate: (url) => /^https?:\/\//.test(url),  // HTTP/HTTPS 강제
});
```

- 에디터 내 클릭 시 링크 이동 비활성화 (편집 모드이므로)
- URL 검증: `http://` 또는 `https://`로 시작해야 함
- 인라인 스타일: 파란색(`#5e83fe`), 밑줄, `underline-offset: 2px`

### 4.5 CustomUnderline

```typescript
Underline.configure({
  HTMLAttributes: {
    class: 'underline',
  },
});
```

---

## 5. 에디터 CSS (globals.css)

**파일**: `apps/admin/app/globals.css`

에디터 동작에 필수적인 CSS 규칙들:

```css
/* 링크 hover 시 색상 변경 */
.ProseMirror a:hover,
.ProseMirror .link:hover {
  color: var(--color-primary-strong);
}

/* Ordered List 중첩 레벨별 스타일 */
/* 1번째 레벨: 1, 2, 3... */
.ProseMirror > ol {
  list-style-type: decimal !important;
}

/* 2번째 레벨: a, b, c... */
.ProseMirror ol ol,
.ProseMirror ul ol {
  list-style-type: lower-alpha !important;
}

/* 3번째 레벨: i, ii, iii... */
.ProseMirror ol ol ol,
.ProseMirror ul ol ol {
  list-style-type: lower-roman !important;
}
```

> **Unordered List**는 `list-style-type: revert`로 브라우저 기본값을 사용하므로 별도 CSS 불필요 (disc → circle → square 자동).

---

## 6. 콘텐츠 저장 및 전송 형식

### 6.1 데이터 포맷: HTML 문자열

에디터는 `editor.getHTML()`로 HTML 문자열을 출력합니다.

**예시 출력**:
```html
<h2 style="font-size: 22px; line-height: 30px; font-weight: 600; color: #111827; margin: 1rem 0 0.5rem 0;">제목</h2>
<p>본문 텍스트 <strong style="font-family: inherit;">볼드</strong> 그리고 <a href="https://example.com" style="color: #5e83fe; text-decoration: underline; text-underline-offset: 2px; cursor: pointer;">링크</a></p>
<ul style="list-style-position: outside; list-style-type: revert;">
  <li style="margin: 0; padding: 0; list-style-type: revert; margin-left: 22px;">항목 1</li>
  <li style="margin: 0; padding: 0; list-style-type: revert; margin-left: 22px;">항목 2</li>
</ul>
```

### 6.2 콘텐츠 검증 (Zod)

```typescript
// HTML 태그 제거 후 실제 텍스트가 있는지 확인
const hasContentText = (html: string) =>
  html.replace(/<[^>]*>/g, '').replace(/\s/g, '').length > 0;

content: z.string().refine(hasContentText, {
  message: '공지 내용을 입력해주세요!'
});
```

- Tiptap은 빈 에디터에서도 `<p></p>` 같은 HTML을 반환하므로, 태그를 제거한 후 실제 텍스트 존재 여부를 확인합니다.

### 6.3 API 전송

```typescript
// build-announcement-payload.ts
const payload: CreateAnnouncementRequest = {
  announcementType: 'GENERAL' | 'ASSIGNMENT',
  title: string,
  content: string,  // ← HTML 문자열 그대로 전송
  submitLink: string,
  shouldSendNotification: boolean,
  // ... 기타 필드
};
```

---

## 7. 뷰어(Viewer) 측 구현

### 7.1 Admin 미리보기 (현재 구현)

**파일**: `apps/admin/app/(auth)/notice/create/preview/page.tsx`

```tsx
<div
  className="prose prose-sm max-w-none"
  dangerouslySetInnerHTML={{ __html: content || '<p>내용 없음</p>' }}
/>
```

- `dangerouslySetInnerHTML`로 HTML 직접 렌더링
- Tailwind Typography 플러그인 (`prose prose-sm`) 사용
- Tiptap 의존성 **불필요** (순수 HTML 렌더링)

### 7.2 Client 앱 (미구현)

현재 `apps/client/`에는 공지 콘텐츠를 렌더링하는 뷰어가 구현되어 있지 않습니다.

### 7.3 뷰어 측에 위임된 CSS 책임

에디터에서 생성되는 HTML은 **대부분의 스타일이 인라인**으로 포함되어 있어, 뷰어 측에서 별도 CSS 작업이 최소화됩니다. 다만 다음 사항은 뷰어에서 처리해야 합니다:

#### 필수 CSS

| 항목 | 설명 | 권장 처리 방법 |
|------|------|---------------|
| **링크 hover** | `a:hover` 시 `color: var(--color-primary-strong)` | 뷰어 CSS에서 구현 필요 |
| **Ordered List 중첩** | 에디터에서는 `.ProseMirror > ol` 등으로 처리하지만 뷰어에서는 ProseMirror 래퍼가 없음 | 뷰어 컨테이너 기준으로 동일한 중첩 규칙 적용 필요 |
| **링크 클릭** | 에디터에서는 `openOnClick: false`이지만 뷰어에서는 클릭 시 새 탭 열기 필요 | `target="_blank"` + `rel="noopener noreferrer"` 처리 또는 JS 핸들링 |
| **Underline** | `class="underline"` 사용 | Tailwind 사용 시 자동 처리, 아니면 `.underline { text-decoration: underline; }` 추가 |
| **반응형 타이포그래피** | 인라인 px 스타일이므로 모바일에서 크기 조정 불가 | 필요 시 뷰어에서 CSS override 적용 |

#### 뷰어 권장 CSS

```css
/* 뷰어 컨테이너 클래스에 맞게 조정 */
.notice-content a:hover {
  color: var(--color-primary-strong);  /* 또는 프로젝트의 primary color */
}

.notice-content a {
  /* 링크 클릭 활성화 (에디터에서는 cursor: pointer만 있고 실제 이동 비활성화) */
  cursor: pointer;
}

/* Ordered List 중첩 레벨 */
.notice-content > ol {
  list-style-type: decimal !important;
}

.notice-content ol ol,
.notice-content ul ol {
  list-style-type: lower-alpha !important;
}

.notice-content ol ol ol,
.notice-content ul ol ol {
  list-style-type: lower-roman !important;
}
```

#### 뷰어에서 링크 새 탭 열기 처리 (선택)

에디터가 생성하는 `<a>` 태그에는 `target="_blank"`가 포함되지 않습니다. 뷰어에서 처리하는 방법:

**방법 1: JS로 후처리**
```tsx
useEffect(() => {
  const container = containerRef.current;
  if (!container) return;
  container.querySelectorAll('a').forEach((a) => {
    a.setAttribute('target', '_blank');
    a.setAttribute('rel', 'noopener noreferrer');
  });
}, [content]);
```

**방법 2: CSS만으로 처리 (제한적)**
```css
.notice-content a {
  /* CSS로는 target 설정 불가, JS 필요 */
}
```

---

## 8. SVG 아이콘 명세

모든 아이콘은 16x16px SVG React 컴포넌트이며, `currentColor`를 사용하여 부모의 `color` 속성을 상속합니다.

### 아이콘 목록

| 파일명 | 아이콘 | fill/stroke | 용도 |
|--------|--------|------------|------|
| `BoldIcon.tsx` | **B** (굵은 B 문자) | `fill="currentColor"` | Bold 서식 |
| `ItalicIcon.tsx` | *I* (기울임 I 문자 + 상하 가로선) | `fill="currentColor"` | Italic 서식 |
| `UnderlineIcon.tsx` | U (밑줄 있는 U 문자) | `fill="currentColor"` | Underline 서식 |
| `LinkIcon.tsx` | 체인 링크 (이중 연결 고리) | `fill="currentColor"` | 링크 삽입 |
| `UnorderIcon.tsx` | 점 3개 + 가로선 3개 | `stroke="currentColor"` | Bullet List |
| `OrderIcon.tsx` | 1,2 숫자 + 가로선 3개 | `stroke="currentColor"` | Ordered List |
| `UndoIcon.tsx` | 왼쪽 화살표 곡선 | `stroke="currentColor"` | 실행 취소 |
| `RedoIcon.tsx` | 오른쪽 화살표 곡선 | `stroke="currentColor"` | 다시 실행 |

### 공통 인터페이스

```typescript
import type { SVGProps } from 'react';

export const XxxIcon = ({ className, ...props }: SVGProps<SVGSVGElement>) => {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Xxx"
      {...props}
    >
      <title>Xxx</title>
      {/* SVG paths */}
    </svg>
  );
};
```

### 새로 구현 시 필요한 SVG 아이콘

현재 구현에서 사용하는 8개 아이콘을 새 프로젝트에서도 동일하게 필요합니다. 각 아이콘의 전체 SVG path 데이터:

<details>
<summary>BoldIcon SVG path</summary>

```xml
<path d="M12.0668 10.6667C12.0668 10.1185 11.8497 9.59251 11.4621 9.20493C11.0745 8.81736 10.5485 8.60024 10.0004 8.60024H4.60039V12.6667C4.60039 12.6843 4.6075 12.701 4.61992 12.7135C4.63236 12.726 4.64921 12.733 4.6668 12.7331H10.0004C10.5485 12.7331 11.0745 12.5159 11.4621 12.1284C11.8497 11.7408 12.0668 11.2148 12.0668 10.6667ZM13.2668 10.6667C13.2668 11.533 12.9232 12.3642 12.3105 12.9768C11.6979 13.5894 10.8668 13.9331 10.0004 13.9331H4.6668C4.33095 13.933 4.00897 13.7994 3.77148 13.562C3.53402 13.3244 3.40039 13.0025 3.40039 12.6667V3.33306C3.40046 2.99721 3.534 2.67523 3.77148 2.43774C4.00897 2.20026 4.33095 2.06672 4.6668 2.06665H9.33398C10.2003 2.06672 11.0308 2.41112 11.6434 3.02368C12.2559 3.63624 12.6003 4.46678 12.6004 5.33306C12.6004 6.19943 12.256 7.03059 11.6434 7.64321C11.5997 7.68685 11.5548 7.72889 11.509 7.76978C11.8017 7.92223 12.0728 8.11878 12.3105 8.35649C12.9232 8.96911 13.2668 9.80028 13.2668 10.6667ZM4.60039 7.40024H9.33398C9.88194 7.40018 10.4074 7.18221 10.7949 6.79478C11.1825 6.4072 11.4004 5.88117 11.4004 5.33306C11.4003 4.78504 11.1824 4.25963 10.7949 3.87212C10.4074 3.48461 9.882 3.26672 9.33398 3.26665H4.6668C4.64921 3.26672 4.63236 3.27374 4.61992 3.28618C4.60748 3.29862 4.60046 3.31547 4.60039 3.33306V7.40024Z" fill="currentColor"/>
```
</details>

<details>
<summary>ItalicIcon SVG paths</summary>

```xml
<path d="M12.6664 2.06665C12.9978 2.06665 13.2664 2.33528 13.2664 2.66665C13.2664 2.99802 12.9978 3.26665 12.6664 3.26665H6.66641C6.33504 3.26665 6.06641 2.99802 6.06641 2.66665C6.06641 2.33528 6.33504 2.06665 6.66641 2.06665H12.6664Z" fill="currentColor"/>
<path d="M9.33242 12.7333C9.66379 12.7333 9.93242 13.0019 9.93242 13.3333C9.93242 13.6646 9.66379 13.9333 9.33242 13.9333H3.33242C3.00105 13.9333 2.73242 13.6646 2.73242 13.3333C2.73242 13.0019 3.00105 12.7333 3.33242 12.7333H9.33242Z" fill="currentColor"/>
<path d="M9.43674 2.45581C9.55318 2.14571 9.89921 1.98871 10.2094 2.10503C10.5195 2.22147 10.6765 2.5675 10.5602 2.87768L6.56017 13.5441C6.44381 13.8543 6.09778 14.0112 5.78752 13.8949C5.47754 13.7784 5.32057 13.4331 5.43674 13.123L9.43674 2.45581Z" fill="currentColor"/>
```
</details>

<details>
<summary>UnderlineIcon SVG paths</summary>

```xml
<path d="M3.40039 6.66665V2.66665C3.40039 2.33528 3.66902 2.06665 4.00039 2.06665C4.33176 2.06665 4.60039 2.33528 4.60039 2.66665V6.66665L4.6043 6.8354C4.64602 7.6757 4.99875 8.47282 5.59648 9.07056C6.23411 9.70818 7.09865 10.0667 8.00039 10.0667C8.90213 10.0667 9.76667 9.70818 10.4043 9.07056C11.0419 8.43293 11.4004 7.56839 11.4004 6.66665V2.66665C11.4004 2.33528 11.669 2.06665 12.0004 2.06665C12.3318 2.06665 12.6004 2.33528 12.6004 2.66665V6.66665C12.6004 7.88665 12.1154 9.05633 11.2527 9.91899C10.3901 10.7817 9.22039 11.2667 8.00039 11.2667C6.78039 11.2667 5.61071 10.7817 4.74805 9.91899C3.88538 9.05633 3.40039 7.88665 3.40039 6.66665Z" fill="currentColor"/>
<path d="M13.3328 12.7333C13.6642 12.7333 13.9328 13.0019 13.9328 13.3333C13.9328 13.6646 13.6642 13.9333 13.3328 13.9333H2.66641C2.33504 13.9333 2.06641 13.6646 2.06641 13.3333C2.06641 13.0019 2.33504 12.7333 2.66641 12.7333H13.3328Z" fill="currentColor"/>
```
</details>

<details>
<summary>LinkIcon SVG paths</summary>

```xml
<path d="M10.9664 1.60011C11.8869 1.60842 12.7594 1.9924 13.3984 2.65574C14.0362 3.31798 14.3926 4.20641 14.4003 5.12793C14.4079 6.0494 14.0669 6.94411 13.4407 7.61731L13.4324 7.62545L11.778 9.34414C11.4288 9.70675 11.0059 9.98937 10.5371 10.1709C10.0683 10.3525 9.56589 10.4279 9.06466 10.3907C8.56349 10.3535 8.0774 10.2046 7.64 9.95653C7.20281 9.70854 6.825 9.36731 6.5306 8.95879C6.3051 8.6458 6.37985 8.21191 6.69788 7.98999C7.01577 7.76827 7.45581 7.842 7.68136 8.15463C7.86071 8.40356 8.08815 8.60686 8.34498 8.75255C8.60148 8.89801 8.88288 8.98349 9.17036 9.00492C9.45786 9.0263 9.74757 8.98358 10.0196 8.87828C10.292 8.7728 10.5431 8.60618 10.7531 8.38801L12.3993 6.67837C12.7777 6.27154 12.9932 5.71964 12.9885 5.13969C12.9836 4.55973 12.7592 4.01148 12.3745 3.61187C11.9907 3.21345 11.4792 2.99427 10.9535 2.98953C10.4279 2.98485 9.91412 3.19468 9.52423 3.58564L9.52331 3.58474L8.58211 4.55715C8.31309 4.83484 7.86609 4.84543 7.58393 4.58067C7.302 4.31589 7.2911 3.87592 7.56003 3.59831L8.5095 2.61956L8.51594 2.61232C9.1663 1.96016 10.0458 1.59189 10.9664 1.60011Z" fill="currentColor"/>
<path d="M6.93534 5.60923C7.43651 5.64649 7.9226 5.79537 8.36 6.04342C8.79719 6.29141 9.175 6.63264 9.4694 7.04116C9.6949 7.35415 9.62015 7.78804 9.30212 8.00996C8.98423 8.23168 8.54419 8.15795 8.31864 7.84533C8.13929 7.59639 7.91185 7.39309 7.65502 7.2474C7.39852 7.10195 7.11712 7.01646 6.82964 6.99503C6.54214 6.97365 6.25243 7.01637 5.98035 7.12167C5.70799 7.22715 5.45695 7.39377 5.24688 7.61195L3.59978 9.32068C3.22135 9.72751 3.00679 10.2803 3.01153 10.8603C3.01639 11.4402 3.2408 11.9885 3.62552 12.3881C4.00927 12.7865 4.52076 13.0057 5.04651 13.0104C5.57212 13.0151 6.08588 12.8053 6.47577 12.4143L7.41053 11.4437C7.67868 11.1653 8.12577 11.1537 8.40872 11.4175C8.69166 11.6814 8.70357 12.1214 8.43537 12.3998L7.49234 13.3795L7.48406 13.3876C6.8337 14.0398 5.95418 14.4081 5.03364 14.3998C4.11311 14.3915 3.24059 14.0076 2.6016 13.3442C1.96375 12.682 1.60745 11.7935 1.59974 10.872C1.59205 9.95055 1.93307 9.05584 2.55932 8.38264L2.56759 8.3745L4.22204 6.65582C4.57118 6.2932 4.99415 6.01058 5.46288 5.82904C5.93169 5.64747 6.43411 5.572 6.93534 5.60923Z" fill="currentColor"/>
```
</details>

<details>
<summary>UnorderIcon SVG paths (Bullet List)</summary>

```xml
<path d="M2 8.00183H2.00667" stroke="currentColor" strokeWidth="1.20008" strokeLinecap="round" strokeLinejoin="round"/>
<path d="M2 12.0021H2.00667" stroke="currentColor" strokeWidth="1.20008" strokeLinecap="round" strokeLinejoin="round"/>
<path d="M2 4.00146H2.00667" stroke="currentColor" strokeWidth="1.20008" strokeLinecap="round" strokeLinejoin="round"/>
<path d="M5.33398 8.00183H14.0013" stroke="currentColor" strokeWidth="1.20008" strokeLinecap="round" strokeLinejoin="round"/>
<path d="M5.33398 12.0021H14.0013" stroke="currentColor" strokeWidth="1.20008" strokeLinecap="round" strokeLinejoin="round"/>
<path d="M5.33398 4.00146H14.0013" stroke="currentColor" strokeWidth="1.20008" strokeLinecap="round" strokeLinejoin="round"/>
```
</details>

<details>
<summary>OrderIcon SVG paths (Ordered List)</summary>

```xml
<path d="M6.66797 8.00183H14.0018" stroke="currentColor" strokeWidth="1.20008" strokeLinecap="round" strokeLinejoin="round"/>
<path d="M6.66797 12.0021H14.0018" stroke="currentColor" strokeWidth="1.20008" strokeLinecap="round" strokeLinejoin="round"/>
<path d="M6.66797 4.00146H14.0018" stroke="currentColor" strokeWidth="1.20008" strokeLinecap="round" strokeLinejoin="round"/>
<path d="M2.66602 6.66833H3.99944" stroke="currentColor" strokeWidth="1.20008" strokeLinecap="round" strokeLinejoin="round"/>
<path d="M2.66602 4.00146H3.33273V6.66832" stroke="currentColor" strokeWidth="1.20008" strokeLinecap="round" strokeLinejoin="round"/>
<path d="M3.99944 12.0021H2.66602C2.66602 11.3354 3.99944 10.6687 3.99944 10.002C3.99944 9.33525 3.33273 9.00189 2.66602 9.33525" stroke="currentColor" strokeWidth="1.20008" strokeLinecap="round" strokeLinejoin="round"/>
```
</details>

<details>
<summary>UndoIcon SVG paths</summary>

```xml
<path d="M2 4.66833V8.66834H6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
<path d="M14 11.3351C14 9.74378 13.3679 8.21766 12.2426 7.09244C11.1174 5.96722 9.5913 5.33508 8 5.33508C6.52341 5.33659 5.09924 5.88252 4 6.86842L2 8.66842" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
```
</details>

<details>
<summary>RedoIcon SVG paths</summary>

```xml
<path d="M14 4.66833V8.66834H10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
<path d="M2 11.3351C2 9.74378 2.63214 8.21766 3.75736 7.09244C4.88258 5.96722 6.4087 5.33508 8 5.33508C9.47659 5.33659 10.9008 5.88252 12 6.86842L14 8.66842" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
```
</details>

---

## 9. 폼 통합 패턴

### React Hook Form + Zod 연동

```tsx
// page.tsx에서의 사용
<FormField
  control={form.control}
  name="content"
  render={({ field }) => (
    <FormItem>
      <FormLabel>상세 내용</FormLabel>
      <FormControl>
        <TiptapEditorContainer
          content={field.value}        // HTML string
          onChange={field.onChange}     // (html: string) => void
          placeholder="ex. 디프만 00기 OT"
        />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```

**데이터 흐름**:
```
Form State (string) → TiptapEditorContainer → useTiptapEditor → editor.setContent()
                                                                         ↓
Form State (string) ← field.onChange ← editor.getHTML() ← editor.onUpdate
```

---

## 10. 디자인 토큰 및 색상 참조

에디터에서 사용하는 주요 디자인 토큰 (Tailwind CSS 커스텀):

| 토큰 | 용도 |
|------|------|
| `bg-background-normal` | 에디터 배경 |
| `bg-background-subtle` | 툴바 배경 |
| `bg-background-strong` | 버튼 활성/hover 배경 |
| `border-line-normal` | 에디터 테두리, 구분선 |
| `text-label-assistive` | placeholder 텍스트 |
| `text-icon-noraml` | 아이콘 색상 (오타 주의: `noraml`) |
| `text-body2` | 에디터 본문 폰트 크기 |
| `--color-primary-strong` | 링크 hover 색상 |

> **참고**: `text-icon-noraml`은 코드에서 일관되게 사용되는 오타입니다 (`normal` → `noraml`). 새 프로젝트에서는 올바른 스펠링 사용을 권장합니다.

---

## 11. 지원 기능 요약 매트릭스

| 기능 | 지원 여부 | 구현 방식 |
|------|----------|----------|
| Bold | O | StarterKit 내장 |
| Italic | O | StarterKit 내장 |
| Underline | O | 별도 extension |
| Strikethrough | O | StarterKit 내장 (툴바 버튼 없음, Markdown `~~text~~`로만 사용 가능) |
| Heading (h2~h6) | O | 커스텀 extension (h1 제외) |
| Bullet List | O | 커스텀 설정 |
| Ordered List | O | StarterKit + CSS |
| Link | O | 커스텀 설정 + 모달 UI |
| Blockquote | O | StarterKit 내장 (툴바 버튼 없음, Markdown `>`로 사용 가능) |
| Horizontal Rule | O | StarterKit 내장 (Markdown `---`로 사용 가능) |
| Undo/Redo | O | StarterKit History |
| Code/CodeBlock | X | 명시적 비활성화 |
| Image | X | 미구현 |
| Table | X | 미구현 |
| Collaboration | X | 미구현 |

---

## 12. 새 프로젝트에서 재구현 시 체크리스트

### 필수 설치 패키지

```bash
pnpm add @tiptap/core @tiptap/react @tiptap/starter-kit \
  @tiptap/extension-bullet-list @tiptap/extension-heading \
  @tiptap/extension-link @tiptap/extension-underline
```

### 필수 구현 항목

1. **Extension 설정** - `tiptap-extensions.ts` 참조하여 동일한 인라인 스타일 적용
2. **에디터 컴포넌트** - `useEditor` + `EditorContent` + 커스텀 placeholder
3. **툴바 컴포넌트** - FontStyles, Link, List, History 4개 그룹
4. **SVG 아이콘** - 8개 아이콘 (위 SVG path 데이터 참조)
5. **CSS 규칙** - ProseMirror ordered list 중첩 + 링크 hover
6. **하이드레이션 방지** - `isMounted` 패턴 + `immediatelyRender: false`
7. **폼 연동** - HTML string 기반 양방향 바인딩

### 뷰어 필수 구현 항목

1. **Ordered List 중첩 CSS** (decimal → lower-alpha → lower-roman)
2. **링크 hover 색상** 변경
3. **링크 클릭 시 새 탭 열기** (`target="_blank"`)
4. **`underline` 클래스** 지원
5. **반응형 고려** (인라인 스타일이므로 모바일 대응 별도 필요)
