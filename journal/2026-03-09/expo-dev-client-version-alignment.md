# Expo dev client patch mismatch 정리

## 요청 맥락
- 이전 변경 이후 검사에서 `expo-dev-client` 패치 버전 불일치가 보고됨.
- expected `~55.0.13`, found `55.0.11` 상태를 해소해야 했음.

## 조치
- `package.json`의 `expo-dev-client`를 `~55.0.13`으로 정렬.
- `npm install expo-dev-client@~55.0.13` 실행으로 lockfile 동기화.

## 검증
- `npm run lint` 통과.
- `npx tsc --noEmit` 통과.
- `npx expo-doctor`는 `TAG_NAME` 누락으로 실패를 재현함.
- `TAG_NAME=0.0.0 npx expo-doctor`로 설정 후 17/17 checks 통과.

## 비고
- 이 저장소는 `app.config.js`에서 `TAG_NAME`을 필수로 요구하므로,
  로컬/CI에서 expo config 기반 커맨드 실행 시 반드시 값 설정이 필요함.
