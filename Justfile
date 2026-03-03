dev-build:
    npx expo run:android
remote-dev-build:
    npx eas-cli@latest build --platform android --profile development
remote-build:
    npx eas-cli@latest build --platform android
local-build:
    npx eas-cli@latest build --platform android --local
remote-submit:
    npx eas-cli@latest submit --platform android --latest
