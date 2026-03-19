# fix unparseable deleted todo sync

- 사용자 보고: 이전 삭제 대응 후에도 일부 삭제된 TODO가 계속 남아 보임.
- 원인: 다운로드한 `.md` 파일이 더 이상 유효한 Joplin TODO로 파싱되지 않는 경우, `GraphOneDriveJoplinSource`가 그 파일을 `onItem` 콜백으로 전달하지 않아 재개 체크포인트의 stale TODO가 최종 병합 단계에 남을 수 있었음.
- 변경:
  - `src/features/sync/onedrive-source.ts`에 파일명과 파싱 결과(`null` 포함)를 함께 전달하는 `OneDriveDownloadedItem` 타입을 추가.
  - `src/features/sync/sync-todos.ts`에서 파싱 실패 파일도 파일명 기준으로 체크포인트 항목을 즉시 제거하도록 수정하고, 체크포인트 저장 로직을 `persistCheckpoint()`로 정리.
  - `src/features/sync/mock-onedrive-source.ts`와 `src/features/sync/sync-todos.test.ts`를 새 계약에 맞게 갱신하고, 파싱 불가 파일이 stale TODO를 제거하는 회귀 테스트를 추가.
- 검증:
  - `TAG_NAME=0.0.0 npm run lint`
  - `TAG_NAME=0.0.0 npx tsc --noEmit`
  - `TAG_NAME=0.0.0 npx tsx --test src/features/sync/sync-todos.test.ts`
