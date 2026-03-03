dev-build:
    npx expo run:android
eas-dev-build:
    npx eas-cli@latest build --platform android --profile development
eas-build:
    npx eas-cli@latest build --platform android
eas-submit:
    npx eas-cli@latest submit --platform android --latest
