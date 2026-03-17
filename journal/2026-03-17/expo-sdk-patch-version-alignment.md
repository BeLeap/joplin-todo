# Expo SDK 55 patch version alignment

## What I changed
- Updated Expo SDK 55 related dependencies in `package.json` to the required patch versions reported by Expo dependency checks:
  - `expo-build-properties` to `~55.0.10`
  - `expo-constants` to `~55.0.8`
  - `expo-dev-client` to `~55.0.17`
  - `expo-device` to `~55.0.10`
  - `expo-router` to `~55.0.6`
  - `expo-splash-screen` to `~55.0.11`
  - `expo-system-ui` to `~55.0.10`
  - `expo-web-browser` to `~55.0.10`
- Ran `npm install` to refresh the lockfile and install the updated versions.

## Validation
- `TAG_NAME=0.0.0 npx expo install --check` returns `Dependencies are up to date`.

## Notes for next task
- `npm install` reports one high severity vulnerability in the dependency tree (`npm audit` for details), unrelated to this alignment task.
