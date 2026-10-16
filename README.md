# 은민로그 (eunmin log)

커플 블로그 — 맛집, 카페, 여행 콘텐츠 플랫폼

## Tech Stack

| Layer    | Technology                           |
| -------- | ------------------------------------ |
| Admin    | Next.js 15 (App Router, React 19)    |
| Client   | Astro 5 (SSG)                        |
| Styling  | Tailwind CSS                         |
| DB       | Supabase (PostgreSQL)                |
| AI       | OpenAI GPT-5 Nano (다국어 번역+요약) |
| CI/CD    | GitHub Actions                       |
| Hosting  | AWS S3 + CloudFront                  |
| Monorepo | pnpm + TurboRepo                     |

## Project Structure

```
apps/
  admin/          # Next.js — 글 작성/편집, 빌드 트리거
  client/         # Astro — 공개 블로그 뷰어 (SSG)
packages/
  tsconfig/       # 공유 TypeScript 설정
  eslint-config/  # 공유 ESLint 설정
docs/
  architecture.md # 시스템 아키텍처
  ui-specs.md     # UI/UX 레이아웃 스펙
  database.md     # DB 스키마
  seo-strategy.md # SEO 전략
```

## Prerequisites

- Node.js >= 24
- pnpm >= 10.6.2

## Getting Started

```bash
# 의존성 설치
pnpm install

# 전체 개발 서버 기동
pnpm dev

# 개별 앱 실행
pnpm --filter @eunminlog/admin dev    # localhost:3001
pnpm --filter @eunminlog/client dev   # localhost:4321
```

## Scripts

| Command      | Description                |
| ------------ | -------------------------- |
| `pnpm dev`   | 전체 dev 서버 기동 (Turbo) |
| `pnpm build` | 전체 프로덕션 빌드         |
| `pnpm lint`  | 전체 ESLint 검사           |

## Architecture

```
Admin(관리자) → Next.js Editor → Supabase DB
                                      ↑
GitHub Actions → Astro SSG Build ─────┘
                      ↓
              AWS S3 + CloudFront → 사용자
```

자세한 내용은 [`docs/architecture.md`](docs/architecture.md) 참고.

## License

Copyright (c) 2026 이세민. All rights reserved.

이 프로젝트의 자체 소스코드 및 문서는 오픈소스로 제공되지 않습니다.
사전 서면 허가 없이 사용·복제·수정·재배포할 수 없습니다.
상세 조건은 [LICENSE](LICENSE)를 참고하세요. 저장소 공개 범위와 라이선스는 별개입니다.

이 정책은 2026년 10월 16일 라이선스 변경을 도입한 커밋 및 이후 버전에 적용하며,
기존 MIT 배포본에 부여된 권한에는 소급 적용하지 않습니다.
제3자 구성요소에는 각 구성요소의 원래 라이선스와 저작권 고지가 적용됩니다.
