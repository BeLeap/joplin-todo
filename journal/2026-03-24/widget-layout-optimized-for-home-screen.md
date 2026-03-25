# Widget layout optimized for home screen

## What changed
- Reworked Android widget UI to keep the app's monochrome tone while reducing card-heavy duplication from the main app.
- Built a compact summary header (source label + sync state pill + large todo count + synced timestamp) for faster at-a-glance scanning.
- Replaced dense card list rows with lightweight bullet-style rows and limited preview to 4 items.
- Added a "+N more" indicator when remaining todos exceed visible rows.
- Kept explicit error rendering and made the error box visually distinct with a light red danger surface.

## Validation
- `TAG_NAME=0.0.0 npm run lint`
- `TAG_NAME=0.0.0 npx tsc --noEmit`
