# CI/CD Pipeline — GitHub Actions

> Date: 2026-03-02 (2026-03-06 리다이렉트 매핑 + CF Function 업데이트 추가)
> Status: Draft (PM 작성, 승인 후 se가 구현)

## 1. Overview

Astro SSG 클라이언트 앱(`apps/client`)을 GitHub Actions로 자동 빌드하여 AWS S3에 배포하고, CloudFront 캐시를 무효화하는 파이프라인. CloudFront Function(Viewer Request)이 하위 경로를 `index.html`로 매핑하여 S3 REST API의 경로 해석 제약을 보완한다.

```
Push to main/develop
  → GitHub Actions Trigger
    → pnpm install (monorepo 전체)
    → pnpm --filter @eunminlog/client build
    → aws s3 sync dist/ → S3 버킷
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

```yaml
- name: Build client
  run: pnpm --filter @eunminlog/client build
  env:
    SITE_URL: ${{ env.SITE_URL }}
```

`pnpm --filter @eunminlog/client build`를 사용하는 이유:

- `pnpm build` (turbo build)는 admin 포함 전체 빌드. admin은 배포 대상이 아니므로 불필요.
- filter 빌드는 turbo의 `dependsOn: ["^build"]`에 의해 의존 패키지(config, tsconfig)는 자동 빌드됨.
- 빌드 시간 절약 + 불필요한 admin 빌드 에러 방지.

#### Step 7: Configure AWS credentials

`aws-actions/configure-aws-credentials@v4`로 AWS 자격 증명 설정. 시크릿 키 목록은 [`secrets-reference.md`](secrets-reference.md) 섹션 2-1을 참조.

#### Step 8: Deploy to S3

파일 유형별 `Cache-Control` 분리 배포:

```yaml
- name: Deploy to S3 (HTML — no-cache)
  run: |
    aws s3 sync apps/client/dist/ s3://${{ env.S3_BUCKET }} \
      --exclude "*" --include "*.html" \
      --cache-control "no-cache" \
      --delete

- name: Deploy to S3 (static assets — long cache)
  run: |
    aws s3 sync apps/client/dist/ s3://${{ env.S3_BUCKET }} \
      --exclude "*.html" \
      --cache-control "public, max-age=31536000, immutable" \
      --delete
```

- **HTML** (`no-cache`): 브라우저가 매번 서버에 재검증. SSG 빌드마다 내용이 바뀌므로 장기 캐시하면 안 됨.
- **정적 에셋** (`max-age=1년, immutable`): Astro가 파일명에 해시를 포함하므로 내용 변경 시 URL이 바뀜. 장기 캐시 안전.
- `--delete`: S3에 있지만 로컬 dist에 없는 파일 삭제. 이전 빌드의 잔여 파일 정리.

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

`astro.config.mjs`에서 `process.env.SITE_URL`을 읽어 Astro의 `site` 옵션에 전달. `packages/config/site.ts`의 하드코딩 값은 기본값(fallback)으로 유지. 구체적인 도메인은 [`secrets-reference.md`](secrets-reference.md) 섹션 3을 참조.

### 6-2. Workflow 파일 생성 (P0)

`.github/workflows/deploy-client.yml` 파일을 섹션 5의 설계대로 생성.

## 7. 빌드 최적화 고려사항

### Turbo Remote Cache (향후)

현재는 GitHub Actions의 pnpm store 캐싱만 사용. 빌드 빈도가 높아지면 Turbo Remote Cache(Vercel 또는 self-hosted)를 도입하여 빌드 결과물 자체를 캐싱할 수 있다.

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

Admin에서 게시글을 저장하면 `workflow_dispatch`로 빌드가 트리거된다. 동시에 client 코드를 push하면 `push` 트리거로도 빌드가 실행될 수 있다. GitHub Actions는 동일 워크플로우의 concurrent run을 허용하므로 두 빌드가 병렬 실행된다. 이는 SSG 특성상 문제가 되지 않는다 (마지막 빌드의 S3 sync가 최종 상태를 반영).

향후 빌드 빈도가 높아지면 `concurrency` 옵션으로 동시 실행을 제한할 수 있다:

```yaml
concurrency:
  group: deploy-client-${{ github.ref }}
  cancel-in-progress: true
```

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
