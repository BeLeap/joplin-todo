# Header collapse animation and expand fix

## Summary
- Added layout animation for sync status card collapse/expand transitions so the header status chip appears/disappears smoothly instead of snapping.
- Fixed the issue where returning to the top quickly did not always expand the status card by:
  - relaxing the expand threshold (`y <= 8`), and
  - handling both `onScrollEndDrag` and `onMomentumScrollEnd` to force top-near expansion after fast fling gestures.

## Implementation notes
- Enabled Android layout animation via `UIManager.setLayoutAnimationEnabledExperimental(true)` on mount.
- Introduced `setCollapsedWithAnimation` helper to centralize animated state transitions.
- Kept transition lock timing to prevent jitter while still allowing expand at scroll end.

## Validation
- `TAG_NAME=0.0.0 npm run lint`
- `TAG_NAME=0.0.0 npx tsc --noEmit`
- Ran Expo web and captured a screenshot after scrolling the todo list.
