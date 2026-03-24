# APK 워크플로의 불필요한 event 분기 제거

## 배경
- `push`와 `pull_request`를 나누기 위해 checkout/concurrency에 event check를 넣었지만, 실제로는 같은 의도를 표현하는 단일 expression으로 충분했다.
- 리뷰 피드백에 따라 workflow를 더 읽기 쉽게 만들기 위해 불필요한 이벤트 분기를 줄였다.

## 변경 사항
1. `create-and-push-tag`의 concurrency key를 `github.head_ref || github.ref` 기반으로 단순화했다.
2. `create-and-push-tag`의 checkout을 push/PR 두 step으로 나누지 않고, `ref: ${{ github.event.pull_request.head.sha || github.sha }}` 하나로 통합했다.
3. 나머지 빌드 흐름은 그대로 유지해서, develop 대상 push/PR 모두 태그 생성 후 태그 기준 APK 빌드를 수행한다.

## 검증
- `ruby -e "require 'yaml'; ..."`로 workflow YAML 파싱 확인.
- `git diff -- .github/workflows/build-android-apk.yml journal/2026-03-23/remove-event-checks-from-apk-workflow.md`로 변경사항 검토.

## 메모
- PR에서는 `github.event.pull_request.head.sha`가 선택되고, push에서는 fallback으로 `github.sha`가 사용된다.
