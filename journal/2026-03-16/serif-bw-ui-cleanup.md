# Serif + Black/White UI Cleanup

## 요청 요약
- 홈 화면 디자인을 전반적으로 더 깔끔하게 정리.
- Serif 계열 타이포그래피와 black & white 톤 반영.

## 변경 사항
- `ThemedText`의 기본 텍스트 타입(`small`, `default`, `subtitle`, `link` 등)에 `Fonts.serif`를 적용해 앱 전반 타이포그래피 톤을 통일.
- 홈 화면(`src/app/index.tsx`)에서 기존 컬러 포인트(블루/그린/레드)를 흑백 기반으로 단순화.
- 카드/칩/버튼/상태 배지의 pill 라운드를 줄이고 얇은 검정 보더를 추가해 정보 위계를 정돈.
- 완료/진행 상태 배지를 흑백 대비로 재정의해 가독성을 유지하면서 톤 일관성 확보.

## 검증
- `npm run lint` 통과.
- `npx tsc --noEmit` 통과.

## 참고
- 스크린샷 캡처 시도: Expo web 실행 단계에서 `TAG_NAME` 환경변수 누락으로 config 로딩 실패.
