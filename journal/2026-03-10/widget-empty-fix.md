# Android 홈 위젯 빈 화면 이슈 수정

## 배경
- 사용자 제보: "안드로이드 홈 위젯이 빈칸이에요"
- 원인 분석 결과, 위젯 렌더 핸들러(`registerWidgetTaskHandler`) 등록 함수가 실제 앱 시작 시점에 호출되지 않아 위젯 업데이트 요청 시 렌더링 로직이 연결되지 않는 구조였음.

## 작업 내용
- `src/app/_layout.tsx`에서 앱 루트 마운트 시 `registerJoplinHomeWidgetTask()`를 `useEffect`로 1회 호출하도록 변경.
- 이 변경으로 앱 실행 시 위젯 태스크가 항상 등록되며, 이후 `requestJoplinHomeWidgetUpdate()`가 정상적으로 현재 스냅샷 렌더를 요청할 수 있음.

## 검증
- `npm run lint` 실행
- `npx tsc --noEmit` 실행

## 후속 참고
- 네이티브 위젯 설정/매니페스트 변경이 있었던 경우에는 기존 안내대로 `npx expo run:android` 또는 EAS 재빌드가 필요.
- 이번 변경은 JS 런타임 태스크 등록 경로 보강으로, 앱 재실행 후 위젯 갱신 동작 개선이 기대됨.
