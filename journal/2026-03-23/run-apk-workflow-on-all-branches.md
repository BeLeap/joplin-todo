# APK 워크플로 브랜치 제한 제거

## 배경
- 기존 PR/APK 빌드 흐름은 `develop` 브랜치 기준으로만 동작해서, 다른 브랜치에서 작업할 때는 동일한 태그/빌드 자동화를 바로 활용할 수 없었다.
- 리뷰 피드백에 따라 특정 기준 브랜치가 아니어도 push/PR마다 그대로 태그를 따고 APK를 빌드할 수 있게 범위를 넓혔다.

## 변경 사항
1. `Build Android APK` 워크플로의 `push` 브랜치 제한을 제거했다.
2. `pull_request` 브랜치 제한도 제거해서, 대상 브랜치와 관계없이 PR에서 APK 빌드를 실행할 수 있게 했다.
3. push 이벤트에서는 기존처럼 태그 생성 후 태그 기준 APK를 빌드하고, PR 이벤트에서는 PR head 기준 APK를 빌드하는 구조는 유지했다.

## 검증
- `ruby -e "require 'yaml'; ..."`로 workflow YAML 파싱 확인.
- `git diff -- .github/workflows/build-android-apk.yml journal/2026-03-23/run-apk-workflow-on-all-branches.md`로 변경사항 검토.

## 메모
- 이제 브랜치 종류와 관계없이 push는 태그 생성/빌드, PR은 head 기준 빌드가 실행된다.
