# APK 워크플로에서 prepare-build 제거

## 배경
- `prepare-build` job은 push/PR 공통 `TAG_NAME` 계산을 묶기 위해 넣었지만, 실제로는 job 하나가 더 생겨 흐름을 읽기 어렵게 만들었다.
- 리뷰 피드백대로 구조를 더 단순하게 유지하면서도 push/PR이 같은 버전 계산 로직을 쓰도록 정리할 필요가 있었다.

## 변경 사항
1. `prepare-build` job을 제거했다.
2. push에서는 `create-and-push-tag` job이 기존처럼 `compute-headver.js`로 `TAG_NAME`을 계산하고, 같은 값으로 artifact 이름도 출력한 뒤 태그를 생성한다.
3. PR에서는 `build-apk` job 내부에서 동일한 `compute-headver.js`를 실행해 같은 방식으로 `TAG_NAME`과 artifact 이름을 계산한다.
4. `build-apk`는 push일 때만 태그 job 성공을 요구하고, PR일 때는 바로 빌드를 진행하도록 유지했다.

## 검증
- `ruby -e "require 'yaml'; ..."`로 workflow YAML 파싱 확인.
- `git diff -- .github/workflows/build-android-apk.yml journal/2026-03-23/remove-prepare-build-from-apk-workflow.md`로 변경사항 검토.

## 메모
- push/PR 모두 버전 계산식은 같지만, push만 태그를 실제 origin에 생성한다.
