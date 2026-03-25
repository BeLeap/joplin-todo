# Tag push idempotency fix

## 배경
- `build-android-apk.yml`의 태그 생성 단계가 `origin`에 동일한 태그가 이미 있으면 항상 실패하도록 되어 있어,
  같은 커밋에 대한 재실행(re-run)에서도 push 단계가 실패했다.
- 사용자 보고 오류:
  - `Tag already exists on origin: 1.2613.134`

## 변경 내용
- `.github/workflows/build-android-apk.yml`의 `Create and push version tag` 단계를 수정했다.
- 원격 태그(`refs/tags/$TAG_NAME^{}`)가 이미 존재할 때:
  1. 태그가 현재 커밋(`GITHUB_SHA`)을 가리키면 성공 처리(태그 생성/푸시 스킵).
  2. 다른 커밋을 가리키면 명시적 에러로 실패.
- 목적: 재실행은 안전하게 통과시키되, 실제 버전 충돌은 숨기지 않고 실패를 유지.

## 메모
- 사용자 커스텀 지시(에러 은닉 금지)에 맞춰, 충돌 케이스는 계속 실패하고 메시지를 더 구체화했다.
