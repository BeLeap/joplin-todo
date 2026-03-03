dev-build:
    npx expo run:android
eas-dev-build:
    npx eas-cli@latest build --platform android --profile development
eas-build:
    npx eas-cli@latest build --platform android
