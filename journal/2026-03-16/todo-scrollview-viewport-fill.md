# TODO ScrollView viewport fill fix

## 요청
- 할일 목록 ScrollView가 화면 하단까지 꽉 차지 않는 레이아웃 문제 수정.

## 변경 내용
- 메인 화면 루트 ScrollView에 `style={styles.screenScroll}`를 추가하고 `screenScroll.flex = 1`로 지정.
- 루트 ScrollView의 `contentContainerStyle`에 `flexGrow: 1`을 추가해 콘텐츠가 뷰포트를 최소 높이로 채우도록 조정.
- 내부 TODO 목록 ScrollView의 `maxHeight: 380` 고정값을 제거하고 `flex: 1`로 변경해 가용 공간을 채우도록 수정.

## 검증
- `TAG_NAME=0.0.0 npm run lint` 통과.
- `TAG_NAME=0.0.0 npm run web -- --port 19007`로 실행 후 Playwright로 화면 캡처 (`artifacts/todo-scroll-fill.png`).

## 비고
- 웹 실행 시 React Native DevTools 설치 단계에서 `libatk-1.0.so.0` 누락 에러가 출력되었으나, Metro 번들러와 웹 앱 실행은 정상 동작함.
