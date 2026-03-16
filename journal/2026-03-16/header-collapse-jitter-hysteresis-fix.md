# Header collapse jitter hysteresis fix

## Context
- 사용자 보고: TODO 리스트 스크롤 시 헤더(동기화 카드) collapse 전환 구간에서 "부들부들" 떨림 발생.

## Changes
- `src/app/index.tsx`
  - 스크롤 방향 추적(`lastScrollYRef`) 추가.
  - collapse/expand 상태 전환 직후 짧은 락(`COLLAPSE_TRANSITION_LOCK_MS = 180`)을 두어 연속 토글 방지.
  - expand 조건을 `y <= 0` + `상향 스크롤`일 때만 허용하도록 강화.

## Rationale
- 임계값 근처에서 미세한 scroll bounce/offset 흔들림이 연속적으로 발생하면 collapse ↔ expand가 짧은 시간에 반복되어 시각적 떨림이 보일 수 있음.
- 전환 락 + 방향 조건으로 토글 히스테리시스를 적용해 UI 안정성을 개선.

## Validation
- 정적 점검: `TAG_NAME=0.0.0 npm run lint`
