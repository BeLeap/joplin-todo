# build-apk Node.js 24 action compatibility update

## Summary
- Updated GitHub Actions workflow `build-android-apk.yml` to use `actions/upload-artifact@v5` instead of `@v4`.
- This addresses the GitHub Actions deprecation warning about Node.js 20-based JavaScript actions.

## Why
- GitHub announced Node.js 20 deprecation for actions runners and automatic migration to Node.js 24.
- `actions/upload-artifact@v4` emitted deprecation warnings in `build-apk`.

## Validation
- Confirmed the workflow now references `actions/upload-artifact@v5`.
- Verified there are no remaining `upload-artifact@v4` references in `.github/workflows`.

## Notes for next task
- If additional deprecation warnings appear, scan all workflows for pinned action majors that still rely on older Node runtimes.
- Consider periodically reviewing action versions (`actions/*`) as part of CI maintenance.
