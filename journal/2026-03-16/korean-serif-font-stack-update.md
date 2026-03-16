# Korean Serif Font Stack Update

## 요청
- 한글 텍스트에도 Serif 느낌이 적용되도록 개선.

## 변경 내용
- 웹용 serif 폰트 스택(`--font-serif`)에 한국어 Serif 계열 fallback을 추가.
- 추가된 순서: `Noto Serif KR`, `Source Han Serif K`, `Nanum Myeongjo`, `AppleMyungjo`, `Batang`, `Georgia`, `Times New Roman`, `serif`.
- 기존 `ThemedText -> Fonts.serif -> var(--font-serif)` 흐름을 유지하면서, 한글 글리프 선택 가능성을 높이는 방식으로 변경.

## 검증
- `npm run lint` 통과.
- `TAG_NAME=0.0.0 CI=1 npm run web -- --port 19006` 실행 후 Playwright로 전체 페이지 스크린샷 생성.

## 관찰
- 웹 번들링 및 스크린샷 생성은 정상 완료.
- React Native DevTools 설치 단계에서 `libatk-1.0.so.0` 누락 경고가 표시되지만, 이번 검증 범위(렌더링/캡처)에는 영향 없음.
