# Scroll-based sync status card collapse 리팩터링

## 배경
- 기존 구현은 시간 기반 transition lock(`COLLAPSE_TRANSITION_LOCK_MS`)과 단일 임계값 기반 제어를 사용해 스크롤 방향 전환 시 카드가 튀거나 의도와 다르게 확장/축소되는 문제가 있었다.

## 수행 내용
- 스크롤 처리 로직을 **hysteresis(진입/이탈 임계값 분리)** 기반으로 재구성.
  - collapse 진입: `COLLAPSE_ENTER_Y = 36`
  - collapse 이탈: `COLLAPSE_EXIT_Y = 12`
- 미세한 스크롤 떨림에 반응하지 않도록 방향 변화 최소치(`MIN_DIRECTION_CHANGE_Y = 4`)를 추가.
- 시간 잠금(lock) 의존 로직 제거 후, `offset + direction(delta)` 중심으로 상태 전환.
- `statusCardCollapsedRef`를 도입해 scroll 콜백에서 최신 collapse 상태를 안정적으로 참조.
- 스크롤 종료 시점(`onMomentumScrollEnd`, `onScrollEndDrag`)에 임계값 기준으로 상태를 정규화해 중간 지점에서의 애매한 상태를 줄임.

## 기대 효과
- 스크롤 bounce/미세 흔들림에서 불필요한 토글 감소.
- 위/아래 스크롤 전환 시 collapse 동작 일관성 향상.
- 로직 가독성 개선(시간 기반 lock 제거, 의도 기반 조건 분리).

## 참고
- React Native Animations 문서의 스크롤 연동 애니메이션/이벤트 처리 가이드를 참고해, 스크롤 이벤트 기반 상태 전환 로직을 단순화하고 지터 완화 중심으로 재설계함.
