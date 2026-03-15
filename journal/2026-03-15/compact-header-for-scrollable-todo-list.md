# Compact header for scrollable TODO list

## 요청 배경
- TODO 목록 스크롤이 가능해진 뒤, 상단 헤더 영역이 과도하게 커서 목록 영역이 짧다는 피드백을 반영.

## 변경 내용
- 메인 헤더 문구를 `오늘 할 일을 한눈에`에서 `오늘 할 일`로 축약.
- 헤더 설명 문단(OneDrive 동기화 안내)을 제거해 세로 높이 축소.
- 헤더 카드 스타일 간격을 `gap: Spacing.two` → `Spacing.one`으로 축소.
- 헤더 패딩을 `padding: Spacing.three`에서 `paddingHorizontal: Spacing.three`, `paddingVertical: Spacing.two`로 조정.
- 타이틀 폰트 크기/줄높이를 `28/36`에서 `24/30`으로 축소.
- KPI 행의 상단 마진 제거로 불필요한 여백 축소.

## 검증
- `npm run lint` 통과.
- `npx tsc --noEmit` 통과.
- `TAG_NAME=0.0.0 npm run web -- --port 8081`로 UI 실행 후 브라우저 스크린샷 확보.
- 웹 실행 중 React Native DevTools 바이너리의 시스템 라이브러리(`libatk-1.0.so.0`) 누락 오류가 로그에 노출되었으나, 앱 번들링 및 화면 확인은 정상 수행됨.
