# Widget scrollable list fix

## Summary
- 사용자 피드백(메인 앱은 스크롤되지만 위젯은 스크롤되지 않음)에 따라 Android 홈 위젯 목록 렌더링을 `FlexWidget` 반복에서 `ListWidget` 기반 컬렉션 렌더링으로 변경.
- 위젯 리스트 영역에 `width/height: match_parent`를 지정해 홈 위젯 내부에서 스크롤 가능한 영역이 생성되도록 구성.
- 위젯 스냅샷 게시 시 최대 항목 수를 하드코딩 `20`에서 상수(`MAX_WIDGET_SNAPSHOT_ITEMS = 100`)로 정리하고 확장.

## Validation
- `npm run lint`
- `npx tsc --noEmit`

## Notes
- `react-native-android-widget`에서 스크롤 가능한 컬렉션은 `ListWidget`으로 제공되며, 기존 `FlexWidget` 반복 렌더링은 스크롤 컨테이너를 만들지 못해 긴 목록이 잘리는 문제가 있었다.
