# Android widget empty render fix

## 배경
- 홈 위젯이 빈 상태로 보이는 이슈를 점검함.
- 위젯 태스크 핸들러에서 `props.widgetInfo.widgetName` 접근을 가정하고 있었음.

## 원인
- 런타임에서 `widgetInfo` 또는 `widgetName`이 비어있는 경우가 발생하면,
  기존 코드가 안전하지 않은 접근으로 실패할 수 있음.
- 위젯 렌더 태스크에서 예외가 발생하면 결과적으로 위젯이 비어 보일 수 있음.

## 조치
- `hasMatchingWidgetName` 입력 타입을 `string | undefined`로 확장.
- `incomingWidgetName`을 optional chaining으로 읽고, 비어 있으면 명시적으로 오류 UI 렌더.
- 오류 메시지에 실제 값을 `String(incomingWidgetName)`로 표시해 디버깅 가능하도록 개선.

## 검증
- `npm run lint` 통과.
- `npx tsc --noEmit` 통과.

## 비고
- 위젯 플러그인 네이티브 변경이 포함될 경우 `npx expo run:android`로 재빌드 필요.
