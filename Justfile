remote-dev-build:
    npx eas-cli@latest build --platform android --profile development
remote-build:
    npx eas-cli@latest build --platform android
remote-apk-build:
    npx eas-cli@latest build --platform android --profile preview
local-build:
    npx eas-cli@latest build --platform android --local
local-apk-build:
    npx eas-cli@latest build --platform android --profile preview --local --output app-release.apk
remote-submit:
    npx eas-cli@latest submit --platform android --latest

check:
    npx expo-doctor
    npx tsc --noEmit
