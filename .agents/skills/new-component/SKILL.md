---
name: new-component
description: 'Astro 컴포넌트 scaffolding. 지정 디렉토리에 PascalCase.astro 파일을 프로젝트 컨벤션에 맞게 생성한다.'
user_invocable: true
---

# /new-component 스킬

Astro 컴포넌트 파일을 프로젝트 컨벤션에 맞게 생성합니다.

## 사용법

```
/new-component <ComponentName> [directory]
```

- `ComponentName`: PascalCase 이름 (예: `AdBanner`, `ReviewStars`)
- `directory`: 대상 경로. 예:
  - Feature 전용: `features/post-feed/components`
  - 공유 레이아웃: `shared/components/layout`
  - 공유 네비게이션: `shared/components/navigation`
  - 공유 SEO: `shared/components/seo`

## 실행 절차

1. **인자 파싱**: 컴포넌트 이름과 디렉토리를 확인한다. 이름이 PascalCase가 아니면 변환한다.
2. **중복 확인**: `apps/client/src/` 하위에 같은 이름의 파일이 이미 있으면 중단하고 알린다.
3. **파일 생성**: 아래 템플릿으로 `apps/client/src/{directory}/{ComponentName}.astro` 파일을 생성한다.
4. **확인**: 생성된 파일 경로를 출력한다.

## 템플릿

```astro
---
/** {한국어로 컴포넌트 설명 1-2줄} */

interface Props {
  // 필요한 Props 정의
}

const { } = Astro.props;
---

<div>
  {/* TODO: 구현 */}
</div>
```

## 컨벤션 체크리스트

- [ ] 파일명은 PascalCase.astro
- [ ] 파일 상단 JSDoc 1-2줄 (한국어, 컴포넌트 기능만 기술)
- [ ] Props는 `interface Props`로 정의 (type 아닌 interface — Astro 컨벤션)
- [ ] Tailwind CSS utility class로 스타일링
- [ ] `// PERF:`, `// SEO:` 등 태그 주석 금지
