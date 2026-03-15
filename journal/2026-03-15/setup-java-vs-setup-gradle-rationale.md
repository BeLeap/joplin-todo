# setup-java(cache: gradle) vs setup-gradle 선택 근거

## 질문
- `actions/setup-java`의 내장 Gradle 캐시보다 `gradle/actions/setup-gradle`이 왜 나은가?

## 정리
- `setup-java`의 `cache: gradle`은 JDK 설치 과정에서 제공되는 범용 캐시 기능으로, 빠르게 붙이기 좋음.
- `setup-gradle`은 Gradle 실행 컨텍스트에 특화되어 있어, 반복 빌드에서 캐시 재사용/관리 측면에서 더 세밀한 제어와 가시성을 제공.
  - Gradle User Home 및 관련 캐시 처리에 최적화
  - Gradle 워크플로 전용 기능(실행/캐시 관리)과의 궁합이 좋음
- 현재 APK 워크플로는 Android/Gradle 단계가 병목이므로, build job에서는 `setup-gradle`을 우선 적용하는 판단이 합리적.

## 반영
- `.github/workflows/build-android-apk.yml`의 `Setup Gradle cache` 단계 바로 위에 선택 이유를 주석으로 명시.
