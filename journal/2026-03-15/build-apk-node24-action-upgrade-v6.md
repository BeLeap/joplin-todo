# build-apk Node.js 24 warning follow-up (upload-artifact v6)

## Summary
- Updated `.github/workflows/build-android-apk.yml` to use `actions/upload-artifact@v6`.
- This is a follow-up to previous Node.js runtime deprecation handling work.

## Why
- CI warning indicated JavaScript actions on Node.js 20 are deprecated and will default to Node.js 24.
- `build-apk` was still showing this warning for `actions/upload-artifact@v5`.

## Validation
- Verified `build-android-apk.yml` now references `actions/upload-artifact@v6`.
- Searched workflow files to ensure no remaining `actions/upload-artifact@v5` references under `.github/workflows`.

## Notes for next task
- Re-run the `build-apk` workflow on GitHub to confirm warning disappears end-to-end.
- Continue periodic dependency maintenance for GitHub Actions majors, especially Node-runtime-backed actions.
