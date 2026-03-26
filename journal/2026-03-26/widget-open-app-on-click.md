# Widget open app on click

- Added `clickAction="OPEN_APP"` to the Android home widget root container so tapping the widget launches the app.
- This uses `react-native-android-widget`'s built-in click action path, avoiding custom click handlers and keeping behavior explicit.
- Validation:
  - `TAG_NAME=0.0.0 npm run lint` ✅
