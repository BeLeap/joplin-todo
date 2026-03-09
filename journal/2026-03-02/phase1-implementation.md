# 2026-03-02 Phase 1 구현 결과

`implementation-plan.md`의 **Phase 1 — 도메인/캐시 기반 만들기** 중 첫 구현 항목을 완료했습니다.

## 구현 내용

1. **TodoItem 타입 정의**
   - `src/features/todo/types.ts`에 `TodoItem` 타입을 추가했습니다.
   - 필수 필드: `id`, `title`, `due`, `completed`, `updatedTime`

2. **정렬 유틸 구현**
   - `src/features/todo/sort.ts`에 `sortTodosByDueDate` 유틸을 추가했습니다.
   - 규칙:
     - 마감일(`due`)이 있는 항목이 먼저
     - `due` 오름차순
     - 동률 시 `updatedTime` 최신순, 이후 제목 순으로 안정 정렬

3. **로컬 캐시 인터페이스 구현**
   - `src/storage/todo-cache.ts`에 `TodoCache` 인터페이스를 추가했습니다.
   - 지원 동작:
     - TODO 저장 (`saveTodos`)
     - TODO/마지막 동기화 시각 로드 (`loadTodos`)
     - 캐시 초기화 (`clear`)
   - MVP 초기 검증용으로 `InMemoryTodoCache` 구현을 함께 추가했습니다.

## 검증

- `tests/phase1/phase1-check.ts`에서 다음 시나리오를 검증했습니다.
  - due date 정렬 규칙
  - 캐시 저장/로드
  - 마지막 동기화 시각 보존
  - clear 동작
