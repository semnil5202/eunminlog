---
name: update-docs
description: 코드 변경사항을 관련 docs에 동기화한다
user_invocable: true
---

# update-docs

코드 변경사항을 감지하고 관련 docs/\*.md 파일을 업데이트한다.

## Steps

1. 변경 파일 수집: `git diff --name-only origin/main...HEAD`
2. AGENTS.md의 "Docs 동기화 규칙" 매핑으로 관련 docs 식별
3. 변경된 코드와 해당 docs를 읽어서 불일치 파악
4. docs 파일 업데이트
5. 변경 요약 출력

## 매핑 규칙

| 변경 경로                                                                                       | 대상 docs                                        |
| ----------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `apps/client/src/layouts/`, `apps/client/src/styles/`, `apps/client/src/features/*/components/` | `docs/ui-specs.md`                               |
| `apps/client/src/shared/lib/analytics/`                                                         | `docs/ga4-tracking.md`                           |
| `apps/admin/src/features/`                                                                      | `docs/admin-specs.md`                            |
| `.github/workflows/`                                                                            | `docs/ci-cd.md`                                  |
| `infra/`                                                                                        | `docs/ci-cd.md`, `docs/redirect-specs.md`        |
| `apps/client/src/pages/` (URL 구조 변경)                                                        | `docs/seo-strategy.md`, `docs/redirect-specs.md` |
| `packages/config/` (테마 변경)                                                                  | `docs/theme.md`                                  |
| DB 마이그레이션                                                                                 | `docs/database.md`                               |
| 환경변수 추가                                                                                   | `docs/secrets-reference.md`                      |
| `apps/client/src/layouts/Layout.astro` (head 스크립트)                                          | `docs/ga4-tracking.md`                           |

## 수정 원칙

- **코드 파일은 절대 수정하지 않는다.** docs/\*.md 파일만 수정한다.
- 기존 문서의 섹션 구조를 유지하면서 해당 섹션에 내용 추가/수정
- 현재 코드와 불일치하는 오래된 내용은 현재 상태로 업데이트
- 새 기능은 기존 섹션 체계에 맞춰 추가
- 삭제된 기능은 문서에서도 제거
- 관련 없는 docs는 건드리지 않는다

## 실행

```bash
# 변경 파일 목록 수집
CHANGED=$(git diff --name-only origin/main...HEAD)

# 관련 docs 식별 후 각 docs 파일을 읽고 코드와 대조하여 업데이트
```

수정 완료 후:

```bash
git add --all -- ':!HANDOFF.md' ':!.superset' ':!check-dashboard.md' ':!ga4-dashboard-setup.md'
```
