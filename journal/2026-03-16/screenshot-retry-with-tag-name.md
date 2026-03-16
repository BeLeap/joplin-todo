# Screenshot Retry with TAG_NAME

## 요청
- `TAG_NAME=0.0.0`을 넣고 웹 실행 후 스크린샷 재촬영.

## 수행 내용
- `TAG_NAME=0.0.0 CI=1 npm run web -- --port 19006`로 Expo web 서버 실행.
- Playwright로 `http://127.0.0.1:19006` 접속 후 전체 페이지 스크린샷 저장.
- 산출물: `artifacts/home-serif-bw.png` (browser artifact 경로로 반환됨).

## 관찰 사항
- 웹 번들링은 정상 완료.
- 실행 로그에 React Native DevTools 설치 관련 시스템 라이브러리 누락 경고(`libatk-1.0.so.0`)가 출력되었으나, 웹 페이지 렌더링/스크린샷 생성 자체에는 영향 없음.

## 비고
- 이번 작업은 스크린샷 재시도 목적이라 앱 코드 변경은 없음.
