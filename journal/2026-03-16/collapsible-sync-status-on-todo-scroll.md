# Collapsible sync status on todo scroll

## Summary
- Changed the home screen layout so the page itself is no longer a single outer `ScrollView`; only the todo list scrolls.
- Added collapse behavior for the sync status card when the todo list is scrolled down.
- Added a compact sync-status badge next to the title while collapsed, showing either:
  - `동기화 완료`
  - `동기화 N%` during file-processing sync
  - fallback labels for idle/error.

## Implementation notes
- Added `isStatusCardCollapsed` state and `handleTodoListScroll` with threshold-based collapse/expand logic.
- Added `compactStatusLabel` memoized formatter based on `status` and `syncProgress`.
- Updated styles with `screenContent`, `titleRow`, and compact badge text/chip styles.

## Validation
- `TAG_NAME=0.0.0 npm run lint`
- `TAG_NAME=0.0.0 npx tsc --noEmit`
- Manually rendered web build and captured screenshot after scrolling todo list.
