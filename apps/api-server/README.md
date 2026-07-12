# API Server

## 폴더 구조

```text
src
├── main.ts
├── app.module.ts
├── infra
│   ├── env
│   ├── database
│   └── http
└── features
    ├── dashboard
    │   ├── controller
    │   ├── database
    │   ├── service
    │   ├── repository
    │   └── dashboard.module.ts
    └── health
```

## 기술 선택

- NestJS: Dashboard API의 controller, service, reader/writer, domain 경계를 명확하게 나눈다.
- Zod/shared schema: API 서버와 웹 클라이언트가 같은 응답 contract를 사용한다.
- PostgreSQL / Aurora Postgres: 캠페인, 프로모션, 세그먼트, 광고 실험, 퍼널 정의를 조회/저장한다.
- ClickHouse: 사용자 행동 이벤트와 퍼널 선택용 수집 이벤트 목록을 조회한다.
- shadcn/ui: 프론트가 API 응답을 대시보드 UI로 렌더링할 때 사용하는 기본 UI 컴포넌트다.
- Clean React: 프론트 변경은 화면별 응답 렌더링에 집중하고 불필요한 상태와 mutation 흐름을 만들지 않는다.
- Apple Design Guidelines: Action Blue, 조용한 카드 표면, 큰 지표 타이포그래피를 대시보드 밀도에 맞게 적용한다.
- Env validation: 서버 시작 시 필수 외부 DB 연결 정보를 즉시 검증한다.
- OpenAI env validation: Data Explorer AI query plan은 `LOOPAD_OPENAI_API_KEY`를
  필수로 검증하고, 누락/실패 시 fallback plan을 만들지 않는다. OpenAI model은 앱 코드 상수로 관리한다.
- Ad dispatch env validation: AWS region, SES/SMS 옵션, demo recipient read DB 연결 정보를 서버 시작 시 검증한다.
- 외부 DB 조회 구조: 프론트는 DB에 직접 접근하지 않고 API 서버의 reader/writer/view query 계층만 ClickHouse/Postgres를 조회한다.
- Logging: 언어/프레임워크 공통 로깅 표준은 `docs/reference_logging.md`를 따른다.

## 개발 규칙

- API 서버의 전역 prefix는 `/api`를 유지한다.
- Dashboard API는 화면 조회 GET과 퍼널 정의 저장 POST를 제공한다.
- Controller는 요청/응답 경계를 담당한다.
- Service는 화면 단위 use case 조율과 계산 책임을 가진다.
- DB 접근 class는 현재 대시보드 범위에서 `XxxReader` 이름을 사용한다.
- Postgres 접근은 `database/*.sql`에 PgTyped query를 두고 `database/__generated__` 타입을 통해 실행한다.
- Repository 폴더의 reader는 ClickHouse/PgTyped 조회와 저장을 담당하고, DB row를 그대로 service 밖으로 노출하지 않는다.
- 프론트는 DB에 직접 접근하지 않는다.
- 프론트는 백엔드 API 응답을 받아 shadcn/ui 기반 화면으로 렌더링한다.
- DB 조회, 조인, 이벤트 count, 퍼널 계산, CTR/CVR 계산은 백엔드에서 수행한다.
- 프론트는 숫자 포맷팅, 퍼센트 표시, UI 배치 정도만 수행한다.
- fallback 데이터를 만들지 않는다.
- 인프라 파일은 명시 요청 없이는 수정하지 않는다.

## 실행

```bash
npm run dev
npm run lint
npm run format
npm run typecheck
npm run build
```

## DB 흐름

```text
Dashboard FE
→ Advertisement & Dashboard API Server
→ ClickHouse / Aurora Postgres
→ API Server가 화면 단위 JSON 응답 구성
→ Dashboard FE가 shadcn/ui 기반 화면으로 렌더링
```

스키마 기준 파일:

```text
/Users/yang-eun-yeol/Desktop/projects/loop-ad_data-source_contract/postgres/schema.sql
/Users/yang-eun-yeol/Desktop/projects/loop-ad_data-source_contract/clickhouse/schema.sql
```

## Dashboard API 계약

- 목적: 대시보드 메인의 캠페인 목록을 조회한다.
- 조회하는 DB: Aurora Postgres contract DB의 `campaigns`, `promotions`, `promotion_target_segments`, `ad_experiments`, `promotion_evaluations`.
- 주요 응답 필드: `campaigns`, `promotion_count`, `segment_count`, `ad_experiment_count`, `latest_goal_achievement_rate`.
- 실패 시 동작: fallback 값 없이 API 에러를 반환하고 프론트는 Alert를 표시한다.

`GET /api/dashboard/v1/funnels?project_id=hotel-client-a`

- 목적: 관리자가 저장한 활성 퍼널 정의와 단계를 조회한다.
- 조회하는 DB: Aurora Postgres contract DB의 `funnel_definitions`, `funnel_steps`.
- 주요 응답 필드: `funnels`, `steps`, `step_name`, `event_name`.
- 실패 시 동작: fallback 값 없이 API 에러를 반환한다.

`GET /api/dashboard/v1/event-catalog?project_id=hotel-client-a`

- 목적: 퍼널 생성 UI에서 선택 가능한 실제 수집 이벤트 목록을 조회한다.
- 조회하는 DB: ClickHouse `funnel_step_events`.
- 주요 응답 필드: `events`, `event_name`, `display_name`, `event_count`.
- `event_name`은 Data Source Contract의 `funnel_steps.event_name` 허용 목록과 shared schema로 검증한다.

`POST /api/dashboard/v1/funnels?project_id=hotel-client-a`

- 목적: 관리자가 선택한 수집 이벤트 단계로 퍼널 정의를 저장한다.
- 쓰는 DB: Aurora Postgres contract DB의 `funnel_definitions`, `funnel_steps`.
- Request body: `funnel_name`, `steps[].step_name`, `steps[].event_name`.
- `event_name`은 shared schema에서 먼저 검증하고, DB CHECK 제약과 같은 허용 목록만 받는다.

## Ad Dispatch API 계약

`POST /api/ad/promotion-runs/:promotion_run_id/dispatch`

- 목적: 저장된 active assignment 콘텐츠를 기준으로 Email/SMS promotion을 demo recipient에게 외부 provider로 발송한다.
- Provider: Email/SMS dispatch는 항상 AWS provider를 사용한다.
- AWS Email: SES v2 `SendEmail`을 사용한다. Region은 `ap-northeast-2`, From address는
  `noreply@loop-ad.org`로 코드에서 고정한다.
- AWS SMS: AWS End User Messaging SMS Voice v2 `SendTextMessage`를 사용한다. Region은
  `ap-northeast-2`로 코드에서 고정한다.
- Recipient 해석: sender에는 `user_id`를 넘기지 않는다. 현재 `RecipientDirectory`는 필수 env
  `LOOPAD_DEMO_DISPATCH_RECIPIENTS` JSON 배열을 demo용 가상 DB처럼 사용한다.
- Dispatch 대상: API 요청 1회마다 `LOOPAD_DEMO_DISPATCH_RECIPIENTS`에 설정된 user_id 각각에 1회씩만 발송한다.
  active assignment가 같은 user_id에 여러 개 있으면 첫 번째 assignment를 사용하고, env user_id에 직접 매칭되는
  assignment가 없으면 promotion run의 첫 active assignment를 demo 발송 템플릿으로 사용한다.
- 관측성: dispatch 흐름은 `LogContextScope`, `log.assignContext`, `log.info/warn/error` 기반 structured log로 추적한다.
- TODO: recipient table이 분석 DB에 확정되면 같은 Postgres repository/PgTyped 조회로 교체한다.
- 실패 코드: 응답의 `jobs[].attempts[].error_code`와 dispatch job result attempts에
  `RECIPIENT_CONTACT_INVALID`, `PROVIDER_SEND_FAILED`, `CONTENT_INVALID`를 저장한다.
- 개인정보 로그: 현재 demo/test dispatch 로그는 원인 분석을 우선해 raw 객체를 남긴다. real user production redaction은 별도 정책으로 결정한다.

## Dashboard 페이지별 데이터 흐름

### SDK Tracking Plan API

관리 API는 `/api/dashboard/v1/projects/:projectId/tracking-plan` 아래에서 plan 생성·조회,
draft event CRUD, validation, publish를 제공하고 `/sdk-settings`에서 허용 Origin을
저장합니다. publish는 immutable `tracking_plan_revisions` insert와
`project_sdk_settings` active revision 변경을 하나의 PostgreSQL transaction으로
처리합니다.

공개 SDK endpoint는 다음과 같습니다.

- `GET /api/public/v1/sdk/connections/:sdkKey`
- `GET /api/public/v1/sdk/connections/:sdkKey/schema`

두 endpoint는 프로젝트 allowlist와 정확히 일치하는 `Origin` header가 없으면 `403`을
반환합니다. connection 응답은 API 공통 wrapper 없이 SDK runtime contract JSON을 직접
반환합니다. `sdkKey`와 Origin은 공개·조작 가능한 값이므로 인증 수단이 아니며, 이번
데모 범위에서는 별도 browser secret이나 CSRF key를 추가하지 않습니다.

1. 메인 대시보드

프론트:

- `GET /api/dashboard/v1/main?project_id=...`을 호출한다.
- 캠페인 목록, 프로모션 수, 세그먼트 수, 광고 실험 수, 최근 목표 달성률을 렌더링한다.

백엔드:

- Postgres contract DB에서 캠페인 기준 요약 정보를 집계한다.
- 화면 단위 JSON으로 캠페인 목록을 반환한다.

2. 퍼널

프론트:

- `GET /api/dashboard/v1/event-catalog?project_id=...`으로 수집 이벤트 목록을 불러온다.
- 관리자가 선택한 이벤트 단계로 `POST /api/dashboard/v1/funnels?project_id=...`를 호출한다.
- 저장된 퍼널 목록은 `GET /api/dashboard/v1/funnels?project_id=...` 응답으로 렌더링한다.

백엔드:

- ClickHouse `funnel_step_events`에서 실제 수집 이벤트를 조회한다.
- Postgres `funnel_definitions`와 `funnel_steps`에 퍼널 정의를 저장/조회한다.

## 로컬 연결 기준

- ClickHouse/Postgres는 외부 데이터 저장소로 간주한다.
- 프론트는 DB에 직접 접근하지 않는다.
- 백엔드는 env/config로 주입된 연결 정보로 외부 DB에 접속한다.
- 연결 실패 시 fallback success를 반환하지 않는다.
- 실패는 명확한 에러로 드러낸다.

## 금지 사항

- AI 서버 POST 호출 금지
- 콘텐츠 생성 POST 호출 금지
- 실험 평가 POST 호출 금지
- fallback success 금지
- fallback content 금지
- fallback image 금지
- fallback project/segment/experiment 금지
- 명시 요청 없는 인프라 파일 수정 금지
- `.env`, `.env.local`, `.env.*.local` 커밋 금지
- secret 노출 금지
- 프론트에서 DB 직접 접근 금지
- shadcn/ui 없이 임의 UI 하드코딩 금지
