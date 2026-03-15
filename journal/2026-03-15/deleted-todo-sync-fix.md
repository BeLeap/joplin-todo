# deleted todo sync fix

## 배경
- 사용자가 Joplin에서 TODO를 삭제해도 앱 목록에 계속 남는 문제를 확인했다.
- 원인은 `modifiedSince` 기반 증분 동기화 결과를 기존 캐시와 단순 병합하면서, 서버에서 더 이상 내려오지 않는(삭제된) 항목을 제거할 근거가 없었던 것이다.

## 변경 사항
- `syncTodosFromOneDrive`에서 증분 동기화 병합 경로를 비활성화하고, 매 동기화마다 OneDrive의 현재 목록 기준으로 전체 스냅샷을 재구성하도록 수정했다.
- 구체적으로 `modifiedSince`를 `null`로 전달해 목록 필터를 끄고, 기존 캐시와의 병합(`mergedTodos`) 대신 새로 수집한 TODO 목록(`fetchedTodos`)을 정렬 후 저장하도록 변경했다.

## 검증
- `npm run lint`
- `npx tsc --noEmit`

## 후속 고려
- 성능 최적화를 위해 다시 증분 동기화를 도입하려면, 삭제 tombstone 추적 또는 Graph delta API 기반 동기화 설계가 필요하다.
