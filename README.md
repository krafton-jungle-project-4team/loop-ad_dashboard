# LoopAd Dashboard

LoopAd SaaS MVP 대시보드입니다. 이 대시보드는 조회 전용이며, 분석 실행,
추천 생성, 콘텐츠 생성, 광고 선택, 실험 업데이트를 직접 수행하지 않습니다.
외부 DB/API 연결 실패는 mock success나 fallback 데이터로 숨기지 않고 에러로
드러냅니다.

## Structure

- `apps/web-client`: Mantine 기반 React 대시보드
- `apps/api-server`: Dashboard API 서버
- `packages/shared`: API contract와 공통 타입
- `compose.yml`: API, Web live server

## MVP Dashboard Contract

Dashboard API는 Nest global prefix `/api` 아래에서 아래 5개 조회 endpoint만
사용합니다.

- `GET /api/dashboard/events/summary?projectId=google-ga4-demo-commerce`
- `GET /api/dashboard/funnel?projectId=google-ga4-demo-commerce`
- `GET /api/dashboard/recommendations?projectId=google-ga4-demo-commerce`
- `GET /api/dashboard/experiments/1?projectId=google-ga4-demo-commerce`
- `GET /api/dashboard/experiments/1/performance?projectId=google-ga4-demo-commerce`

MVP 데모 계약 ID는 fallback이 아니라 명시적으로 요청에 포함하는 값입니다.

- `project_id`: `google-ga4-demo-commerce`
- `recommendation_result_id`: `1`
- `action_id`: `act_free_shipping_coupon`
- `experiment_id`: `1`
- `creative_id`: `1`
- `mapping_id`: `1`
- `bandit_policy_id`: `1`
- `bandit_arm_id`: `1`

`projectId`가 없으면 API는 `400`을 반환합니다. 존재하지 않는 experiment는
`404`를 반환합니다. 대시보드는 `loop-ad_local-data-source_contract`의 실제
PostgreSQL/ClickHouse schema를 기준으로 읽고, 화면 응답에서만 MVP 이름으로
매핑합니다.

- `recommendation_id` = `recommendation_results.id`
- `content_id` = `ad_creatives.id` / ClickHouse `events.creative_id`
- `content_url` = `ad_creatives.image_url`
- `decision_id` = ClickHouse `events.bandit_decision_id`
- action probability = `bandit_arms.alpha/beta` 기반 normalized score
- 성과 로그 = ClickHouse `events`의 `action_id`, `mapping_id`, `creative_id`,
  `bandit_policy_id`, `bandit_arm_id`, `bandit_decision_id`

## Run

로컬 데이터 소스는 `loop-ad_local-data-source_contract` repo에서 먼저 준비합니다.

```bash
./scripts/init.sh local
./scripts/dummy.sh local
```

팀 공통 로컬 endpoint는 Postgres `localhost:15432`, ClickHouse HTTP
`http://localhost:18123`, Redis `localhost:16379`입니다.

```bash
npm install
npm run dev
```

`npm run dev`는 shell, Docker Compose, 또는 배포 환경에서 주입된 env를 읽습니다.
로컬 개인 값은 `.env.local`이나 개인 shell 환경에서 관리하되, 앱 코드는 env 파일을
직접 로드하지 않습니다.

필수 앱 env 예시는 `.env.example`을 참고하세요. Web client는
`VITE_LOOPAD_API_BASE_URL=http://localhost:8080/api`처럼 public API base URL을
build-time에 검증합니다.

Web: `http://localhost:5173`
API: `http://localhost:8080/api`

Dashboard 화면은 조회 대상을 fallback으로 채우지 않습니다. URL에 명시적으로
`projectId`와 `experimentId`를 포함해야 API 요청을 시작합니다.

```text
http://localhost:5173/?projectId=google-ga4-demo-commerce&experimentId=1
```

## Smoke Checks

외부 PostgreSQL/ClickHouse와 API env가 준비된 상태에서 아래 URL을 확인합니다.

- `/api/dashboard/events/summary?projectId=google-ga4-demo-commerce`
- `/api/dashboard/funnel?projectId=google-ga4-demo-commerce`
- `/api/dashboard/recommendations?projectId=google-ga4-demo-commerce`
- `/api/dashboard/experiments/1?projectId=google-ga4-demo-commerce`
- `/api/dashboard/experiments/1/performance?projectId=google-ga4-demo-commerce`

Web UI는 Mantine 컴포넌트를 기본으로 사용하고, Apple-style dashboard 기준에 맞춰
Action Blue, parchment/white surfaces, 조용한 hairline border를 사용합니다.
