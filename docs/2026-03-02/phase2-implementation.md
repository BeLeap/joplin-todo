# 2026-03-02 Phase 2 구현 결과

`implementation-plan.md`의 **Phase 2 — Joplin OneDrive 읽기** 중, MVP 구현을 위한 동기화 파이프라인의 핵심 로직을 먼저 구현했습니다.

## 구현 내용

1. **Joplin TODO 정규화 로직 추가**
   - `src/features/sync/joplin-todo-normalizer.ts`
   - Joplin 원본 아이템 중 `type_ === 13`(todo)만 필터링합니다.
   - `todo_due`, `todo_completed`, `updated_time`을 앱의 `TodoItem` 모델로 변환합니다.
   - 제목 공백일 때는 `(제목 없음)`으로 치환합니다.

2. **E2EE 미지원 가드 추가**
   - `src/features/sync/errors.ts`
   - 암호화가 적용된 항목(`encryption_applied !== 0`)을 감지하면
     `EncryptedJoplinSyncError`를 발생시키도록 구현했습니다.

3. **OneDrive 소스 추상화 + Mock 소스 구현**
   - `src/features/sync/mock-onedrive-source.ts`
   - 이후 실제 OneDrive 연동으로 교체하기 쉽도록 `OneDriveJoplinSource` 인터페이스를 만들고,
     현재는 `MockOneDriveJoplinSource`로 샘플 데이터를 공급합니다.

4. **동기화 유스케이스 구현**
   - `src/features/sync/sync-todos.ts`
   - 흐름:
     1) OneDrive 소스에서 원본 목록 로딩
     2) Joplin TODO 정규화
     3) 마감일 정렬
     4) 캐시에 저장
     5) 동기화 결과(`todos`, `syncedAt`, `source`) 반환

5. **동기화 결과 타입 정의**
   - `src/features/sync/types.ts`
   - 원본 Joplin 타입(`JoplinRawTodo`)과 동기화 결과 타입(`TodoSyncResult`)을 정의했습니다.

## 검증

- `tests/phase2/phase2-check.ts` 시나리오:
  - TODO 타입 필터링 확인
  - due date 우선 정렬 반영 확인
  - 캐시 저장/마지막 동기화 시각 저장 확인
  - 암호화 항목 감지 시 예외 발생 확인

## 다음 작업

- 실제 OneDrive API 연결 구현 (OAuth 및 파일 조회)
- Joplin sync 파일 포맷 실데이터 파싱 적용
- 앱 화면에서 동기화 상태/오류 메시지 연결
