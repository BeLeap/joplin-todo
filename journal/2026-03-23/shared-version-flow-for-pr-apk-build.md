# PR APK 빌드의 버전 체계를 develop 빌드와 통합

## 배경
- 이전 변경은 PR APK 빌드를 추가했지만, PR 전용 준비 job과 artifact 네이밍 규칙을 따로 두면서 develop push 빌드와 버전 흐름이 갈라졌다.
- 리뷰 피드백에 따라 PR과 develop 빌드가 같은 `TAG_NAME` 계산 체계를 공유하도록 단순화할 필요가 있었다.

## 변경 사항
1. `prepare-build` job 하나에서 push/PR 공통으로 `TAG_NAME`과 APK artifact 이름을 계산하도록 정리했다.
2. artifact 이름은 이벤트 종류와 관계없이 `app-release-apk-<TAG_NAME>` 형식을 사용하도록 통일했다.
3. push 이벤트에서만 `create-and-push-tag` job이 실행되도록 유지하되, 이 job도 공통 `prepare-build`의 `TAG_NAME` 출력을 사용하도록 연결했다.
4. `build-apk` job은 항상 공통 준비 결과를 사용하고, push일 때만 태그 생성 성공을 추가로 요구하도록 조건을 명시했다.

## 검증
- `ruby -e "require 'yaml'; ..."`로 workflow YAML 파싱 확인.
- `git diff -- .github/workflows/build-android-apk.yml journal/2026-03-23/shared-version-flow-for-pr-apk-build.md`로 변경사항 검토.

## 메모
- PR 빌드는 태그를 origin에 push하지 않지만, build-time `TAG_NAME` 값 자체는 develop push 빌드와 같은 방식으로 계산된다.
