# 상태 카드 collapse 지터 원인 정리 및 쿨다운 가드 추가

## 배경
- 스크롤로 동기화 상태 카드를 접을 때 레이아웃 애니메이션과 리스트 오프셋 변화가 동시에 발생하면서, 임계값 근처에서 상태가 연속 토글되는 현상이 재발했다.
- 특히 collapse 직후 `ScrollView`의 `contentOffset`이 레이아웃 재배치로 튀면서, 다음 스크롤 이벤트가 즉시 반대 전환 조건을 만족해 "부들부들"한 흔들림으로 보일 수 있었다.

## 수행 내용
- collapse/expand 토글 직후 짧은 쿨다운(`COLLAPSE_TOGGLE_COOLDOWN_MS = 280`)을 추가했다.
- 마지막 토글 시각(`lastCollapseToggleAtRef`)을 기록하고, 쿨다운 구간에서는 `onScroll`/`onScrollEnd` 전환 판정을 건너뛰도록 변경했다.
- `onScrollEnd`에서 쿨다운 중이면 `lastScrollYRef`만 현재 값으로 동기화해, 쿨다운 해제 후 delta 계산이 과도해지지 않도록 보정했다.

## 기대 효과
- 레이아웃 변화에 따른 일시적인 오프셋 점프를 전환 신호로 오판하는 빈도를 줄여 collapse 지터를 완화한다.
- 기존 hysteresis 임계값 기반 로직을 유지하면서도, 애니메이션 직후의 불안정 구간만 국소적으로 차단해 동작 일관성을 높인다.
