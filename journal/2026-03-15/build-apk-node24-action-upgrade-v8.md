# build-apk-node24-action-upgrade-v8

## What I changed
- Updated GitHub Actions workflow `build-android-apk.yml` to use `gradle/actions/setup-gradle@v5` instead of `@v4`.

## Why
- GitHub Actions Node.js 20 runtime deprecation warning reported `gradle/actions/setup-gradle@v4` as Node 20 based.
- Moving to the latest major (`v5`) aligns with Node 24 compatibility expectations and avoids upcoming forced runtime migration risk.

## Validation
- Verified the workflow file contains `gradle/actions/setup-gradle@v5`.
- No behavior change intended other than action runtime/version upgrade.

## Notes for next task
- If CI still reports runtime warnings, check for pinned SHA or transitive actions in other workflow files.
