# fix soft-deleted joplin todos

- 사용자 보고: Joplin에서 삭제한 TODO가 앱에 계속 남아 보임.
- 원인: Joplin은 일부 TODO를 파일 삭제 대신 `deleted_time` 메타데이터 갱신으로 처리하는데, 동기화 재개용 `parsedTodoById` 맵은 `toTodoItem()`이 `null`을 반환할 때 기존 항목을 지우지 않아 stale TODO를 최종 결과에 다시 합쳤음.
- 변경:
  - `src/features/sync/sync-todos.ts`에서 다운로드한 raw item이 더 이상 유효한 TODO가 아니면(`deleted_time > 0`, non-todo 등) `parsedTodoById`에서 즉시 제거하도록 수정.
  - `src/features/sync/sync-todos.test.ts`에 soft-delete 재현 테스트와 `onTodoParsed` 이벤트 보장 테스트를 추가.
- 검증:
  - `TAG_NAME=0.0.0 npm run lint`
  - `TAG_NAME=0.0.0 npx tsc --noEmit`
  - `TAG_NAME=0.0.0 npx tsx --test src/features/sync/sync-todos.test.ts`
