remote-dev-build:
    npx eas-cli@latest build --platform android --profile development
remote-build:
    npx eas-cli@latest build --platform android
remote-apk-build:
    npx eas-cli@latest build --platform android --profile preview
remote-submit:
    npx eas-cli@latest submit --platform android --latest

local-run:
    TAG_NAME=0.0.0 npm run android
local-build:
    npx eas-cli@latest build --platform android --local
local-apk-build:
    npx eas-cli@latest build --platform android --profile preview --local --output app-release.apk

check:
    npx expo-doctor
    npx tsc --noEmit
