# PR 이벤트에서도 APK 빌드 워크플로 실행

## 배경
- 기존 `build-android-apk.yml`은 `develop` 브랜치 push 때만 동작해서, PR 코드 상태로 설치 가능한 APK를 바로 확인할 수 없었다.
- 리뷰/QA 단계에서 PR 자체의 산출물을 확인하려면 별도 머지 또는 수동 빌드가 필요해 피드백 루프가 길어졌다.

## 변경 사항
1. `pull_request`(`develop` 대상) 이벤트에서도 `Build Android APK` 워크플로가 실행되도록 확장했다.
2. push 빌드와 PR 빌드의 준비 단계를 분리했다.
   - push는 기존처럼 버전 태그를 만들고 태그 기준으로 빌드한다.
   - PR은 태그를 push하지 않고, PR head SHA 기준으로 빌드한다.
3. PR 아티팩트 이름을 `app-release-apk-pr-<번호>-<tag>-<sha>` 형식으로 만들어 어떤 PR 산출물인지 바로 구분할 수 있게 했다.
4. 공통 빌드 job에서 `TAG_NAME`과 artifact 이름이 비어 있으면 즉시 실패하도록 검증 단계를 유지했다.

## 검증
- `ruby -e "require 'yaml'; ..."`로 workflow YAML 구문이 깨지지 않는지 파싱 확인.
- `git diff -- .github/workflows/build-android-apk.yml journal/2026-03-23/pr-build-workflow-for-apk.md`로 변경사항 검토.

## 메모
- 현재는 `develop` 대상으로 열린 PR만 APK 빌드를 수행한다. 필요하면 이후 `master` 대상 PR까지 쉽게 확장 가능하다.
