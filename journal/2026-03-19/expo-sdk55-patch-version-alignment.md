# Expo SDK 55 patch version alignment

## What I changed
- Updated the Expo SDK 55 packages flagged by the dependency checker in `package.json`:
  - `expo-auth-session` to `~55.0.9`
  - `expo-constants` to `~55.0.9`
  - `expo-dev-client` to `~55.0.18`
  - `expo-linking` to `~55.0.8`
  - `expo-router` to `~55.0.7`
  - `expo-splash-screen` to `~55.0.12`
- Ran `npm install` so `package-lock.json` now resolves those matching patch versions.

## Validation
- `npx expo install --check` should now report these packages as aligned with Expo SDK 55.

## Notes for next task
- `npm install` still reports one high severity vulnerability in the dependency tree; this task did not change that baseline.
