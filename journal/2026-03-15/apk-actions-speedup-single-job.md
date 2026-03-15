# APK Actions 속도 개선: 단일 Job으로 통합

## 배경
- 기존 `build-android-apk` 워크플로는 태그 생성 Job과 APK 빌드 Job으로 분리되어 있어,
  동일한 커밋 기준으로 `checkout + setup-node + npm ci`가 2회 반복됨.
- 반복 초기화 비용으로 전체 실행 시간이 불필요하게 증가.

## 변경 내용
- `.github/workflows/build-android-apk.yml`에서 `create-and-push-tag` / `build-apk` 2개 Job을 1개 `build-apk` Job으로 통합.
- `TAG_NAME`은 `GITHUB_OUTPUT` job output 대신 `GITHUB_ENV`로 현재 Job 내 공유.
- 태그 중복 검증은 빌드 전에 수행.
- 태그 생성/푸시는 APK 빌드 성공 후 수행하도록 순서를 이동.

## 기대 효과
- 한 번의 런에서 아래 비용 제거:
  - 추가 Checkout 1회
  - 추가 Node setup 1회
  - 추가 `npm ci` 1회
- 따라서 APK Actions 총 소요시간이 기존 대비 단축될 것으로 기대.

## 리스크/주의
- 태그 생성 시점이 "빌드 시작 전"에서 "빌드 성공 후"로 바뀜.
  - 실패 빌드에 대해 태그가 남지 않으므로 릴리즈 품질 관점에서는 오히려 안전.
- 기존과 동일하게 동시성 그룹은 유지되어 동일 ref 중복 실행 경쟁은 제한.
