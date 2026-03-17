# handle joplin deleted_time

- 요청: Joplin TODO가 파일 삭제가 아니라 `deleted_time` 메타데이터가 0에서 timestamp로 바뀌는 점 반영.
- 변경:
  - `JoplinRawTodo` 타입에 `deleted_time` 필드 추가.
  - OneDrive 메타데이터 파서에서 `deleted_time` 키를 수집/파싱하도록 확장.
  - TODO 정규화 단계에서 `deleted_time > 0` 항목은 명시적으로 제외.
- 검증:
  - `TAG_NAME=0.0.0 npm run lint` 실행.
