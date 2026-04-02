---
name: deploy
description: develop 브랜치를 push하고 main에 merge 후 push, 다시 develop으로 복귀
user_invocable: true
---

# deploy

develop → push → main checkout → merge develop → push → develop 복귀를 한 번에 실행합니다.

## Steps

1. `git push origin develop`
2. `git checkout main`
3. `git merge develop`
4. `git push origin main`
5. `git checkout develop`

단일 Bash 명령으로 실행:

```bash
git push origin develop && git checkout main && git merge develop && git push origin main && git checkout develop
```
