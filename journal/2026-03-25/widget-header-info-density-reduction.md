# widget-header-info-density-reduction

## 요청 배경
- 추가 피드백: 단순히 카드 크기 축소뿐 아니라 상단 영역의 정보량 자체를 줄이는 방향 제안.

## 작업 내용
- `src/features/widget/android-home-widget.tsx` 상단 상태 카드를 한 줄 구조로 단순화.
  - 제거: `Joplin TODO` 라벨
  - 제거: `업데이트 ...` 시간 라인
  - 유지: 미완료 건수, 동기화 상태 배지
- 카운트 텍스트를 `N개` 형태로 축약해 공간 효율 개선.
- 더 이상 사용하지 않는 `formatSyncedAtLabel` 유틸 제거로 코드 정리.

## 의도
- 상단 카드가 전달하는 핵심 정보만 남겨 TODO 목록 가시성을 우선.
- 오류 카드는 기존처럼 별도 노출되어 실패 상태를 숨기지 않음.
