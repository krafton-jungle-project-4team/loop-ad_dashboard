# Private Connector 제어 평면 PoC

## 목적

이 문서는 고객사 네트워크 안에서 실행되는 Private Connector를 LoopAd Dashboard가
어떻게 관리할지 검토한 설계안이다. 현재 Dashboard에 해당 화면이나 API가 구현된
것은 아니며, 이 브랜치는 발표용 아키텍처 검증 자료로만 사용한다.

## 책임 경계

```text
고객사 데이터 평면
  고객 DB 읽기
  동의 상태 확인
  원본 고객 ID를 subject_id로 가명처리
  허용 속성만 선별
  LoopAd Collector로 outbound 전송

LoopAd 제어 평면
  Connector 등록 상태
  프로젝트 연결 상태
  스키마 매핑 버전
  동의 정책 버전
  가명 키 버전
  마지막 동기화 결과와 집계 건수
```

Dashboard는 고객 DB 계정, 접속 문자열, HMAC 비밀키, 원본 고객 ID, 이벤트 원문을
보관하거나 화면에 표시하지 않는다. 고객 DB adapter와 비밀키 회전은 고객사
Connector가 소유한다.

## 제어 평면 리소스

향후 API와 저장소에는 다음 비식별 metadata만 둔다.

```text
connector_id
tenant_id
project_id
display_name
deployment_mode = customer_managed
status = pending | connected | degraded | revoked
event_contract_version
schema_mapping_version
consent_policy_version
identity_namespace
identity_key_version
last_sync_started_at
last_sync_completed_at
last_sync_outcome
last_sync_accepted_count
last_sync_rejected_count
created_at
updated_at
```

인증 credential은 Secret Manager 같은 비밀 저장소의 참조만 보관한다. Dashboard
응답과 로그에는 secret 값이 포함되지 않는다.

## 예상 관리 흐름

1. 관리자가 tenant와 project에 Connector 등록 요청을 만든다.
2. LoopAd는 1회성 등록 토큰 또는 secret reference를 발급한다.
3. 고객사 운영자가 고객사 네트워크에 Connector를 설치하고 DB adapter, 동의
   정책, 가명 키를 직접 설정한다.
4. Connector는 outbound TLS 연결로 등록을 완료하고 계약 버전을 보고한다.
5. Dashboard는 연결 상태와 집계 결과만 조회한다.
6. 키 회전 시 새 `identity_key_version`을 등록하고 이전 버전의 보존 또는 삭제
   정책을 명시적으로 실행한다.

연결이 없거나 해제돼도 기존 Dashboard 서버는 정상 기동해야 한다. Connector
기능을 활성화하지 않은 프로젝트에는 credential이나 환경변수를 요구하지 않는다.

## 삭제와 동의 철회

원본 고객 ID는 LoopAd로 보내지 않으므로 삭제 요청은 고객사 Connector가 같은
namespace와 key version으로 `subject_id`를 계산해 전달한다.

```text
고객사 삭제 요청
→ Connector가 subject_id 계산
→ 삭제 요청 ID와 subject_id 전송
→ Event, audience snapshot, assignment, model dataset의 처리 상태 기록
→ 완료 또는 보존 의무에 따른 제한 결과 반환
```

동의 철회 이후 Connector는 신규 이벤트 전송을 중단한다. 과거 데이터 삭제 또는
보존은 고객사 정책과 법적 근거에 따라 별도 처리하며, LoopAd가 자동으로 법적
판단을 대신하지 않는다.

## 관측성과 로깅

`apps/api-server/docs/reference_logging.md`를 따르며 다음 값만 추적한다.

```text
requestId
tenantId
projectId
connectorId
operation
event
durationMs
contractVersion
syncOutcome
acceptedCount
rejectedCount
failureCode
```

로그 금지 항목:

```text
원본 고객 ID
subject_id 전체 값
DB 접속정보
credential 또는 token
이벤트 properties 원문
동의 원문
```

## 현재 검증 범위

- Event SDK와 Advertisement SDK가 명시적 PoC 설정에서 `subject_id`를 사용할 수
  있는지 검증한다.
- Event Collector가 별도 인증 경로에서 개인정보 보호 이벤트 계약을 검증하는지
  확인한다.
- 고객사 Connector CLI가 원본 ID를 고객사 경계 안에서 HMAC-SHA256으로
  가명처리하는지 확인한다.

아직 구현하거나 검증하지 않은 범위:

- Dashboard Connector 등록 화면과 API
- PostgreSQL, MySQL, warehouse별 운영 adapter
- 고객사 네트워크 설치 자동화
- secret rotation과 삭제 요청 orchestration
- 법률 검토와 고객사별 동의 문구
- SLA, 장애 복구, 대규모 처리 성능

