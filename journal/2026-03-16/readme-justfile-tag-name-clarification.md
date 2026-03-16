# README Justfile TAG_NAME 안내 정정

- 배경: 이전 변경에서 Justfile 보조 명령어 예시에 `TAG_NAME=0.0.0`를 일괄 추가했으나, 실제로는 Justfile 실행 시 `TAG_NAME`을 별도 지정하지 않아도 됨.
- 조치:
  - `README.md`의 `Justfile 보조 명령어` 코드블록에서 `TAG_NAME=0.0.0` 프리픽스를 제거.
  - 다른 실행/빌드 명령어의 `TAG_NAME=0.0.0` 안내는 유지.
- 비고: 문서 정정만 수행, 런타임/코드 동작 변경 없음.
