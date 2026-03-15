# Android widget empty render fix

## Context
- 사용자 보고: 안드로이드 홈 위젯이 비어 보임.
- 원인 분석: `react-native-android-widget`가 React Compiler(메모화)와 충돌 시 위젯 트리 빌드 실패 가능.
- 라이브러리 가이드에 따라 위젯 파일 최상단에 `"use no memo";` 지시어가 필요함.

## Changes
- `src/features/widget/android-home-widget.tsx` 최상단에 `"use no memo";` 추가.
- 이 변경으로 위젯 태스크 핸들러 렌더 트리가 컴파일러 최적화에서 제외되어 빈 위젯/렌더 실패를 방지.

## Follow-up
- 네이티브 위젯 관련 변경 반영을 위해 Android 개발 빌드 재생성 필요 (`npx expo run:android` 또는 EAS Android 빌드).
