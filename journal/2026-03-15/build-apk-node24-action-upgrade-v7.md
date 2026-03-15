# build-apk Node.js 24 warning follow-up (upload-artifact v7)

## Summary
- Updated `.github/workflows/build-android-apk.yml` from `actions/upload-artifact@v6` to `actions/upload-artifact@v7`.
- This addresses reviewer feedback asking whether `v6` was the latest possible version.

## Why
- `actions/upload-artifact` has a newer major tag (`v7`) available upstream.
- Keeping action majors current reduces future deprecation and compatibility risk as GitHub-hosted runners evolve.

## Validation
- Queried upstream tags from `https://github.com/actions/upload-artifact.git` and confirmed `v7` exists.
- Verified workflow now references `actions/upload-artifact@v7`.
- Verified there are no remaining `actions/upload-artifact@v6` references in `.github/workflows`.

## Notes for next task
- Consider pinning to a full commit SHA for stronger supply-chain integrity if your org policy requires immutable action references.
- Re-run the `Build Android APK` workflow to confirm no runtime warnings remain in CI logs.
