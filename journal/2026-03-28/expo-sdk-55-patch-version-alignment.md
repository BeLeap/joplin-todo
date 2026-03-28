# Expo SDK 55 patch version alignment

## Summary
- `expo-doctor`가 요구한 Expo SDK 55 패치 버전에 맞춰 핵심 Expo 패키지 7종(`expo`, `expo-auth-session`, `expo-dev-client`, `expo-linking`, `expo-router`, `expo-splash-screen`, `expo-system-ui`)을 상향 정렬했다.
- 의존성 정렬 결과가 `package-lock.json`에 반영되도록 lockfile을 갱신했다.
- 버전 정렬 후 `expo-doctor`와 lint를 실행해 프로젝트 상태를 확인했다.

## Validation
- `TAG_NAME=0.0.0 npx expo-doctor`
- `TAG_NAME=0.0.0 npm run lint`
