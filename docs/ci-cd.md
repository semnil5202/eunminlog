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

| 항목       | Production                   | Development                  |
| ---------- | ---------------------------- | ---------------------------- |
| 브랜치     | `main`                       | `develop`                    |
| S3 버킷    | `prod-eunminlog-static`      | `dev-eunminlog-static`       |
| 도메인     | `https://www.eunminlog.site` | `https://dev.eunminlog.site` |
| CloudFront | prod Distribution ID         | dev Distribution ID          |
| SITE_URL   | `https://www.eunminlog.site` | `https://dev.eunminlog.site` |

## 3. GitHub Secrets 목록

### 3-1. AWS Credentials (공통)

| Secret Name             | 설명                  | 비고                      |
| ----------------------- | --------------------- | ------------------------- |
| `AWS_ACCESS_KEY_ID`     | IAM 사용자 Access Key | S3 + CloudFront 권한 필요 |
| `AWS_SECRET_ACCESS_KEY` | IAM 사용자 Secret Key |                           |

### 3-2. CloudFront Distribution ID (환경별)

| Secret Name                       | 설명                                   |
| --------------------------------- | -------------------------------------- |
| `PROD_CLOUDFRONT_DISTRIBUTION_ID` | Production CloudFront Distribution ID  |
| `DEV_CLOUDFRONT_DISTRIBUTION_ID`  | Development CloudFront Distribution ID |

### 3-3. Supabase (환경별, 빌드 타임 필요)

> 현재는 mock 데이터로 빌드 중이므로 당장은 불필요. Supabase 연동 시 추가.

| Secret Name              | 설명                               |
| ------------------------ | ---------------------------------- |
| `PROD_SUPABASE_URL`      | Production Supabase Project URL    |
| `PROD_SUPABASE_ANON_KEY` | Production Supabase Anonymous Key  |
| `DEV_SUPABASE_URL`       | Development Supabase Project URL   |
| `DEV_SUPABASE_ANON_KEY`  | Development Supabase Anonymous Key |

### 3-4. 필요한 IAM 정책

배포용 IAM 사용자에게 아래 권한을 부여해야 한다:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "S3Deploy",
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:DeleteObject", "s3:ListBucket", "s3:GetObject"],
      "Resource": [
        "arn:aws:s3:::prod-eunminlog-static",
        "arn:aws:s3:::prod-eunminlog-static/*",
        "arn:aws:s3:::dev-eunminlog-static",
        "arn:aws:s3:::dev-eunminlog-static/*"
      ]
    },
    {
      "Sid": "CloudFrontInvalidation",
      "Effect": "Allow",
      "Action": "cloudfront:CreateInvalidation",
      "Resource": "*"
    }
  ]
}
```

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

```yaml
- name: Set environment variables
  run: |
    if [ "${{ github.ref_name }}" = "main" ]; then
      echo "S3_BUCKET=prod-eunminlog-static" >> $GITHUB_ENV
      echo "CLOUDFRONT_DISTRIBUTION_ID=${{ secrets.PROD_CLOUDFRONT_DISTRIBUTION_ID }}" >> $GITHUB_ENV
      echo "SITE_URL=https://www.eunminlog.site" >> $GITHUB_ENV
    else
      echo "S3_BUCKET=dev-eunminlog-static" >> $GITHUB_ENV
      echo "CLOUDFRONT_DISTRIBUTION_ID=${{ secrets.DEV_CLOUDFRONT_DISTRIBUTION_ID }}" >> $GITHUB_ENV
      echo "SITE_URL=https://dev.eunminlog.site" >> $GITHUB_ENV
    fi
```

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

```yaml
- uses: aws-actions/configure-aws-credentials@v4
  with:
    aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
    aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
    aws-region: ap-northeast-2
```

#### Step 8: Deploy to S3

```yaml
- name: Deploy to S3
  run: aws s3 sync apps/client/dist/ s3://${{ env.S3_BUCKET }} --delete
```

- `--delete`: S3에 있지만 로컬 dist에 없는 파일 삭제. 이전 빌드의 잔여 파일 정리.
- `dist/` 내부만 동기화 (전체 monorepo가 아님).

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

현재 `packages/config/site.ts`에서 `SITE_URL`이 하드코딩되어 있다:

```typescript
// 현재 (하드코딩)
export const SITE_URL = 'https://www.eunminlog.site';
```

CI/CD에서 환경별로 다른 도메인을 사용하려면 빌드 타임 환경변수를 지원해야 한다.

**Astro의 환경변수 처리 방식**: Astro는 Vite 기반으로 빌드 타임에 `import.meta.env` 값을 인라인한다. 그러나 `packages/config/site.ts`는 Astro 앱이 아닌 공유 패키지이므로 `import.meta.env`를 직접 사용할 수 없다.

**권장 방안**: `astro.config.mjs`에서 `process.env.SITE_URL`을 읽어 Astro의 `site` 옵션에 전달하고, `packages/config/site.ts`의 하드코딩 값은 기본값(fallback)으로 유지한다.

```typescript
// packages/config/site.ts — 변경 없음 (기본값 역할 유지)
export const SITE_URL = 'https://www.eunminlog.site';
```

```javascript
// apps/client/astro.config.mjs — 변경
import { SITE_URL as DEFAULT_SITE_URL } from '@eunminlog/config/site';

export default defineConfig({
  site: process.env.SITE_URL || DEFAULT_SITE_URL,
  // ...
});
```

이렇게 하면:

- 로컬 개발: 환경변수 없으면 기본값 `https://www.eunminlog.site` 사용
- CI/CD prod: `SITE_URL=https://www.eunminlog.site` (기본값과 동일)
- CI/CD dev: `SITE_URL=https://dev.eunminlog.site` 주입

> **Note**: `packages/config/site.ts`를 import하는 다른 코드(Layout.astro 등)는 변경 불필요. Astro config의 `site` 값만 환경별로 달라지면 sitemap, canonical URL이 자동으로 맞춰진다.

### 6-2. Workflow 파일 생성 (P0)

`.github/workflows/deploy-client.yml` 파일을 섹션 5의 설계대로 생성.

## 7. 빌드 최적화 고려사항

### Turbo Remote Cache (향후)

현재는 GitHub Actions의 pnpm store 캐싱만 사용. 빌드 빈도가 높아지면 Turbo Remote Cache(Vercel 또는 self-hosted)를 도입하여 빌드 결과물 자체를 캐싱할 수 있다.

### 빌드 트리거 최적화 (향후)

현재 설계: main/develop에 push할 때마다 빌드. 향후 admin에서 "게시" 버튼을 누를 때 GitHub API로 workflow_dispatch를 호출하는 방식으로 전환 가능 (architecture.md의 "Node.js Logic이 GitHub Actions에 빌드 트리거 API 호출" 참조).

```yaml
on:
  push:
    branches: [main, develop]
  workflow_dispatch: # Admin에서 수동 트리거 (향후)
    inputs:
      environment:
        description: 'Target environment'
        required: true
        type: choice
        options: [production, development]
```

### Path Filter (적용 완료)

client 관련 파일 변경 시에만 배포 워크플로우가 실행되도록 path filter 적용:

```yaml
paths:
  - 'apps/client/**'
  - 'packages/config/**'
  - 'packages/tsconfig/**'
  - 'pnpm-lock.yaml'
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

```json
{
  "Sid": "CloudFrontFunctionUpdate",
  "Effect": "Allow",
  "Action": [
    "cloudfront:DescribeFunction",
    "cloudfront:UpdateFunction",
    "cloudfront:PublishFunction"
  ],
  "Resource": "*"
}
```

### 9-4. 추가 GitHub Secrets

| Secret Name              | 설명                        |
| ------------------------ | --------------------------- |
| `PROD_CF_FUNCTION_NAME` | Production CF Function 이름  |
| `DEV_CF_FUNCTION_NAME`  | Development CF Function 이름 |

### 9-5. 환경 변수 분기 추가 (Step 5)

```yaml
# 기존 환경 변수 분기에 추가
echo "CF_FUNCTION_NAME=${{ secrets.PROD_CF_FUNCTION_NAME }}" >> $GITHUB_ENV  # main
echo "CF_FUNCTION_NAME=${{ secrets.DEV_CF_FUNCTION_NAME }}" >> $GITHUB_ENV   # develop
```

## 10. Checklist (구현 전 확인)

- [ ] AWS IAM 사용자 생성 + 정책 연결 (섹션 3-4 참조)
- [ ] GitHub Secrets 등록: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`
- [ ] GitHub Secrets 등록: `PROD_CLOUDFRONT_DISTRIBUTION_ID`, `DEV_CLOUDFRONT_DISTRIBUTION_ID`
- [ ] S3 버킷 존재 확인: `prod-eunminlog-static`, `dev-eunminlog-static`
- [ ] CloudFront OAC 설정 확인 (S3 퍼블릭 액세스 차단 상태에서 CF가 접근 가능한지)
- [ ] CloudFront Function 연결 확인 (Viewer Request — URI를 index.html로 매핑)
- [ ] `develop` 브랜치 생성 (현재 `main`만 존재하는 경우)
- [ ] se 에이전트: `astro.config.mjs` SITE_URL 환경변수 대응 코드 변경
- [ ] se 에이전트: `.github/workflows/deploy-client.yml` 파일 생성
- [ ] GitHub Secrets 등록: `PROD_CF_FUNCTION_NAME`, `DEV_CF_FUNCTION_NAME` (리다이렉트)
- [ ] IAM 정책 업데이트: CF Function 권한 추가 (섹션 9-3 참조)
- [ ] CF Function 템플릿 파일 생성: `infra/cf-functions/viewer-request.js.template`
- [ ] 리다이렉트 매핑 생성 빌드 스크립트 구현
- [ ] Supabase 빌드 타임 접속 정보 GitHub Secrets 등록 (리다이렉트 매핑 조회용)
