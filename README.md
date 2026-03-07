# Joplin TODO Widget (Expo)

Joplin이 OneDrive에 동기화한 TODO Markdown을 읽어서 **모바일 앱 + Android 홈 위젯**에 보여주는 Expo 프로젝트입니다.

- 앱에서 OneDrive OAuth(PKCE) 로그인 후 TODO를 동기화합니다.
- 네트워크 오류 시 마지막 캐시를 즉시 보여주고, 위젯도 같은 스냅샷을 사용합니다.
- Android 위젯은 `react-native-android-widget` 기반의 실제 홈 위젯입니다.

---

## 주요 기능

- **OneDrive OAuth 로그인**
  - `expo-auth-session` 기반 Authorization Code + PKCE
  - Access Token/Refresh Token을 로컬 저장 후 자동 갱신
- **Joplin TODO 동기화**
  - `Apps/Joplin` 경로의 `.md` 파일을 Microsoft Graph로 조회
  - TODO 메타데이터 파싱 및 정렬(마감일 기준)
  - 진행 상황(목록 조회/다운로드/파일 단위 진행률) 표시
- **오프라인/오류 대응**
  - 네트워크 실패 시 캐시 fallback
  - 동기화 체크포인트 저장으로 중단 후 재시도 복구
  - 오류 상태를 UI/위젯에 명시적으로 표시
- **Android 홈 위젯 연동**
  - 앱 동기화 결과를 `widget:snapshot`으로 게시
  - 위젯 갱신 예약/실행 정책(기본 30분, 오류 시 더 빠른 재시도)

---

## 프로젝트 요구 사항

- Node.js 20+
- npm
- Expo SDK 55
- Android 개발 환경(네이티브 빌드 시)

---

## 빠른 시작

1. 의존성 설치

   ```bash
   npm install
   ```

2. 환경 변수 설정 (`.env` 또는 셸 환경)

   ```bash
   EXPO_PUBLIC_ONEDRIVE_CLIENT_ID=<your-client-id>
   ```

   선택(개발 편의용, OAuth 우회):

   ```bash
   EXPO_PUBLIC_ONEDRIVE_ACCESS_TOKEN=<onedrive-access-token>
   ```

3. 앱 실행

   ```bash
   npx expo start
   ```

---


## 플랫폼 지원 범위

- **공식 지원: Android 전용**
- iOS는 현재 지원 계획이 없으며, 관련 실행/배포 가이드는 제공하지 않습니다.

---

## OneDrive OAuth 설정

Microsoft Entra App 등록 시 아래 값을 사용하세요.

- Redirect URI: `joplintodo://auth`
- 권한(Scope): `Files.Read offline_access openid profile`
- 인증 흐름: Authorization Code + PKCE

> `EXPO_PUBLIC_ONEDRIVE_CLIENT_ID`가 없으면 앱에서 로그인 버튼이 비활성 상태(설정 필요)로 표시됩니다.

---

## 빌드 & 실행 명령어

### 기본 스크립트

```bash
npm run start
npm run android
npm run web
npm run lint
```

### Android 개발 빌드 (네이티브 반영)

```bash
npx expo run:android
```

### EAS 빌드 (Android)

```bash
npx eas build --platform android
```

### Justfile 보조 명령어

```bash
just check          # expo-doctor + tsc --noEmit
just remote-dev-build
just remote-build
just remote-apk-build
```

---

## 동기화 동작 요약

1. 앱 시작 시 로컬 캐시를 먼저 로드해 UI/위젯에 표시
2. 세션 토큰(또는 환경 변수 토큰)이 있으면 OneDrive 동기화 수행
3. 파일 목록 조회 → 파일 다운로드/파싱 → TODO 정렬/저장
4. 결과를 앱 + 위젯 스냅샷으로 게시하고 위젯 업데이트 요청
5. 네트워크 오류면 캐시 fallback, 인증/권한/암호화 오류면 명시적 실패 상태 표시

---

## Android 홈 위젯

이 프로젝트는 `Joplin TODO` Android 홈 위젯을 포함합니다.

- 위젯 데이터 소스: 앱이 저장한 `widget:snapshot`
- 위젯 업데이트: 앱 동기화 완료 시 명시적 업데이트 요청
- 앱 설정: `app.json` plugin(`react-native-android-widget`)에 위젯 정의 포함
- 참고: 위젯 설정 변경 후에는 `npx expo run:android` 또는 EAS 재빌드가 필요합니다.

---

## 저장 데이터(로컬)

- TODO 캐시(동기화 결과)
- 마지막 동기화 시각
- 동기화 체크포인트(재시도/복구용)
- OAuth 세션 토큰(Access/Refresh)
- 위젯 스냅샷/다음 갱신 시각

---

## 테스트/검증

```bash
npm run lint
npx tsc --noEmit
npx expo-doctor
```

---

## 프로젝트 구조

```text
src/
  app/                  # Expo Router 화면
  features/
    sync/               # OneDrive 인증/조회/파싱/동기화
    todo/               # TODO 타입/정렬
    widget/             # 위젯 스냅샷/브리지/갱신 정책
  storage/              # AsyncStorage 기반 캐시
  components/           # 공용 UI 컴포넌트
```

---

## 작업 기록 규칙 (에이전트/개발 협업)

작업 완료 시 아래 규칙으로 문서를 남깁니다.

- 경로: `docs/<date>/<appropriate-title>.md`
- `<date>`: `YYYY-MM-DD`
- `<appropriate-title>`: 작업 내용을 설명하는 소문자 kebab-case
