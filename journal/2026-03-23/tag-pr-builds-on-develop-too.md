# develop 대상 PR에서도 태그 생성 후 APK 빌드

## 배경
- 이전 변경에서 PR 빌드는 가능했지만, 태그 생성은 push 이벤트에서만 수행되도록 남아 있었다.
- 리뷰 피드백에 따라 `develop` 대상 PR도 push와 동일하게 먼저 태그를 만들고, 그 태그 기준으로 APK를 빌드하도록 정리했다.

## 변경 사항
1. 워크플로 트리거를 다시 `develop` 대상 `push`/`pull_request`로 제한했다.
2. `create-and-push-tag` job의 이벤트 조건(`if`)을 제거해 PR에서도 실행되도록 바꿨다.
3. PR 이벤트에서는 `create-and-push-tag`가 PR head SHA를 checkout한 뒤 `TAG_NAME`을 계산하고 태그를 push한다.
4. `build-apk`는 이벤트 구분 없이 항상 방금 만든 태그를 checkout해서 APK를 빌드하도록 단순화했다.

## 검증
- `ruby -e "require 'yaml'; ..."`로 workflow YAML 파싱 확인.
- `git diff -- .github/workflows/build-android-apk.yml journal/2026-03-23/tag-pr-builds-on-develop-too.md`로 변경사항 검토.

## 메모
- 동일한 `TAG_NAME`이 이미 origin에 있으면 push/PR 모두 명시적으로 실패한다.
