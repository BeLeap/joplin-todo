# README/AGENTS 지침 위치 정리

## 작업 배경
- 기존에는 루트 `AGENTS.md`에만 작업 기록 규칙이 존재했습니다.
- 요청에 따라 동일 지침을 `README.md`에도 명시하고, `AGENTS.md`는 심볼릭 링크로 전환했습니다.

## 수행 내용
1. `README.md`에 "에이전트 작업 기록 규칙" 섹션 추가
2. 루트 `AGENTS.md`를 `README.md`를 가리키는 symbolic link로 변경

## 기대 효과
- 저장소 진입 시 `README.md`만 읽어도 규칙 확인이 가능합니다.
- 에이전트가 `AGENTS.md`를 찾는 워크플로우도 그대로 유지됩니다.
