# Widget design widget fit

- Revised the Android widget styling after review feedback so it keeps the app's monochrome tone without copying the full in-app layout too literally.
- Replaced the app-like stacked status card treatment with a more compact widget header, concise metadata row, slimmer error banner, and denser todo rows suited to home-screen space.
- Validation:
  - `TAG_NAME=0.0.0 npm run lint` ✅
  - `TAG_NAME=0.0.0 npx tsc --noEmit` ⚠️ still fails on existing missing Jest globals in `src/features/sync/sync-todos.test.ts`.
