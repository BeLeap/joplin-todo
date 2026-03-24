# Widget design consistency

- Updated the Android home widget layout to mirror the main app's monochrome card-based visual language.
- Added a pill-style sync status badge, summary card, bordered error banner, and card-style todo rows with a status chip.
- Validation:
  - `TAG_NAME=0.0.0 npm run lint` ✅
  - `TAG_NAME=0.0.0 npx tsc --noEmit` ⚠️ fails on existing missing Jest globals in `src/features/sync/sync-todos.test.ts`.
