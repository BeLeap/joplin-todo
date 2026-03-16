# Remove duplicate sync status text

## Summary
- 홈 화면 동기화 카드에서 상태 배지와 동일한 `statusHeadline` 텍스트가 본문에서 중복 노출되던 부분을 제거함.
- 상태 상세(`statusDetail`)와 마지막 동기화 시각은 그대로 유지해 핵심 정보는 보존.

## Files changed
- `src/app/index.tsx`

## Validation
- `npm run lint`
