# Move count and sync badge to status card header

## Summary
- 홈 화면 헤더의 KPI 칩(항목 개수)과 동기화 상태 배지를 제거해 상단 타이틀 오른쪽의 여백이 비지 않도록 정리.
- 상태 카드 상단에 `statusCardHeaderRow`를 추가하고, 기존 KPI/상태 배지를 우측으로 이동해 카드 헤더에서 핵심 상태 정보를 함께 표시.
- 기존 상태 텍스트/동작 버튼/오류 배너 흐름은 유지해 동기화 로직과 오류 노출 방식은 변경하지 않음.

## Validation
- `npm run lint`
- `npx tsc --noEmit`

## Notes
- 화면 확인을 위해 Expo 웹 실행을 시도했지만 `TAG_NAME` 환경변수가 없어 `app.config.js`에서 앱 설정 로딩이 실패하여 스크린샷을 생성하지 못함.
