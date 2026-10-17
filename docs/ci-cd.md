# CI/CD Pipeline — GitHub Actions

> Date: 2026-03-02 (2026-10-17 내용 해시 기반 S3 업로드·실패 복구 반영)
> Status: 구현 문서 (해시 업로드의 실제 배포·CI 시간은 미검증)

## 1. Overview

미디어 고아 파일 정리는 배포 워크플로우와 분리된 [수동 스크립트](media-cleanup.md)를 사용한다. dev/prod를 명시하고 양쪽 참조를 대조하며, 기본은 삭제 없는 보고서 생성이다. 정리용 GitHub Actions나 예약 작업은 등록하지 않는다.

Astro SSG 클라이언트 앱(`apps/client`)을 GitHub Actions로 자동 빌드하여 AWS S3에 배포하고, CloudFront 캐시를 무효화하는 파이프라인. CloudFront Function(Viewer Request)이 하위 경로를 `index.html`로 매핑하여 S3 REST API의 경로 해석 제약을 보완한다.

```
Push to main/develop
  → GitHub Actions Trigger
    → pnpm install (monorepo 전체)
    → pnpm --filter @eunminlog/client build
    → 파일 SHA-256·메타데이터 비교 → 변경 업로드·삭제 정리 → S3 배포 목록 확정
    → aws cloudfront create-invalidation /*
```

## 2. Environment Strategy

환경별 상세(S3 버킷명, 도메인, CloudFront Distribution ID 등)는 [`secrets-reference.md`](secrets-reference.md) 섹션 3을 참조한다.

| 항목   | Production | Development |
| ------ | ---------- | ----------- |
| 브랜치 | `main`     | `develop`   |

## 3. GitHub Secrets 목록

환경별 시크릿 키 목록은 [`docs/secrets-reference.md`](secrets-reference.md)를 참조한다. (Git에 포함되지 않음)

### 3-1. Supabase (Client 빌드 타임 DB 접속)

Client SSG 빌드 시 Supabase에 접속하기 위한 시크릿. 키 목록은 [`secrets-reference.md` 섹션 2-3](secrets-reference.md#2-3-supabase-환경별)을 참조.

### 3-4. 필요한 IAM 정책

> IAM 정책 JSON은 [`secrets-reference.md` 섹션 9-1](secrets-reference.md#9-1-s3--cloudfront-배포-정책)을 참조한다.

### 3-5. 광고 GitHub Variables

Production 빌드는 `PUBLIC_AD_MEDIATION_ENABLED` repository variable만 주입한다. publisher client ID와 지면별 AdSense unit ID·layout key는 공개 식별자이므로 `shared/constants/ad.ts`에 고정한다. Production에서 플래그가 `false`이면 사이트 심사·Google CMP용 AdSense 기본 스크립트는 로드하지만 `adsbygoogle.push` 슬롯 경매 요청은 만들지 않고 쿠팡 배너를 표시한다. Local·Development 빌드는 운영 AdSense·쿠팡 대신 Google Publisher Tag(GPT) 공식 공개 샘플을 사용하며 AdSense 기본 스크립트도 로드하지 않는다. GPT 응답 없음과 로드 실패는 각각 `GPT TEST AD · NO FILL`, `GPT TEST AD · LOAD FAILED`로 구분한다. Production에서는 GPT 샘플과 기술 marker 분기를 항상 비활성화한다. 전환 절차는 [`todos/ADSENSE-TODO.md`](todos/ADSENSE-TODO.md)를 참조한다.

## 4. Workflow File Structure

```
.github/
└── workflows/
    └── deploy-client.yml    # client 앱 빌드 + S3 배포 + CF 무효화
```

단일 워크플로우 파일에서 브랜치별 환경 변수를 분기 처리한다.

## 5. Workflow 설계: `deploy-client.yml`

### 5-1. Trigger

```yaml
on:
  push:
    branches:
      - main
      - develop
```

### 5-2. 전체 Step 구조

```
Job: deploy
  ├── Step 1: Checkout
  ├── Step 2: Setup pnpm
  ├── Step 3: Setup Node.js (with pnpm cache)
  ├── Step 4: Install dependencies
  ├── Step 5: Set environment variables (branch-based)
  ├── Step 6: Build client
  ├── Step 7: Generate redirect mappings + CF Function code    ← 리다이렉트
  ├── Step 8: Configure AWS credentials
  ├── Step 9: Deploy to S3
  ├── Step 10: Update CloudFront Function                      ← 리다이렉트
  └── Step 11: Invalidate CloudFront cache
```

### 5-3. 상세 설계

#### Step 1: Checkout

```yaml
- uses: actions/checkout@v4
```

#### Step 2: Setup pnpm

```yaml
- uses: pnpm/action-setup@v4
```

`packageManager` 필드가 `package.json`에 `pnpm@10.6.2`로 선언되어 있으므로 version 명시 불필요. `pnpm/action-setup@v4`가 자동 감지한다.

#### Step 3: Setup Node.js + pnpm store cache

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: '24'
    cache: 'pnpm'
```

`cache: 'pnpm'`으로 pnpm store를 자동 캐싱하여 이후 빌드에서 의존성 다운로드 시간 절약.

#### Step 4: Install dependencies

```yaml
- run: pnpm install --frozen-lockfile
```

`--frozen-lockfile`: lockfile 변경 방지. CI 환경에서 재현성 보장.

모노레포 전체 install이 필요한 이유: `apps/client`가 `@eunminlog/config`, `@eunminlog/tsconfig` 등 workspace 패키지에 의존.

#### Step 5: 환경 변수 분기

`github.ref_name` 기준으로 prod/dev 환경 변수를 `$GITHUB_ENV`에 주입한다. 구체적인 값(S3 버킷명, CloudFront ID, 도메인 등)은 [`secrets-reference.md`](secrets-reference.md) 섹션 2, 3을 참조.

#### Step 6: Build client

환경 설정 후 Astro `cacheDir`를 먼저 복원하고, 아래 빌드가 성공하면 배포 전에 저장한다. 캐시 경로·키·실패 동작은 섹션 7의 Astro 빌드 캐시 보존을 참조한다.

```yaml
- name: Build client
  run: pnpm --filter @eunminlog/client build
  env:
    PUBLIC_STAGE: ${{ env.PUBLIC_STAGE }}
    PUBLIC_AD_MEDIATION_ENABLED: ${{ env.PUBLIC_AD_MEDIATION_ENABLED }}
    SUPABASE_URL: ${{ env.SUPABASE_URL }}
    SUPABASE_SERVICE_ROLE_KEY: ${{ env.SUPABASE_SERVICE_ROLE_KEY }}
```

`pnpm --filter @eunminlog/client build`를 사용하는 이유:

- `pnpm build` (turbo build)는 admin 포함 전체 빌드. admin은 배포 대상이 아니므로 불필요.
- 선택한 Client의 `astro build` 스크립트를 직접 실행한다. Turbo 작업은 실행하지 않으며 workspace의 공유 설정·스타일 소스는 Client 빌드에서 참조한다.
- 빌드 시간 절약 + 불필요한 admin 빌드 에러 방지.

#### Step 7: Configure AWS credentials

`aws-actions/configure-aws-credentials@v4`로 AWS 자격 증명 설정. 시크릿 키 목록은 [`secrets-reference.md`](secrets-reference.md) 섹션 2-1을 참조.

#### Step 8: Deploy to S3

내용 해시 기반 배포 스크립트가 기존 `aws s3 sync` 3단계를 대체한다.

```yaml
- name: Deploy changed files to S3
  run: node infra/scripts/deploy-static.mjs --dist apps/client/dist --bucket "$S3_BUCKET"
```

`deploy-static-core.mjs`가 계획·실행 순서를 담당하고 `deploy-static-s3.mjs`가 S3 입출력을 담당한다. 파일별 바이트의 SHA-256·크기·Content-Type·Cache-Control·Content-Encoding을 직전 성공 목록과 비교한다. 수정 시각은 비교하지 않는다. 확장자로 Content-Type을 결정하고 알 수 없는 확장자는 `application/octet-stream`을 사용한다. 현재 Content-Encoding은 `null`이며 압축 인코딩을 자동 추론하지 않는다.

| 파일 | Cache-Control |
| --- | --- |
| `*.html`, 루트 `ads.txt`, `api/feed/*` | `no-cache` |
| 그 외 정적 출력 | `public, max-age=31536000, immutable` |

- **배포 목록**: 버킷별 `_deploy/manifest.json`에 마지막 성공 파일 목록을 저장한다. 현재 목록은 러너에서 빌드 출력으로 생성하며, 관리 파일은 출력·삭제 대상에서 제외한다. `schemaVersion`과 버킷명을 검증해 환경 혼용을 방지한다. `index.html`이 없는 출력·목록, 심볼릭 링크와 잘못된 경로는 중단한다.
- **평상시 비교**: 이전 manifest와 pending을 읽는다. 내용·메타데이터가 같으면 파일을 전송하지 않는다. 변경 없는 정상 실행은 관리 파일도 다시 저장하지 않는다. 새 경로·내용 변경·메타데이터 변경은 업로드하고 이전 목록에만 있는 경로는 삭제한다. 비HTML 파일을 먼저, HTML을 나중에 전송하며 기본 병렬 업로드는 8개(`--concurrency 1~64`)다.
- **최초 전환**: manifest가 없으면 원격 키를 페이지네이션으로 끝까지 수집한다. 현재 파일을 모두 업로드하고 현재 출력에 없는 원격 파일을 정리해 기존 `sync --delete` 동작을 유지한다. `_deploy` 관리 영역은 제외한다. 첫 도입에는 업로드 감소 효과가 없다.

##### 실패 복구와 동시 실행 (P0, S3-DEPLOY-001, 2026-10-17)

직전 manifest만 유지하면 실패 중 업로드한 신규 파일이나 원래 내용으로 되돌린 파일을 놓칠 수 있으므로, 파일 변경 전에 `_deploy/pending.json`에 변경·삭제 대상 키를 기록한다.

```text
빌드 출력 해시 계산 → manifest·pending 읽기 → 배포 계획
→ pending 먼저 저장 → 비HTML 업로드 → HTML 업로드 → 삭제
→ 모든 파일 작업 성공 → manifest 확정 → pending 삭제
→ CloudFront Function 갱신 → /* 무효화
```

남아 있는 pending은 다음 실행에서 복구한다. pending 키가 현재 출력에 있으면 이전 manifest와 같더라도 강제로 다시 업로드하고, 없으면 삭제한다. 재실행 목표가 실패한 빌드와 달라져도 최신 출력으로 수렴한다. pending 저장 실패 시 콘텐츠를 변경하지 않으며 파일 작업·manifest 저장 실패 시 pending을 남긴다. manifest 저장 뒤 pending 삭제가 실패해도 다음 실행에서 재처리한다. 파일 스트림 업로드의 일시 오류는 같은 실행에서 자동 재시도를 보장하지 않으며 pending을 남기고 실패하므로 워크플로를 재실행한다. 객체 없음만 초기 상태로 인정하고 접근 권한·통신·JSON·스키마 오류는 중단한다. 삭제 응답의 부분 실패도 성공으로 처리하지 않는다.

대상 환경별 GitHub Actions `concurrency`를 사용하고 `cancel-in-progress: false`로 실행 중 배포를 취소하지 않는다. `main`은 production, 나머지는 development 그룹으로 묶어 같은 버킷의 배포를 직렬화한다. 이 잠금은 해당 워크플로의 협력 실행을 위한 것이며 외부 도구의 동시 쓰기까지 막지 않는다.

여러 S3 객체를 한 번에 원자적으로 전환하는 방식은 아니다. 실패 시 일부 파일이 먼저 반영될 수 있으며 자동 롤백하지 않고 다음 실행에서 복구한다. manifest는 S3 파일 전체를 매번 검증하는 목록이 아니므로, 관리 목록 밖에서 수동으로 수정·삭제·추가한 객체는 평상시 비교로 감지하지 않는다. 관리 파일을 지워 복구 상태를 잃거나 버킷을 외부에서 변경하지 않도록 한다. CloudFront Function 갱신·`/*` 무효화는 업로드 건수와 관계없이 기존대로 실행하므로, S3 성공 뒤 CloudFront 단계가 실패해도 재실행에서 다시 요청한다.

##### 검증과 측정 (P1, S3-DEPLOY-002, 2026-10-17)

```bash
node --test infra/scripts/deploy-static.test.mjs infra/scripts/deploy-static-s3.test.mjs
node infra/scripts/deploy-static.mjs --dist apps/client/dist --bucket "$S3_BUCKET" --dry-run
```

로컬 검증에서 배포 코어 46개·SDK/CLI/워크플로 6개 테스트를 모두 통과했다. 기존 인프라 테스트 포함 66개·Client 67개 테스트, frozen lockfile 오프라인 설치를 통과했다. 기존 로컬 dist 109개를 메모리 스토리지에 처음 적용한 뒤 다시 실행하면 콘텐츠 업로드·삭제가 모두 0건이었다. 이는 실제 S3 속도 측정이 아니다. fixture 스토리지와 모킹된 SDK를 사용해 무변경·수정·발행·삭제·메타데이터 변경, 최초 전환, 페이지네이션, 부분 업로드·삭제·manifest/pending 처리 실패 후 재실행을 확인한다. `--dry-run`은 실제 환경에서는 읽기 권한·연결이 필요하지만 업로드·삭제·관리 파일 저장을 하지 않는다. 운영 S3 쓰기·배포는 별도 사용자 승인 후 진행한다.

기존 운영 [#390](https://github.com/semnil5202/eunminlog/actions/runs/39000729052)은 전체 약 65초 중 기존 sync 3단계가 약 33초(23+5+5초), 업로드 552개였다. 이는 **기존 방식의 기준값**이며 새 해시 업로드의 실제 Actions 시간·운영 저장/복구 효과는 아직 측정하지 않았다. 무변경·소수 변경에서 전송량 감소를 기대하되 로컬 fixture 결과를 실제 배포 속도로 해석하지 않는다.

피드 경로는 `/api/feed/v2/{locale}/.../{page}.json`을 사용하며 HTML endpoint와 버전을 맞춘다. 삭제 정리 뒤 이전 탭의 구버전 endpoint는 404일 수 있어 새로고침이 필요하다. 리다이렉트 생성·CloudFront 정책은 이번 변경으로 바꾸지 않는다.

#### Step 9: Invalidate CloudFront cache

```yaml
- name: Invalidate CloudFront cache
  run: |
    aws cloudfront create-invalidation \
      --distribution-id ${{ env.CLOUDFRONT_DISTRIBUTION_ID }} \
      --paths "/*"
```

- `/*`: 전체 캐시 무효화. SSG 특성상 빌드마다 다수 페이지가 변경될 수 있으므로 전체 무효화가 적합.
- CloudFront 무효화는 월 1,000건 무료. `/*`는 1건으로 계산됨.

## 6. 코드 변경 사항 (se 에이전트 위임)

### 6-1. SITE_URL 환경변수 대응 (P1)

`astro.config.mjs`에서 `getSiteUrlFromEnv(process.env.PUBLIC_STAGE)`를 읽어 Astro의 `site` 옵션에 전달. `packages/config/site.ts`의 production 기본값은 `https://eunminlog.site`(apex)로 유지한다. 구체적인 도메인은 [`secrets-reference.md`](secrets-reference.md) 섹션 3을 참조.

운영 환경에서는 CloudFront Function이 `www.eunminlog.site/*` 요청을 path/query string 보존 상태로 `eunminlog.site/*`에 301 리다이렉트한다.

### 6-2. Workflow 파일 생성 (P0)

`.github/workflows/deploy-client.yml` 파일을 섹션 5의 설계대로 생성.

## 7. 빌드 최적화 고려사항

### 로컬 Turbo 캐시

`turbo.json`의 `cacheDir`을 `.turbo/cache`로 명시하여 각 체크아웃·워크트리 내부에 캐시를 저장한다. Git worktree에서 원본 저장소의 공유 캐시를 자동 선택하면 Codex의 쓰기 허용 범위 밖 경로에 접근하여 `Operation not permitted`가 발생할 수 있다. 명시한 경로는 워크트리별 캐시를 사용하므로 워크트리 간 캐시 공유는 하지 않는다. GitHub Actions의 client 배포는 Turbo 대신 `pnpm --filter @eunminlog/client build`를 직접 실행하며, Astro 캐시는 아래 별도 단계로 보존한다.

### Astro 빌드 캐시 보존

`deploy-client.yml`은 의존성 설치·환경 설정 후 `actions/cache/restore@v4`로 `apps/client/node_modules/.astro`를 복원하고, Client 빌드 성공 직후 `actions/cache/save@v4`로 같은 경로를 저장한다. 배포 단계가 실패해도 성공한 빌드 캐시는 저장되며 빌드 실패 시 저장 단계는 실행하지 않는다. `dist`나 `node_modules` 전체를 저장하지 않는다.

캐시 키는 버전 접두사·OS·Node 24·브랜치·`PUBLIC_STAGE`·lockfile/astro.config 해시·run ID·run attempt를 포함한다. GitHub 캐시는 같은 키를 덮어쓸 수 없으므로 실행별 새 키로 저장하고, 같은 브랜치·환경·lock/config 접두사의 최신 캐시만 복원한다. 동일 커밋으로 콘텐츠 빌드를 반복해도 새 결과를 저장하며 main/develop 간 캐시를 섞지 않는다. 캐시 미스 시 정상적으로 전체 빌드한다.

`incrementalBuild`를 활성화했고 상세·대분류·소분류·다국어 홈의 `getStaticPaths()`에서 페이지별 `cacheKey`를 반환한다. 데이터·공개 환경값·현재 연도를 모델에 반영하고 Astro가 코드 의존성을 함께 검사한다. 한국어 홈·검색·피드 JSON 등 키가 없는 출력은 계속 생성한다. 캐시를 비우거나 `astro build --force`를 실행하면 전체를 다시 렌더링하고 새 캐시를 기록한다. 실행별 캐시는 저장 용량을 소비하므로 실제 캐시 크기와 복원·저장 시간, 저장소 캐시 사용량을 확인한다. 로컬의 증분/강제 빌드 출력 비교와 GitHub Actions 서버의 실제 저장·복원을 검증했다. 2026-10-17 main의 첫 실행은 캐시 미스 후 저장했고, 동일 커밋을 재실행해 이전 실행 키 복원 및 434개 경로 재사용을 확인했다. 압축 캐시는 약 1.63MiB, Astro 내부 빌드는 첫 실행 8.68초·복원 실행 8.96초였다. 캐시 복원은 정상이나 이 두 실행에서 추가 시간 단축은 확인되지 않았다. [첫 실행](https://github.com/semnil5202/eunminlog/actions/runs/38999821486), [복원 검증](https://github.com/semnil5202/eunminlog/actions/runs/38999940802)은 모두 S3/CloudFront 배포까지 성공했다. 자동 검증은 `pnpm --filter @eunminlog/client test:incremental`을 사용한다. 수집·키 범위·측정 한계는 [architecture.md](architecture.md)의 Client 빌드 데이터 재사용·증분 빌드를 참조한다.

### Turbo Remote Cache (향후)

현재는 GitHub Actions의 pnpm store와 Astro cacheDir 보존을 사용. 빌드 빈도가 높아지면 Turbo Remote Cache(Vercel 또는 self-hosted)를 도입하여 빌드 결과물 자체를 캐싱할 수 있다.

### Admin → GitHub Actions 빌드 트리거 (workflow_dispatch)

> Date: 2026-03-07 (확정)
> 상세 Admin 측 스펙: [`docs/admin-specs.md`](admin-specs.md) Section 4-6

Admin에서 게시글 작성/수정, 카테고리 변경 시 Server Action 내부에서 GitHub API `workflow_dispatch`를 호출하여 Client SSG 빌드를 자동 트리거한다.

#### Workflow 트리거 변경

기존 `push` 트리거에 `workflow_dispatch`를 추가한다. `push`와 `workflow_dispatch`는 독립적으로 동작하며 양쪽 모두 빌드를 실행할 수 있다.

```yaml
on:
  push:
    branches: [main, develop]
    paths:
      - 'apps/client/**'
      - 'packages/config/**'
      - 'packages/tsconfig/**'
      - 'pnpm-lock.yaml'
      - 'infra/**'
      - '.github/workflows/deploy-client.yml'
  workflow_dispatch: # Admin Server Action에서 호출
```

**`workflow_dispatch`에 `inputs`를 두지 않는 이유**: Admin이 `ref` 파라미터(main/develop)로 대상 브랜치를 지정하여 호출하므로, 워크플로우 측에서 별도 input을 받을 필요가 없다. 기존 Step 5의 `github.ref_name` 분기가 `workflow_dispatch`에서도 동일하게 동작한다.

#### 트리거 주체별 동작

| 트리거              | 발생 조건                                            | 브랜치 결정         |
| ------------------- | ---------------------------------------------------- | ------------------- |
| `push`              | client 관련 파일이 포함된 커밋이 main/develop에 push | push된 브랜치       |
| `workflow_dispatch` | Admin Server Action에서 API 호출                     | API body의 `ref` 값 |

#### 중복 빌드 가능성

Admin에서 게시글을 저장하면 `workflow_dispatch`로 빌드가 트리거되고, 같은 시점의 코드 push도 별도 실행을 만들 수 있다. 해시 배포 목록·복구 journal을 동시에 갱신하면 정합성이 깨지므로 대상 환경별 `concurrency`를 적용한다.

```yaml
concurrency:
  group: deploy-client-${{ github.ref_name == 'main' && 'production' || 'development' }}
  cancel-in-progress: false
```

실행 중 배포를 취소하지 않고 같은 환경은 직렬화한다. GitHub의 대기 실행은 후속 실행으로 대체될 수 있으므로 모든 트리거를 순서대로 배포하는 큐는 아니며, main과 development는 별도 버킷·관리 목록을 사용한다.

#### Admin 측 환경변수 (Vercel)

Admin(Next.js)이 Vercel에 배포되어 있으므로, Vercel 프로젝트 환경변수 설정이 필요하다. 키 목록은 [`secrets-reference.md`](secrets-reference.md) 섹션 1-2를 참조.

### Path Filter (적용 완료)

client 관련 파일 변경 시에만 배포 워크플로우가 실행되도록 path filter 적용:

```yaml
paths:
  - 'apps/client/**'
  - 'packages/config/**'
  - 'packages/tsconfig/**'
  - 'pnpm-lock.yaml'
  - 'infra/**'
  - '.github/workflows/deploy-client.yml'
```

admin 코드만 변경 후 push해도 client 배포가 실행되지 않는다.

## 8. Rollback 전략

SSG 특성상 rollback은 단순하다:

1. **Git revert + re-deploy**: 문제 커밋을 revert하고 push하면 자동으로 이전 상태로 재빌드.
2. **S3 버전 관리**: S3 버킷에 버전 관리를 활성화하면 이전 파일 버전으로 복원 가능. (현재 미적용, 향후 검토)

## 9. 301 리다이렉트 매핑 + CF Function 업데이트

> 상세 스펙: [`docs/redirect-specs.md`](redirect-specs.md)

slug 변경 시 이전 URL → 새 URL 301 리다이렉트를 CloudFront Function에서 처리한다. 빌드 파이프라인에서 리다이렉트 매핑을 생성하고 CF Function 코드에 인라인 삽입한다.

### 9-1. Step 7: Generate redirect mappings + CF Function code

빌드 완료 후, S3 배포 전에 실행:

1. Supabase에서 `prev_slug IS NOT NULL`인 posts, categories 조회
2. 매핑 오브젝트 생성 (키 축약으로 크기 최소화)
3. CF Function 템플릿(`infra/cf-functions/viewer-request.js.template`)에 매핑 데이터 인라인 삽입

### 9-2. Step 10: Update CloudFront Function

S3 배포 후, 캐시 무효화 전에 실행:

```yaml
- name: Update CloudFront Function
  run: |
    ETAG=$(aws cloudfront describe-function \
      --name ${{ env.CF_FUNCTION_NAME }} \
      --query 'ETag' --output text)
    aws cloudfront update-function \
      --name ${{ env.CF_FUNCTION_NAME }} \
      --function-config '{"Comment":"viewer-request with redirects","Runtime":"cloudfront-js-2.0"}' \
      --function-code fileb://infra/cf-functions/viewer-request.js \
      --if-match $ETAG
    ETAG=$(aws cloudfront describe-function \
      --name ${{ env.CF_FUNCTION_NAME }} \
      --query 'ETag' --output text)
    aws cloudfront publish-function \
      --name ${{ env.CF_FUNCTION_NAME }} \
      --if-match $ETAG
```

### 9-3. 추가 IAM 권한

> IAM 정책 JSON은 [`secrets-reference.md` 섹션 9-2](secrets-reference.md#9-2-cloudfront-function-업데이트-정책)를 참조한다.

### 9-4. 추가 GitHub Secrets

dev/prod 각각 별도의 CF Function을 사용한다. 기존에는 단일 함수를 공유했으나, dev 배포 시 prod 함수가 덮어쓰이는 문제가 발생하여 분리하였다.

CF Function 이름 및 시크릿 키는 [`secrets-reference.md`](secrets-reference.md) 섹션 2-2를 참조한다.

### 9-5. 환경 변수 분기 추가 (Step 5)

Step 5에서 브랜치 기준으로 `CF_FUNCTION_NAME`을 분기한다. `main` 브랜치는 `PROD_CF_FUNCTION_NAME`, `develop` 브랜치는 `DEV_CF_FUNCTION_NAME` 시크릿을 사용한다. 시크릿 키는 [`secrets-reference.md`](secrets-reference.md) 섹션 2-2를 참조.

## 10. Checklist (구현 전 확인)

- [ ] AWS IAM 사용자 생성 + 정책 연결 (섹션 3-4 참조)
- [ ] GitHub Secrets 등록 — 키 목록은 [`docs/secrets-reference.md`](secrets-reference.md) 참조
- [ ] S3 버킷 존재 확인 (버킷명은 [`secrets-reference.md`](secrets-reference.md) 참조)
- [ ] CloudFront OAC 설정 확인 (S3 퍼블릭 액세스 차단 상태에서 CF가 접근 가능한지)
- [ ] CloudFront Function 연결 확인 (Viewer Request — URI를 index.html로 매핑)
- [ ] `develop` 브랜치 생성 (현재 `main`만 존재하는 경우)
- [ ] se 에이전트: `astro.config.mjs` SITE_URL 환경변수 대응 코드 변경
- [ ] se 에이전트: `.github/workflows/deploy-client.yml` 파일 생성
- [ ] IAM 정책 업데이트: CF Function 권한 추가 (섹션 9-3 참조)
- [ ] CF Function 템플릿 파일 생성: `infra/cf-functions/viewer-request.js.template`
- [ ] 리다이렉트 매핑 생성 빌드 스크립트 구현
