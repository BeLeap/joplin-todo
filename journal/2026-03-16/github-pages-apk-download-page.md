# GitHub Pages APK 다운로드 페이지 추가

## 배경
- Actions 아티팩트 다운로드 방식은 모바일에서 접근성이 낮아, 브라우저에서 바로 받기 쉬운 경로가 필요했다.

## 변경 사항
1. `.github/workflows/build-android-apk.yml`
   - APK 아티팩트 업로드 이후 `softprops/action-gh-release@v2` 단계 추가.
   - 태그 릴리스 생성/업데이트 시 `app-release.apk`를 릴리스 에셋으로 게시하도록 구성.
2. `github-pages/download/index.html`
   - 모바일 친화 단일 다운로드 페이지 추가.
   - GitHub Pages URL에서 `owner/repo`를 추론해 `releases/latest` API를 조회.
   - 최신 릴리스의 `.apk` 에셋을 찾아 메인 다운로드 버튼에 연결.
   - 실패 시 오류를 숨기지 않고 화면/콘솔에 명시하고, Releases 수동 진입 버튼 제공.
3. `github-pages/index.html`
   - Pages 루트에 간단한 네비게이션 페이지 추가.

## 검증
- 정적 HTML 문법 및 링크 구조를 수동 점검.
- Playwright로 로컬 정적 서버 접근 후 페이지 스크린샷 확보.

## 후속 메모
- 레포가 private이면 GitHub API 인증 정책/다운로드 권한에 따라 페이지 동작 제약이 있을 수 있음.
- 필요 시 릴리스 생성 시 body에 설치 가이드/sha256 등 추가 가능.
