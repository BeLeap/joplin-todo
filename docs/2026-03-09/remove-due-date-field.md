# remove-due-date-field

- Joplin TODO 도메인 모델에서 `due` 필드를 제거했습니다.
- 동기화 파서에서 `todo_due` 메타데이터 파싱/정규화를 제거했습니다.
- 앱 목록/안드로이드 위젯에서 마감일 표시를 제거했습니다.
- TODO 정렬 기준을 `updatedTime` 최신순(동률 시 제목순)으로 변경했습니다.
- 타입 변경에 맞춰 phase 체크 테스트 코드를 갱신했습니다.
