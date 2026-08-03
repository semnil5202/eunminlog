---
name: deploy
description: develop 브랜치를 push하고 main에 merge 후 push, 다시 develop으로 복귀
user_invocable: true
---

# deploy

develop → push → main checkout → merge develop → push → develop 복귀를 한 번에 실행합니다. `main` push 성공을 배포 작업의 완료 조건으로 사용하며 GitHub Actions 실행 완료는 추적하지 않습니다.

## Steps

1. `/update-docs` 스킬 실행 (docs 동기화)
2. docs 변경사항이 있으면 커밋 후 **사용자에게 변경 내용을 보여주고 확인을 받는다**. 승인 시 다음 단계 진행.
3. `git push origin develop`
4. `git checkout main`
5. `git merge develop`
6. `git push origin main`
7. `git checkout develop`
8. `main` push 성공과 `develop` 복귀를 보고하고 종료한다. `gh run list`, `gh run watch` 등으로 GitHub Actions 시작·완료 여부를 조회하거나 대기하지 않는다.

**Step 2 확인 완료 후**, Step 3~7을 단일 Bash 명령으로 실행:

```bash
git push origin develop && git checkout main && git merge develop && git push origin main && git checkout develop
```
