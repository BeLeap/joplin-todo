# Joplin TODO Widget (Expo)

Joplin이 OneDrive로 동기화한 TODO를 읽어 앱/위젯에 표시하는 프로젝트입니다.

## 시작하기

1. 의존성 설치

   ```bash
   npm install
   ```

2. (선택) OneDrive OAuth 설정

   Microsoft Entra App 등록 후, 아래 환경 변수를 설정하세요.

   ```bash
   EXPO_PUBLIC_ONEDRIVE_CLIENT_ID=<your-client-id>
   ```

   - Redirect URI: `joplintodo://auth`
   - 권한(scope): `Files.Read offline_access openid profile`

   > 참고: 개발 편의상 `EXPO_PUBLIC_ONEDRIVE_ACCESS_TOKEN`을 직접 넣는 방식도 유지됩니다.

3. 앱 실행

   ```bash
   npx expo start
   ```

## 빌드 방법

### Android 개발 빌드

```bash
npx expo run:android
```

### iOS 개발 빌드

```bash
npx expo run:ios
```

### 프로덕션 빌드 (EAS)

```bash
npx eas build --platform android
npx eas build --platform ios
```

## 동작 요약

- 앱 첫 화면에서 OneDrive 로그인 버튼으로 OAuth 인증을 수행합니다.
- 인증 후 Microsoft Graph API로 `/me/drive/root:/Apps/Joplin:/children`를 조회해 `.md` 동기화 파일을 읽습니다.
- Joplin 메타데이터를 파싱해 TODO만 추출하고 캐시에 저장합니다.

## Android 홈 위젯(실제 위젯)

이 프로젝트는 `react-native-android-widget` 기반의 실제 Android 홈 위젯(`Joplin TODO`)을 포함합니다.

- 위젯 내용은 앱이 저장하는 `widget:snapshot` 데이터를 읽어 렌더링됩니다.
- 앱 동기화가 끝날 때마다 위젯 업데이트를 요청합니다.
- `app.json`의 plugin 설정에 위젯 정의가 포함되어 있으므로, 네이티브 반영을 위해 Android 개발 빌드는 `npx expo run:android`(또는 EAS Build)로 다시 빌드해야 합니다.

