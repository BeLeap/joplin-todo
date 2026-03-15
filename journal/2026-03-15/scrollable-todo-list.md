# Scrollable TODO list

## Summary
- 앱 메인 화면(`src/app/index.tsx`)의 TODO 목록 영역을 별도 `ScrollView`로 감싸서 항목이 많아질 때 목록 내부에서 스크롤 가능하도록 변경.
- 중첩 스크롤 환경(Android)에서 동작하도록 `nestedScrollEnabled`를 적용.
- 목록 영역의 최대 높이를 `maxHeight: 380`으로 제한하고, 목록 컨텐츠 간격/하단 여백 스타일을 분리해 가독성을 유지.

## Validation
- `npm run lint`
- `npx tsc --noEmit`

## Notes
- 상단/상태 카드와 분리된 내부 스크롤을 통해 긴 목록에서도 화면 전체 레이아웃이 과도하게 길어지지 않도록 조정.
