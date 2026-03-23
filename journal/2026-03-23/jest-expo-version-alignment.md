# Jest Expo version alignment

## Summary
- Expo SDK 55 요구 버전에 맞춰 `jest`를 `~29.7.0`, `@types/jest`를 `29.5.14`로 낮췄다.
- 기존 Jest 설정 및 테스트 구조는 유지하고, 의존성 버전만 SDK 기대치에 맞게 정렬했다.

## Validation
- `npm install --package-lock-only --ignore-scripts --no-audit --no-fund`
- `TAG_NAME=0.0.0 npm run test`
- `TAG_NAME=0.0.0 npm run lint`
