# build-android-apk-pr-tag-conflict-fix

## What I changed
- Split `build-android-apk.yml` into a `prepare-build` job that always computes `TAG_NAME` and resolves the checkout commit.
- Restricted `create-and-push-tag` to `push` events only, so pull requests no longer attempt to create or push release tags.
- Updated `build-apk` to reuse the prepared `TAG_NAME` and build from the triggering commit SHA for both `push` and `pull_request` runs.

## Why
- The previous workflow tried to create the same computed tag during PR runs, which failed when that tag already existed on `origin`.
- PR validation only needs a stable version string for Expo/Gradle inputs; it does not need to publish repository tags.

## Validation
- Reviewed workflow conditions so PR builds proceed when `prepare-build` succeeds and push builds still require successful tag creation.
- Confirmed `TAG_NAME` now comes from a single source of truth shared across tag creation and APK build steps.

## Notes for next task
- If push builds still fail on duplicate tags, the remaining issue is concurrent or repeated pushes calculating the same `TAG_NAME`; that would need a versioning strategy change rather than an event-condition fix.
