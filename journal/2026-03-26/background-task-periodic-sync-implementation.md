## 작업 배경

- 피드백: "주기적 refresh가 왜 위젯에 의존하느냐, 백그라운드에서 못하나?"
- 목표: 위젯 진입 시점 의존도를 낮추고 Android 백그라운드 주기 동기화를 실제로 등록.

## 변경 사항

- `expo-background-task`, `expo-task-manager` 의존성을 추가.
- `src/features/sync/background-sync-task.ts` 신규 추가.
  - TaskManager 전역 정의(`defineTask`)로 백그라운드 동기화 실행기 등록.
  - 토큰 부재/작업 에러/동기화 예외를 명시적으로 로그로 노출.
  - 실패 시 캐시를 읽어 위젯 스냅샷을 `error` 상태로 게시(오류 메시지 포함).
  - Android에서만 주기 등록(`minimumInterval: 30`).
- `index.js`에서 background task 모듈을 앱 초기 로딩 시점에 import 하도록 반영(전역 task 정의 보장).
- `_layout.tsx`에서 주기 동기화 등록 함수를 호출하고, 등록 실패를 `[background-sync-registration-failed]` 로그로 노출.
- README 백그라운드 동작 설명을 최신 구현(BackgroundTask + 위젯 경로 병행)으로 갱신.

## 메모

- BackgroundTask는 시스템 스케줄러 정책을 따르므로 exact 30분 보장은 불가.
- 그럼에도 기존 위젯 경로와 병행해 실제 실행 기회를 늘리고, 실패 상태를 명시적으로 노출하도록 개선.
