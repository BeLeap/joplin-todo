# widget-top-status-card-compact-sizing

## 요청 배경
- 사용자 피드백: 위젯 상단 상태 카드가 전체 위젯 대비 크게 느껴진다고 언급.

## 작업 내용
- `src/features/widget/android-home-widget.tsx`의 상단 상태 카드 높이에 직접 영향을 주는 타이포/패딩을 축소.
  - 카드 내부 패딩(`paddingHorizontal`, `paddingVertical`) 축소
  - 카드 하단 여백(`marginBottom`) 축소
  - 헤더 행 하단 여백 축소
  - 서비스 라벨(`Joplin TODO`) 폰트 축소
  - 상태 배지 패딩/폰트 축소
  - 메인 카운트(`N개의 할 일`) 폰트 축소(24 -> 20)
  - 업데이트 시간 폰트 축소

## 의도
- 정보 구조는 유지하면서 상단 카드의 시각적 점유율만 줄여 TODO 리스트 노출 영역을 확대.
- 오류 상태/동기화 상태 전달은 그대로 유지.
