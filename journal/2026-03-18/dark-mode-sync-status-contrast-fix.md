# Dark mode sync status contrast fix

## Summary
- Reworked `src/app/index.tsx` status-card styling to derive borders, surfaces, and text colors from the active theme.
- Fixed sync detail text such as `연결 중...` to use theme-aware colors so it remains readable in dark mode.
- Aligned related controls in the same card (buttons, error banner, filter chip, todo status pill) with the same light/dark color tokens for consistent contrast.

## Notes
- This was prompted by dark-mode sync status text rendering as black on a dark surface.
- No silent fallback was added; the change is purely presentational and keeps existing error/status behavior intact.
