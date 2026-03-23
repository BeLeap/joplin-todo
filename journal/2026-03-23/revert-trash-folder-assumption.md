# revert trash folder assumption

- 사용자 피드백: Joplin TODO는 trash notebook 하위 이동으로 처리되는 것이 아니라, 제공된 실제 메타데이터처럼 `deleted_time`이 채워지는 방식으로 보임.
- 조치:
  - 전날 추가했던 notebook ancestry / trash title 추론 로직과 checkpoint folder 상태 저장을 제거해 동기화 경로를 다시 단순화.
  - 실제 사용자 예시와 같은 `deleted_time` 값이 있는 TODO가 결과에서 제외되는 회귀 테스트를 추가.
- 메모:
  - 현재 앱은 trash 여부를 TODO 자신의 `deleted_time`으로 판단한다.
  - 이후 다른 실제 Joplin 샘플에서 다른 패턴이 확인되면, 그 근거를 바탕으로 별도 로직을 추가하는 편이 안전하다.
