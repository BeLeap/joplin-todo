# APK Actions 속도 개선 재조정: lock 구간 유지 + 태그 Job 경량화

## 배경
- 이전 수정에서 태그/빌드 Job을 하나로 합치면서 전체 Job에 concurrency lock이 걸려,
  원래 의도(태그 충돌 방지를 위한 짧은 lock 구간)와 달라졌음.

## 반영 사항
- `.github/workflows/build-android-apk.yml`를 다시 2개 Job 구조로 복원:
  - `create-and-push-tag` (concurrency lock 유지)
  - `build-apk` (태그 생성 완료 후 실행)
- lock 구간을 짧게 유지하기 위해 tag Job에서 불필요한 `npm ci` 제거.
  - `compute-headver.js` 실행에는 의존성 설치가 필요하지 않음.
- build Job checkout `fetch-depth`를 `1`로 축소해 태그 기준 빌드에서 최소 fetch만 수행.

## 기대 효과
- 기존 설계 의도대로 lock은 태그 생성에만 걸려 병목을 줄임.
- 동시에 tag Job의 불필요 설치 단계를 제거해 tag 획득까지의 시간도 단축.

## 비고
- 오류 처리는 기존과 동일하게 명시적으로 유지:
  - 빈 TAG_NAME 즉시 실패
  - 원격 태그 중복 즉시 실패
