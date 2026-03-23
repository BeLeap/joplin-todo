# APK 워크플로에서 artifact 이름 계산 제거

## 배경
- `artifact_name`은 실제로 `TAG_NAME`에 `app-release-apk-` 접두사만 붙인 값이라 별도 계산 단계로 둘 필요가 없었다.
- 리뷰 피드백대로 워크플로를 더 단순하게 만들기 위해, artifact 이름은 업로드 단계에서 바로 표현하도록 정리했다.

## 변경 사항
1. `create-and-push-tag` job의 `artifact_name` output과 관련 계산 step을 제거했다.
2. `build-apk`는 push/PR 모두 `TAG_NAME`만 해석해서 환경 변수로 저장한다.
3. APK 업로드 이름은 `actions/upload-artifact` 단계에서 `app-release-apk-${{ env.TAG_NAME }}`로 직접 구성한다.
4. `TAG_NAME` 검증은 그대로 유지해, artifact 이름도 같은 검증 결과를 전제로 안전하게 생성된다.

## 검증
- `ruby -e "require 'yaml'; ..."`로 workflow YAML 파싱 확인.
- `git diff -- .github/workflows/build-android-apk.yml journal/2026-03-23/remove-artifact-name-computation-from-apk-workflow.md`로 변경사항 검토.

## 메모
- artifact 이름 규칙은 유지되지만, 더 이상 별도 step/output을 통해 중복 계산하지 않는다.
