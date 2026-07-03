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
- 외부 DB 조회 구조: 프론트는 DB에 직접 접근하지 않고 API 서버의 reader/writer/view query 계층만 ClickHouse/Postgres를 조회한다.

## 개발 규칙

- API 서버의 전역 prefix는 `/api`를 유지한다.
- Dashboard API는 화면 조회 GET과 퍼널 정의 저장 POST를 제공한다.
- Controller는 요청/응답 경계를 담당한다.
- Service는 화면 단위 use case 조율과 계산 책임을 가진다.
- DB 접근 class는 현재 대시보드 범위에서 `XxxReader` 이름을 사용한다.
- Repository 폴더의 reader는 ClickHouse/Postgres 조회와 저장을 담당하고, DB row를 그대로 service 밖으로 노출하지 않는다.
- 프론트는 DB에 직접 접근하지 않는다.
- 프론트는 백엔드 API 응답을 받아 shadcn/ui 기반 화면으로 렌더링한다.
- DB 조회, 조인, 이벤트 count, 퍼널 계산, CTR/CVR 계산은 백엔드에서 수행한다.
- 프론트는 숫자 포맷팅, 퍼센트 표시, UI 배치 정도만 수행한다.
- mock success나 fallback 데이터를 만들지 않는다.
- 인프라 파일은 수정하지 않는다.

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

`POST /api/ads/serve`

- 목적: 고객사/데모 프론트에서 단일 placement 광고를 조회한다.
- 공개 범위: 인증 없는 public browser API이며 secret, JWT, API key를 요구하지 않는다.
- CORS: `https://loop-ad.org` 및 `https://*.loop-ad.org` origin을 허용한다. 로컬 개발 환경에서는 `localhost`와 `127.0.0.1` HTTP origin도 허용한다.
- 조회하는 DB: Aurora Postgres contract DB의 `projects`, `latest_user_primary_segments`, `segments`, `active_ad_serving_rules`.
- `active_ad_serving_rules`는 광고 응답에 필요한 `mapping_id`, `action_id`, `experiment_variant_id`, `generated_content_id`를 제공해야 한다.
- serving 흐름: `projectId`로 project를 확인하고, 사용자의 latest primary segment가 없으면 default segment로 fallback한 뒤, `placementKey` 후보 중 최고 priority를 고르고 같은 priority에서는 `projectId:userId:placementKey` hash와 `traffic_weight`로 deterministic weighted pick을 수행한다.
- 응답 형식: 전역 `{ requestId, data }` envelope를 유지하고 외부 JSON 필드는 camelCase를 사용한다.
- no-fill: 오류가 아니므로 `200 OK`와 `status: "empty"`, `ad: null`, `tracking: null`을 반환한다.
- 실패: 필수 필드 누락은 `400`, 존재하지 않는 `projectId`는 `404`, DB 장애는 `500`으로 반환한다.
- DB 전제: 이번 MVP는 `segment_ad_mappings.placement_key`에 `C1_MAIN_TOP`, `W1_WING` 값이 존재한다고 가정한다.

`GET /api/dashboard/v1/main?project_id=hotel-client-a`

- 목적: 대시보드 메인의 캠페인 목록을 조회한다.
- 조회하는 DB: Aurora Postgres contract DB의 `campaigns`, `promotions`, `promotion_target_segments`, `ad_experiments`, `promotion_evaluations`.
- 주요 응답 필드: `campaigns`, `promotion_count`, `segment_count`, `ad_experiment_count`, `latest_goal_achievement_rate`.
- 실패 시 동작: mock 값 없이 API 에러를 반환하고 프론트는 Alert를 표시한다.

`GET /api/dashboard/v1/funnels?project_id=hotel-client-a`

- 목적: 관리자가 저장한 활성 퍼널 정의와 단계를 조회한다.
- 조회하는 DB: Aurora Postgres contract DB의 `funnel_definitions`, `funnel_steps`.
- 주요 응답 필드: `funnels`, `steps`, `step_name`, `event_name`.
- 실패 시 동작: mock 값 없이 API 에러를 반환한다.

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

## Dashboard 페이지별 데이터 흐름

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
- 연결 실패 시 mock/fallback success를 반환하지 않는다.
- 실패는 명확한 에러로 드러낸다.

## 금지 사항

- AI 서버 POST 호출 금지
- 콘텐츠 생성 POST 호출 금지
- 실험 평가 POST 호출 금지
- mock success 금지
- fallback content 금지
- fallback image 금지
- fallback project/segment/experiment 금지
- 인프라 파일 수정 금지
- `.env`, `.env.local`, `.env.*.local` 커밋 금지
- secret 노출 금지
- 프론트에서 DB 직접 접근 금지
- shadcn/ui 없이 임의 UI 하드코딩 금지
