# remove incremental sync toggle

## 요청 맥락
- 이전 수정에서 증분 동기화를 `shouldUseIncrementalSync = false`로 비활성화만 해둔 상태였고, 코드가 지저분하다는 피드백이 있었다.

## 반영 내용
- `syncTodosFromOneDrive`에서 토글 변수와 분기 코드를 제거했다.
- OneDrive 목록 조회 옵션의 `modifiedSince`는 항상 `null`을 전달하도록 명시해, 현재 동작(전체 스냅샷 재구성)을 코드 구조와 일치시켰다.
- 더 이상 사용하지 않는 `OneDriveJoplinSource.incrementalMode` 선언 및 `GraphOneDriveJoplinSource` 구현 필드를 제거했다.

## 검증
- `npm run lint`
- `npx tsc --noEmit`
