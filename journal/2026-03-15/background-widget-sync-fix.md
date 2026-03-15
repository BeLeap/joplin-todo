# Background widget sync fix

## What changed
- Extracted OneDrive stored-session/token refresh logic into `src/features/sync/onedrive-auth-session.ts` so foreground hooks and background/widget paths can share one source of truth.
- Updated `useOneDriveAuth` to use the shared session module and keep UI state in sync with refreshed tokens.
- Wired Android widget task/update flow to run `runWidgetRefreshIfDue` with a valid OneDrive token before rendering, so widget-triggered/background updates can actually sync from OneDrive.
- Improved refresh-runner failure reporting to include underlying error details in the widget snapshot error message instead of a fully generic failure.

## Why
- Previously, real sync execution only happened in the Home screen flow. When app was backgrounded, widget refresh rendered cached snapshot only and never pulled fresh data.
- Token retrieval for background paths was inaccessible because it lived inside the React hook.

## Validation
- `npm run lint`
- `npx tsc --noEmit`

## Notes for next task
- Widget task currently logs background sync failure and still renders latest snapshot. If needed, we can explicitly publish an error snapshot from the widget task itself when token acquisition fails.
