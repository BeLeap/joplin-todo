# Expo SDK 55 패치 버전 정렬

## 요청 맥락
- `expo-doctor`에서 SDK 55 기준 패치 버전 불일치가 보고됨.
- 대상 패키지: `expo-auth-session`, `expo-dev-client`, `expo-glass-effect`, `expo-router`.

## 조치
- 아래 4개 의존성을 기대 버전으로 상향 정렬함.
  - `expo-auth-session`: `~55.0.7` → `~55.0.8`
  - `expo-dev-client`: `~55.0.13` → `~55.0.16`
  - `expo-glass-effect`: `~55.0.7` → `~55.0.8`
  - `expo-router`: `~55.0.4` → `~55.0.5`
- `npm install`로 `package-lock.json`을 동기화해 실제 설치 버전도 함께 반영함.

## 검증
- `npm run lint` 통과.
- `npx tsc --noEmit` 통과.
- `TAG_NAME=0.0.0 npx expo-doctor` 실행 시 17/17 checks 통과.

## 비고
- npm 출력에 환경 설정 관련 경고(`Unknown env config "http-proxy"`)가 반복되나,
  이번 버전 정렬 및 타입/린트/doctor 결과에는 영향이 없음을 확인함.
