# 수동 S3 고아 이미지 정리

## 범위

`infra/scripts/cleanup-orphan-media.mjs`는 Node.js 24와 AWS CLI v2로 실행한다. 의존성 설치, DB 마이그레이션, GitHub Actions 등록 없이 사용한다. 기본은 조회와 로컬 보고서 저장이며 S3/DB를 변경하지 않는다.

- `--env dev|prod`는 **후보를 찾을 미디어 버킷**을 선택한다. 현재 Git 브랜치나 앱 `.env`에서 환경을 추론하지 않는다.
- 양쪽 DB의 `posts` 본문·썸네일·이미지 메타데이터, `post_translations`, `post_drafts`의 폼·번역·이미지 메타데이터를 항상 모두 조회한다. 환경 간 URL 재사용과 공유 미디어 버킷을 보호한다. 다른 환경에 같은 UUID 경로가 있으면 보수적으로 양쪽을 보호한다.
- DB 페이지의 `Content-Range` 시작 위치는 요청 offset과, 끝 위치는 실제 응답 행 수와 대조한다. 전체 개수 초과·범위 불일치 시 중단하며, 서버가 요청 상한보다 적게 반환하는 정상 페이지는 허용한다. 추가 API 호출은 없다.
- 양쪽 정적 배포 버킷의 HTML/JSON/JS/CSS/XML/TXT/SVG도 조회한다. DB에서 지워도 배포본이 참조하면 보존한다. 권한 오류, DB 페이지 누락, 배포 HTML 부재, 배포 중 파일 변경 시 중단한다.
- 관리 대상은 `posts/YYYY/MM/UUID.webp|jpg`와 `_688`, `_og` 파생 파일뿐이다. 한 파일이라도 참조되거나 최근 7일 내 변경되면 묶음 전체를 보호한다. 다른 파일명은 `unmanaged`로 제외해 수동 검토한다.
- 폰트, 정적 사이트 파일, S3 과거 버전, 불완전한 multipart upload는 삭제하지 않는다. 사진 내용이 같은 다른 URL을 중복 제거하는 기능도 아니다.

## 환경 준비

```bash
mkdir -p .media-cleanup
cp infra/scripts/media-cleanup.config.example.json .media-cleanup/config.json
```

설정의 dev/prod별 AWS profile, 리전, 계정 ID, 미디어 버킷, 정적 배포 버킷을 실제 값으로 채운다. `.media-cleanup/`은 Git에서 제외된다. 예시에는 실제 운영 자원이나 기본 환경을 하드코딩하지 않았다.

- `awsProfile`과 `accountId`: STS 계정과 대조한다. S3 요청에 예상 소유 계정도 지정한다. 이 버전은 호출 계정과 버킷 소유 계정이 같은 구성을 전제로 한다.
- `mediaBucket`: Admin의 `AWS_S3_BUCKET`. Client 정적 배포 버킷과 혼동하지 않는다. 실제로 미디어 버킷을 공유하면 양쪽에 같은 값을 넣을 수 있다.
- `staticBucket`: 해당 환경 Client가 실제 배포된 버킷. 빈/미배포 환경을 안전한 빈 참조로 취급하지 않는다.

기존 환경별 자격 증명을 `.media-cleanup/credentials.env`에 준비한다. JSON에는 키 값 대신 환경변수 이름만 둔다. 새로운 앱 환경변수는 추가하지 않는다. 실제 값은 [secrets-reference.md](secrets-reference.md) 섹션 2-3, 3, 12 참조. 해당 로컬 문서가 없는 작업 환경에서는 운영자가 값을 제공해야 한다.

RLS로 참조가 누락되지 않도록 secret/service_role 키만 허용한다. 두 DB URL이 같으면 환경 오입력으로 판단해 중단한다. 키는 보고서나 AWS CLI 인수에 기록하지 않는다. Node의 `--env-file`은 이미 셸에 있는 같은 이름의 변수를 덮어쓰지 않으므로 실행 전에 환경 매핑을 확인한다.

## 1. 삭제 없는 후보 조회

```bash
node --env-file=.media-cleanup/credentials.env infra/scripts/cleanup-orphan-media.mjs \
  --env dev --config .media-cleanup/config.json \
  --report .media-cleanup/dev-2026-09-26.json --dry-run

node --env-file=.media-cleanup/credentials.env infra/scripts/cleanup-orphan-media.mjs \
  --env prod --config .media-cleanup/config.json \
  --report .media-cleanup/prod-2026-09-26.json --dry-run
```

날짜는 실제 실행일로 바꾼다. 보고서는 덮어쓰지 않는다. 후보 키·ETag·수정 시각·크기, 제외 사유별 개수, 양쪽 DB/배포본 조회 개수, 후보 총용량, 환경 설정 식별값을 기록한다. 원문 글과 자격 증명은 넣지 않지만 파일 경로도 운영 정보이므로 외부에 공개하지 않는다.

수동 버전은 DB 후보 테이블 대신 **이 보고서 파일을 유예기간 동안 보관**한다. 두 실행 사이 계속 미사용이었다는 사실까지 추적하지는 않는다. 보고서를 수작업으로 수정해 유예기간을 우회하지 않는다. 스케줄러는 추가하지 않았다.

## 2. 최소 7일 후 명시적 삭제

삭제 전에 다음을 모두 확인한다.

1. 후보 목록과 용량을 검토한다.
2. **양쪽 환경의 편집·업로드·게시글 저장·배포를 중지하고 열린 편집 탭을 정리**한다. 브라우저의 미저장 상태·Undo 이력이나 다른 프로세스의 동시 저장을 자동 잠글 수는 없다.
3. 마지막 배포와 CloudFront 무효화가 완료되었는지 확인한다. 정적 버킷 검사는 CDN/브라우저에 남은 과거 페이지까지 보장하지 않는다.
4. 버킷 버전 관리/백업 상태를 확인한다. 비버전 버킷은 영구 삭제다. 버전 관리가 활성화되면 삭제 마커만 추가되고 과거 버전이 남아 **저장 비용이 바로 줄지 않을 수 있다**.

```bash
node --env-file=.media-cleanup/credentials.env infra/scripts/cleanup-orphan-media.mjs \
  --env dev --config .media-cleanup/config.json \
  --report .media-cleanup/dev-2026-09-26.json \
  --apply --confirm-bucket '<실제-dev-미디어-버킷명>' --maintenance-confirmed
```

prod는 `--env prod`, prod 보고서, 실제 prod 버킷명을 함께 지정한다. 공유 버킷이면 선택 환경과 관계없이 같은 대상이므로 중복 실행할 필요가 없다.

- 7일 이상 지난 **동일 환경·동일 설정** 보고서만 허용한다. 삭제 직전에 양쪽 DB·배포본·대상 S3를 재조회한다. 새 참조, ETag/크기/수정 시각 변경, 새로운 파생 파일이 있는 묶음은 제외한다.
- 상한은 한 번에 100개 **S3 객체**다. 원본·파생 파일은 각각 1개다. 초과하면 일부만 자르지 않고 중단한다. 검토 후 `--max-delete 200`처럼 조정할 수 있다.
- 정확한 키·ETag 조건(`If-Match`)으로 삭제하며 실패 시 중단한다. 앞서 처리된 파일까지 되돌리는 트랜잭션은 아니다.
- 보고서 옆 `.apply-<시각>.jsonl`에 요청 전·성공·실패/결과 불명과 삭제 마커 버전 ID를 남긴다. 연결이 끊겨 결과가 불명확하면 AWS에서 실제 상태를 확인한다. 원본 보고서는 보존하므로 재실행 시 남은 후보를 다시 검증한다.

`--maintenance-confirmed`는 운영자의 확인이지 기술적인 잠금이 아니다. 무중단 자동 정리에는 향후 업로드/참조 테이블과 동시성 제어가 필요하다. 미배포 환경을 건너뛰거나 조회 오류를 무시하는 우회 옵션은 없다.

## 권한·비용·검증

- 조회: STS 조회, 대상 미디어와 양쪽 정적 버킷의 `s3:ListBucket`, 정적 텍스트의 `s3:GetObject`, 대상 미디어의 `s3:GetBucketVersioning`.
- 삭제 권한은 별도로 승인해 대상 미디어 버킷의 `posts/*`에만 `s3:DeleteObject`를 허용한다. 과거 버전 삭제, CloudFront 변경, DB 쓰기, IAM/Lifecycle 설정은 수행하지 않는다.
- dry-run도 S3 LIST/GET과 배포 텍스트 다운로드가 발생한다. 전체 이미지 파일은 받지 않는다. 큰 규모에서는 S3 Inventory와 배포 이미지 참조 manifest를 검토한다.

```bash
node --test infra/scripts/cleanup-orphan-media.test.mjs
node infra/scripts/cleanup-orphan-media.mjs --help
```

테스트는 모의 AWS/DB만 사용하며 실제 계정 접근·삭제 검증을 대신하지 않는다. 참고: [AWS 조건부 삭제](https://docs.aws.amazon.com/cli/latest/reference/s3api/delete-object.html), [Supabase API 키](https://supabase.com/docs/guides/api/api-keys).
