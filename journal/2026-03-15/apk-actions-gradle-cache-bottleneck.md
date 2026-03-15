# APK Actions 병목 대응: Gradle 캐시 최적화

## 배경
- lock 구간 단축(태그 Job 경량화)은 맞는 방향이지만, 전체 APK 빌드 시간의 주 병목은 Gradle 의존성 해석/다운로드와 Android 빌드 단계에 더 가까움.

## 변경 사항
- `build-android-apk`의 build Job에 `gradle/actions/setup-gradle@v4`를 추가.
  - Gradle User Home 및 빌드 관련 캐시 재사용을 강화.
- `actions/setup-java`의 단순 `cache: gradle` 대신 전용 Gradle 액션으로 캐시 관리를 일원화.
- Gradle 빌드 명령에 `--build-cache`를 명시해 캐시 사용 의도를 분명히 함.

## 기대 효과
- 반복 실행 시 Gradle dependency resolution / transform 재사용률이 올라 APK 빌드 시간이 단축될 가능성이 큼.
- lock 설계(태그 Job에서만 concurrency 적용)는 그대로 유지.

## 오류 처리
- 기존 실패 동작 유지:
  - TAG_NAME 빈 값 실패
  - 태그 중복 실패
  - APK 산출물 미존재 시 artifact 업로드 단계 실패
