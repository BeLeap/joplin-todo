# Joplin OneDrive TODO Widget 구현 계획 (MVP)

## 1. 요구사항 정리

`initial.md`와 `answers.md` 기준 MVP 범위:

- 플랫폼: **Android**
- 배포: **스토어 배포 앱**
- 위젯: **모바일 홈 화면 위젯**
- 연동 방식: **Joplin OneDrive 동기화 데이터 읽기 (읽기 전용)**
- 암호화(E2EE): **미지원**
- TODO 기준: **Joplin 공식 TODO 아이템**
- 정렬: **마감일(due date) 우선**
- 위젯 기능: **목록 조회만**
- 새로고침: **수동 + 주기적**
- 오프라인: **마지막 캐시 표시**
- 기술스택: **React Native (Expo), 로컬 앱 구성**

---

## 2. 아키텍처 제안

> 핵심 방향: Expo 기반 앱 + Android 네이티브 위젯 브리지 조합.

### 2.1 레이어 구성

1. **UI Layer (RN 화면)**
   - 계정 연결 상태, 마지막 동기화 시각, 수동 새로고침 버튼
   - 위젯 미리보기(앱 내부 리스트)

2. **Sync Layer (Joplin OneDrive Reader)**
   - OneDrive 내 Joplin sync 구조에서 TODO 관련 데이터 수집
   - E2EE 미지원 가드(암호화 항목 발견 시 안내 메시지)

3. **Domain Layer (Todo Normalizer/Sorter)**
   - Joplin 원본 데이터 → 앱 내부 `TodoItem` 모델 매핑
   - 정렬 규칙: `due` 오름차순, due 없음은 뒤로

4. **Storage Layer (Local Cache)**
   - 마지막 성공 동기화 결과 저장
   - 위젯/앱 공용 읽기 저장소(안드로이드 SharedPreferences 또는 파일 + 브리지)

5. **Widget Layer (Android App Widget)**
   - RemoteViews 기반 리스트 표시
   - 앱 데이터 캐시 읽어 렌더링
   - 수동 새로고침 액션 버튼

### 2.2 권장 모듈 구조

- `src/features/sync/*` : OneDrive/Joplin 동기화 로직
- `src/features/todo/*` : 파싱/정렬/도메인 모델
- `src/features/widget/*` : 위젯 데이터 포맷/브리지 호출
- `src/storage/*` : 캐시 저장/로드
- `android/` : AppWidgetProvider, Worker, Native Module

---

## 3. 구현 단계 (실행 순서)

## Phase 1 — 도메인/캐시 기반 만들기

1. `TodoItem` 타입 정의
   - 필수 필드: `id`, `title`, `due`, `completed`, `updatedTime`
2. 정렬 유틸 구현
   - due 존재 항목 우선, due 오름차순
3. 로컬 캐시 인터페이스 구현
   - 저장/불러오기/마지막 동기화 시각

**완료 기준**
- 샘플 데이터 기준 정렬/직렬화 테스트 통과

## Phase 2 — Joplin OneDrive 읽기

1. OneDrive 접근 흐름 구현
   - 계정 연결 및 파일 목록 접근
2. Joplin sync 데이터에서 TODO 엔티티 추출
3. E2EE 사용 데이터 탐지 시 graceful fallback
   - “암호화된 Joplin 저장소는 지원하지 않음” 표시

**완료 기준**
- 실제 계정(비암호화 Joplin)에 대해 TODO 목록 로딩 성공

## Phase 3 — 앱 화면(MVP)

1. 상태 화면 구성
   - 연결 상태 / 마지막 동기화 / 수동 새로고침
2. TODO 목록 렌더링
   - 마감일 기준 정렬 반영
3. 오프라인 시 캐시 표시

**완료 기준**
- 네트워크 차단 상태에서도 마지막 목록 노출

## Phase 4 — Android 홈 화면 위젯

1. AppWidgetProvider + 리스트 레이아웃 구현
2. 위젯 수동 새로고침 액션 연결
3. 주기적 업데이트 Worker 연결
4. 앱 캐시 ↔ 위젯 데이터 공유 브리지 연결

**완료 기준**
- 홈 화면에서 TODO 리스트 표시 + 수동/주기 갱신 동작

## Phase 5 — 안정화 및 배포 준비

1. 오류 처리/빈 상태/권한 실패 UX
2. 기본 로깅, 릴리즈 빌드 점검
3. 스토어 등록용 메타데이터/아이콘/설명 준비

**완료 기준**
- 내부 테스트 빌드에서 크리티컬 이슈 없이 설치/동작

---

## 4. 리스크 및 대응안

1. **Joplin OneDrive 포맷 해석 난이도**
   - 대응: 초기에 실제 샘플 데이터로 파서 POC 먼저 수행

2. **Expo Managed에서 App Widget 제약**
   - 대응: 필요 시 Development Build + config plugin 또는 prebuild로 전환

3. **백그라운드 갱신 제약(배터리 최적화/OS 정책)**
   - 대응: 주기 갱신 + 사용자가 명시적으로 수동 갱신 가능한 UX 동시 제공

4. **암호화 저장소 미지원으로 인한 사용자 혼란**
   - 대응: 연결 시점/동기화 시점에 명확한 안내 문구 제공

5. **OneDrive API 쿼터/네트워크 실패**
   - 대응: 캐시 중심 설계 + 재시도(backoff) + 마지막 성공 데이터 유지

---

## 5. Acceptance Criteria (MVP)

1. Android 홈 화면 위젯에서 Joplin TODO 목록이 표시된다.
2. TODO는 마감일 기준으로 정렬되어 표시된다.
3. 위젯 수동 새로고침이 동작한다.
4. 주기적 새로고침이 동작한다(OS 제약 범위 내).
5. 오프라인 상태에서 마지막 캐시 목록이 보인다.
6. Joplin E2EE 저장소일 경우 미지원 안내가 노출된다.
7. 앱은 TODO를 수정하지 않으며 읽기 전용으로 동작한다.

---

## 6. 제안 일정 (예시: 2주)

- **1~2일차**: Phase 1 (도메인/캐시)
- **3~6일차**: Phase 2 (OneDrive + Joplin 파싱)
- **7~9일차**: Phase 3 (앱 화면)
- **10~12일차**: Phase 4 (위젯)
- **13~14일차**: Phase 5 (안정화/배포 준비)

