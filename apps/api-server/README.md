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
    │   ├── database
    │   └── dashboard.module.ts
    └── health
```

## 기술 선택

- NestJS: Dashboard API의 controller, service, repository 경계를 명확하게 나눈다.
- Zod/shared schema: API 서버와 웹 클라이언트가 같은 응답 contract를 사용한다.
- PostgreSQL / Aurora Postgres: 추천 결과, 액션, 세그먼트 매핑, 광고 소재 운영 상태를 조회한다.
- ClickHouse: 사용자 행동 이벤트, 퍼널, 전환율, 세그먼트 집계를 조회한다.
- Mantine: 프론트가 API 응답을 읽기 전용 화면으로 렌더링할 때 사용하는 기본 UI 컴포넌트다.
- Clean React: 프론트 변경은 화면별 응답 렌더링에 집중하고 불필요한 상태와 mutation 흐름을 만들지 않는다.
- Apple Design Guidelines: Action Blue, 조용한 카드 표면, 큰 지표 타이포그래피를 대시보드 밀도에 맞게 적용한다.
- Env validation: 서버 시작 시 필수 외부 DB 연결 정보를 즉시 검증한다.
- 외부 DB 조회 구조: 프론트는 DB에 직접 접근하지 않고 API 서버의 repository 계층만 ClickHouse/Postgres를 조회한다.

## 개발 규칙

- API 서버의 전역 prefix는 `/api`를 유지한다.
- Dashboard API는 GET 조회 전용이다.
- Controller는 요청/응답 경계를 담당한다.
- Service는 화면 단위 use case 조율과 계산 책임을 가진다.
- Repository 계층은 ClickHouse/Postgres 조회를 담당한다.
- 프론트는 DB에 직접 접근하지 않는다.
- 프론트는 백엔드 API 응답을 받아 Mantine UI로 렌더링한다.
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
→ Dashboard FE가 Mantine UI로 렌더링
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
- CORS: `https://loop-ad.org` 및 `https://*.loop-ad.org` origin만 허용한다. 로컬 개발은 프록시로 해결하며 `localhost`와 `127.0.0.1`은 CORS 허용 목록에 넣지 않는다.
- 조회하는 DB: Aurora Postgres contract DB의 `projects`, `latest_user_primary_segments`, `segments`, `segment_ad_mappings`, `generated_contents`, `experiments`, `experiment_variants`, `recommendation_actions`.
- serving 흐름: `projectId`로 project를 확인하고, 사용자의 latest primary segment가 없으면 default segment로 fallback한 뒤, `placementKey` 후보 중 최고 priority를 고르고 같은 priority에서는 `projectId:userId:placementKey` hash와 `traffic_weight`로 deterministic weighted pick을 수행한다.
- 응답 형식: 전역 `{ requestId, data }` envelope를 유지하고 외부 JSON 필드는 camelCase를 사용한다.
- no-fill: 오류가 아니므로 `200 OK`와 `status: "empty"`, `ad: null`, `tracking: null`을 반환한다.
- 실패: 필수 필드 누락은 `400`, 존재하지 않는 `projectId`는 `404`, DB 장애는 `500`으로 반환한다.
- DB 전제: 이번 MVP는 `segment_ad_mappings.placement_key`에 `C1_MAIN_TOP`, `W1_WING` 값이 존재한다고 가정한다.

`GET /api/dashboard/main`

- 목적: 메인 대시보드 KPI, 실시간 이벤트/구매 추이, 세그먼트 현황을 조회한다.
- 조회하는 DB: ClickHouse events, Aurora Postgres 운영 상태.
- 주요 응답 필드: `kpis`, `behavior_event_series`, `purchase_series`, `segment_status`.
- 프론트 화면 요소: KPI 카드, 막대형 추이, 마케팅 채널/지역/연령·성별/기기별 구매 카드.
- 실패 시 동작: mock 값 없이 API 에러를 반환하고 프론트는 Alert를 표시한다.

`GET /api/dashboard/purchase-conversion`

- 목적: 구매 퍼널과 고객군별 구매 행동을 조회한다.
- 조회하는 DB: ClickHouse events, 필요 시 Aurora Postgres 세그먼트/추천 상태.
- 주요 응답 필드: `funnel_steps`, `device_rows`, `customer_behavior_rows`.
- 프론트 화면 요소: 단계별 퍼널, 기기별 전환 테이블, 고객군별 행동 테이블.
- 실패 시 동작: mock 값 없이 API 에러를 반환하고 프론트는 Alert를 표시한다.

`GET /api/dashboard/ai-analysis`

- 목적: 전환율 하위 고객군과 저장된 분석 근거를 조회한다.
- 조회하는 DB: ClickHouse events, Aurora Postgres recommendation_results.
- 주요 응답 필드: `customers`, `selected_customer.metrics`, `case_analysis`, `rationale`, `stage_flow`.
- 프론트 화면 요소: 하위 고객군 테이블, 선택 고객군 상세 분석, 판단 근거, 구매 단계 흐름.
- 실패 시 동작: AI 서버를 호출하지 않고 API 에러를 반환한다.

`GET /api/dashboard/ai-recommendation`

- 목적: 전환율 상위 고객군과 저장된 추천 액션을 조회한다.
- 조회하는 DB: Aurora Postgres recommendation_results, recommendation_actions, action_catalog, segment_ad_mappings, ad_creatives와 ClickHouse events.
- 주요 응답 필드: `customers`, `selected_customer`, `recommended_actions`, `recommendation_rationale`.
- 프론트 화면 요소: 상위 고객군 테이블, 선택 고객군 상세, 추천 광고 액션, 추천 근거.
- 실패 시 동작: 추천 생성 POST 없이 API 에러를 반환한다.

`GET /api/dashboard/ai-generation`

- 목적: 저장된 광고 문구/이미지/영상/랜딩 콘텐츠 상태를 조회한다.
- 조회하는 DB: Aurora Postgres recommendation_actions, segment_ad_mappings, ad_creatives.
- 주요 응답 필드: `selected_customer`, `generated_items`, `content`.
- 프론트 화면 요소: 선택 고객군, 액션별 콘텐츠 카드, content_url 링크/이미지, 콘텐츠 미생성 상태.
- 실패 시 동작: 콘텐츠 생성 POST 없이 API 에러를 반환한다.

## Dashboard 페이지별 데이터 흐름

1. 메인 대시보드

프론트:

- `GET /api/dashboard/main`을 호출한다.
- KPI 카드, 실시간 추이, 세그먼트 현황을 렌더링한다.

백엔드:

- ClickHouse에서 이벤트/구매/전환 이벤트를 집계한다.
- 화면 단위 JSON으로 KPI와 chart series를 반환한다.

2. 구매 전환

프론트:

- `GET /api/dashboard/purchase-conversion`을 호출한다.
- 퍼널, 기기별 전환 테이블, 고객군별 구매 행동을 렌더링한다.

백엔드:

- ClickHouse에서 퍼널 단계별 count와 device/customer group별 전환율을 계산한다.
- 분모가 0이면 rate는 0으로 반환한다.

3. AI 분석

프론트:

- `GET /api/dashboard/ai-analysis`를 호출한다.
- 전환율 하위 고객군과 선택 고객군 상세를 렌더링한다.

백엔드:

- ClickHouse에서 고객군별 이벤트/전환 데이터를 조회한다.
- Postgres에 저장된 분석 JSON과 추천 결과를 함께 읽어 판단 근거로 반환한다.

4. AI 추천

프론트:

- `GET /api/dashboard/ai-recommendation`을 호출한다.
- 전환율 상위 고객군, 추천 액션, 추천 근거를 렌더링한다.

백엔드:

- Postgres에서 recommendations, recommendation_actions, action_catalog, segment_ad_mappings, ad_creatives를 조회한다.
- ClickHouse 고객군 집계와 결합해 화면 JSON을 반환한다.

5. AI 생성

프론트:

- `GET /api/dashboard/ai-generation`을 호출한다.
- 광고 문구, 이미지/링크, 생성 상태를 렌더링한다.

백엔드:

- Postgres에서 추천 액션과 연결된 ad_creatives를 조회한다.
- 콘텐츠가 아직 없으면 `content: null`로 반환한다.

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
- Mantine 없이 임의 UI 하드코딩 금지
