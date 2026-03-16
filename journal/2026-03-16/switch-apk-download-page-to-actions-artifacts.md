# APK 다운로드 경로를 Release에서 Actions Artifact로 전환

## 배경
- 이전 구현은 GitHub Release 에셋 기반이었지만, 실제 운영 의도는 Actions artifact 직접 접근이었다.
- 리뷰 피드백에 맞춰 배포 경로를 단순화하고, 기존 APK 빌드 워크플로 출력물을 그대로 사용하도록 조정했다.

## 변경 사항
1. `.github/workflows/build-android-apk.yml`
   - `softprops/action-gh-release@v2` 단계 제거.
   - APK는 기존처럼 Actions artifact(`app-release-apk-*`)만 게시.
2. `github-pages/download/index.html`
   - 데이터 소스를 `releases/latest`에서 Actions API로 변경.
   - `build-android-apk.yml`의 최근 성공 run 조회 → 해당 run의 artifact 목록 조회 → 최신 APK artifact 선택.
   - 다운로드 버튼을 `actions/runs/{run_id}/artifacts/{artifact_id}` 링크에 연결.
   - 오류를 숨기지 않고 UI/console에 명시, 수동 접근을 위한 워크플로/실행 링크 제공.

## 검증
- `npm run lint`
- 로컬 정적 서버 + Playwright 모바일 스크린샷으로 화면 동작 확인.

## 참고
- GitHub artifact는 보관기간 만료 시 다운로드가 불가능하므로, 페이지에 만료 가능성을 명시적으로 오류로 표시한다.
