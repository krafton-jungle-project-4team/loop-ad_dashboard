# [진혁] ai decision 이외의 팀에게 전달사항

핵심은 **AI Decision은 결과를 PostgreSQL에 써주고, 다른 서버들은 AI Decision을 실시간 호출하지 않고 PostgreSQL/ClickHouse 규약대로 읽고 쓰는 것**이야. PostgreSQL은 Dashboard/Advertisement 서버가 읽는 contract DB라는 전제로 잡혀 있어.

# 0. 전체 공통 규약

```
AI Decision은 실시간 광고 응답 서버가 아니다.
AI Decision은 daily job으로 분석/추천/실험 결과를 PostgreSQL에 저장한다.

Dashboard와 Advertisement 서버는 AI Decision API를 실시간으로 호출하지 않는다.
Dashboard와 Advertisement 서버는 PostgreSQL contract table/view를 읽는다.

ClickHouse는 raw event 저장소다.
PostgreSQL은 분석/추천/실험/광고 serving contract 저장소다.
```

가장 중요한 ID 규약은 이거야.

```
PostgreSQL project_id = projects.id, BIGINT
ClickHouse events.project_id = projects.project_key, String
```

그리고 광고 추적 필드는 이렇게 확정.

```
ClickHouse events.project_id    = projects.project_key
ClickHouse events.experiment_id = str(experiments.id)
ClickHouse events.variant_id    = str(experiment_variants.id)
ClickHouse events.creative_id   = str(generated_contents.id)
ClickHouse events.mapping_id    = str(segment_ad_mappings.id)
ClickHouse events.action_id     = str(recommendation_actions.id), 가능하면 사용
```

**절대 헷갈리면 안 되는 것:**

```
variant_key = "control" / "treatment_a"  → PostgreSQL 내부 표시용
variant_id  = experiment_variants.id 문자열 → ClickHouse 이벤트 추적용
```

---

# 1. 광고 서버 팀이 알아야 할 것

광고 서버는 AI Decision을 호출하지 않고 PostgreSQL을 읽어서 광고를 응답하면 돼.

## 광고 서버 조회 흐름

```
1. 요청에서 project_key, user_id, placement_key를 받는다.
2. project_key로 projects.id를 찾는다.
3. latest_user_primary_segments에서 user_id의 최신 primary segment를 찾는다.
4. segment가 없으면 default segment로 fallback한다.
5. active_ad_serving_rules에서 segment_id + placement_key에 맞는 광고 후보를 조회한다.
6. 후보가 여러 개면 traffic_weight 기준으로 하나를 선택한다.
7. 선택한 광고 컨텐츠와 tracking payload를 프론트/SDK에 내려준다.
```

## 광고 서버가 프론트/SDK에 내려줘야 하는 tracking payload

```
{
  "project_id":"demo-shop",
  "experiment_id":"42",
  "variant_id":"11",
  "creative_id":"101",
  "mapping_id":"501",
  "action_id":"7"
}
```

각 값의 의미:

```
project_id    = projects.project_key
experiment_id = experiments.id
variant_id    = experiment_variants.id
creative_id   = generated_contents.id
mapping_id    = segment_ad_mappings.id
action_id     = recommendation_actions.id
```

광고 서버가 특히 조심해야 하는 것:

```
active_ad_serving_rules.variant_key를 ClickHouse events.variant_id로 넣으면 안 된다.
events.variant_id에는 active_ad_serving_rules.experiment_variant_id를 문자열로 넣어야 한다.
```

## default 광고 fallback일 때

default 광고는 실험이 없을 수 있어. 그 경우에는 실험 관련 필드는 빈 문자열로 내려도 돼.

```
{
  "project_id":"demo-shop",
  "experiment_id":"",
  "variant_id":"",
  "creative_id":"100",
  "mapping_id":"1",
  "action_id":""
}
```

---

# 2. SDK / Event Collector 팀이 알아야 할 것

SDK는 광고 서버가 내려준 tracking payload를 이벤트에 그대로 붙여서 보내야 해.

## 광고 노출 이벤트

```
{
  "project_id":"demo-shop",
  "event_id":"evt-001",
  "user_id":"user-123",
  "session_id":"sess-123",
  "event_time":"2021-01-04T12:00:00Z",
  "event_name":"ad_impression",

  "experiment_id":"42",
  "variant_id":"11",
  "creative_id":"101",
  "mapping_id":"501",
  "action_id":"7"
}
```

## 광고 클릭 이벤트

```
{
  "project_id":"demo-shop",
  "event_id":"evt-002",
  "user_id":"user-123",
  "session_id":"sess-123",
  "event_time":"2021-01-04T12:01:00Z",
  "event_name":"ad_click",

  "experiment_id":"42",
  "variant_id":"11",
  "creative_id":"101",
  "mapping_id":"501",
  "action_id":"7"
}
```

## 구매 이벤트

구매가 어떤 광고/실험의 결과인지 보려면 purchase에도 같은 tracking 값이 붙어야 해.

```
{
  "project_id":"demo-shop",
  "event_id":"evt-003",
  "user_id":"user-123",
  "session_id":"sess-123",
  "event_time":"2021-01-04T12:10:00Z",
  "event_name":"purchase",

  "order_id":"order-001",
  "revenue":39000,

  "experiment_id":"42",
  "variant_id":"11",
  "creative_id":"101",
  "mapping_id":"501",
  "action_id":"7"
}
```

구매에 tracking 값이 없으면 AI Decision은 그 구매를 특정 실험 variant 성과로 집계하지 못해.

## SDK/Event Collector 주의사항

```
- event_name은 합의된 이름을 그대로 사용한다.
  page_view, product_view, add_to_cart, checkout_start, purchase, ad_impression, ad_click

- 값이 없으면 null보다 빈 문자열 ""을 보내는 편이 안전하다.

- ClickHouse events.project_id는 project_key 문자열이다.
  예: "demo-shop"

- PostgreSQL의 project_id 정수 1을 ClickHouse events.project_id로 보내면 안 된다.

- events.variant_id에는 "control", "treatment_a"를 넣지 않는다.
  반드시 experiment_variants.id 문자열을 넣는다.

- events.creative_id에는 generated_contents.id 문자열을 넣는다.

- events.mapping_id에는 segment_ad_mappings.id 문자열을 넣는다.
```

---

# 3. ClickHouse / 데이터 파이프라인 팀이 알아야 할 것

현재 ClickHouse schema는 그대로 써도 돼. 필요한 컬럼은 이미 있어.

```
experiment_id StringDEFAULT''
variant_id    StringDEFAULT''
action_id     StringDEFAULT''
mapping_id    StringDEFAULT''
ad_id         StringDEFAULT''
creative_id   StringDEFAULT''
```

다만 값 규약을 반드시 지켜야 해.

```
project_id    = project_key
experiment_id = experiments.id 문자열
variant_id    = experiment_variants.id 문자열
creative_id   = generated_contents.id 문자열
mapping_id    = segment_ad_mappings.id 문자열
action_id     = recommendation_actions.id 문자열
```

## ClickHouse schema에서 추가로 권장하는 점

현재 `events` 테이블은 default가 많지만, `events_raw_kafka`에는 default가 별로 없어서 producer가 모든 컬럼을 안 보내면 문제가 생길 수 있어.

둘 중 하나로 정해야 해.

```
A. SDK/Event Collector가 모든 컬럼을 항상 채워서 보낸다.
B. events_raw_kafka에도 DEFAULT 값을 붙인다.
```

MVP에서는 A로 가도 되지만, 안정적으로는 B가 좋아.

예:

```
experiment_id StringDEFAULT'',
variant_id StringDEFAULT'',
action_id StringDEFAULT'',
mapping_id StringDEFAULT'',
ad_id StringDEFAULT'',
creative_id StringDEFAULT'',
properties_json StringDEFAULT'{}'
```

---

# 4. 대시보드 팀이 알아야 할 것

대시보드는 AI Decision API를 실시간 호출하지 않고 PostgreSQL을 읽으면 돼.

## 대시보드가 읽을 주요 테이블/뷰

```
decision_runs
segment_daily_metrics
segment_anomalies
root_cause_candidates
recommendation_results
recommendation_actions
generated_contents
experiments
experiment_variants
latest_user_primary_segments
active_ad_serving_rules
```

## 화면별 조회 대상

```
1. 분석/퍼널 화면
- segment_daily_metrics
- user_count, session_count
- product_view_count, add_to_cart_count, checkout_start_count, purchase_count
- view_to_cart_rate, cart_to_checkout_rate, checkout_to_purchase_rate, view_to_purchase_rate

2. 이상 징후 화면
- segment_anomalies
- severity, impact_score, actual_value, expected_value, target_value

3. 원인 후보 화면
- root_cause_candidates
- cause_type, cause_key, title, confidence_score, impact_score, rank_no

4. 추천 액션 화면
- recommendation_results
- recommendation_actions
- action_key, title, description, status

5. 생성 컨텐츠 화면
- generated_contents
- variant_key, title, body, cta_label, image_url, generation_status

6. 실험 현황 화면
- experiments
- experiment_variants
- traffic_weight, impression_count, click_count, conversion_count, ctr, conversion_rate, status

7. 현재 serving 상태
- active_ad_serving_rules
```

## 대시보드에서 variant 표시 규칙

대시보드 화면에서는 `variant_key`를 보여주면 돼.

```
variant_key = "control" / "treatment_a"
```

하지만 이벤트 추적 ID를 보여주거나 광고 서버 계약을 설명할 때는 `experiment_variant_id`가 `variant_id`라는 걸 구분해야 해.

```
화면 표시용:
variant_key

ClickHouse 추적용:
variant_id = experiment_variant_id
```

---

# 5. 컨텐츠 생성 팀이 알아야 할 것

컨텐츠 생성 파트는 추천 액션을 읽어서 `generated_contents`를 만드는 역할이야.

## 컨텐츠 생성 파트의 책임

```
1. recommendation_actions.status = 'recommended' 인 action을 읽는다.
2. anomaly가 있는 non-default segment action만 대상으로 한다.
3. 각 action마다 generated_contents를 2개 만든다.
   - variant_key = "control"
   - variant_key = "treatment_a"
4. 생성 성공 시 recommendation_actions.status = 'content_generated' 로 바꾼다.
5. 생성 실패 시 recommendation_actions.status = 'failed' 로 바꾸고 metadata에 error를 남긴다.
```

## 컨텐츠 생성 파트가 하면 안 되는 것

```
- experiments 생성 금지
- experiment_variants 생성 금지
- segment_ad_mappings 생성 금지
- default generated content 덮어쓰기 금지
- AI Decision serving API 추가 금지
```

## 컨텐츠 생성 파트의 project_id 규칙

컨텐츠 생성 파트는 PostgreSQL에 저장하는 쪽이니까:

```
project_id = projects.id 정수
```

즉, `generated_contents.project_id`에는 `"demo-shop"`이 아니라 `1` 같은 정수가 들어가야 해.

---

# 6. 추천 + 실험 파트가 보장하는 것

이건 우리가 AI Decision 쪽에서 보장하는 계약이고, 다른 팀이 알아두면 좋아.

```
- anomaly가 없으면 recommendation/action을 만들지 않는다.
- recommendation/action은 anomaly가 있는 segment에 대해서만 만든다.
- segments는 analysis 파트가 source of truth다.
- 추천/실험 파트는 segments를 insert/update/delete하지 않는다.
- content_generated 상태가 된 action만 experiment sync 대상이다.
- generated_contents의 control/treatment_a가 모두 있어야 experiment가 running이 된다.
- experiment running 시 segment_ad_mappings가 만들어지고 active_ad_serving_rules에 노출된다.
- running experiment는 ClickHouse events를 집계해서 winner를 판단한다.
- treatment가 이기면 action = won
- control이 이기면 action = lost
```

---

# 7. Infra / 배포 / Cron 팀이 알아야 할 것

실행 순서는 이렇게 잡아야 해.

```
1. analysis
2. user segment matching
3. running experiment result update
4. recommendation/action 생성
5. content generation
6. experiment/variant/mapping sync
```

중요한 점:

```
content generation 전에 experiment sync를 먼저 돌리면 안 된다.
generated_contents가 없는 상태에서 실험을 만들면 draft 상태로 꼬일 수 있다.
```

따라서 daily job 또는 수동 실행 버튼이 있다면 전체 순서를 이렇게 맞춰야 해.

```
AI Decision analysis/recommendation
→ Content Generation
→ Experiment Sync
```

---

# 8. 팀 전체에 공유할 최종 요약

```
AI Decision은 실시간 serving 서버가 아닙니다.
AI Decision은 daily job으로 PostgreSQL에 분석/추천/실험 결과를 저장합니다.

광고 서버와 대시보드는 AI Decision을 직접 호출하지 않고 PostgreSQL을 읽습니다.

PostgreSQL project_id는 projects.id 정수입니다.
ClickHouse events.project_id는 projects.project_key 문자열입니다.

광고 서버는 active_ad_serving_rules를 읽어 광고를 선택하고,
SDK가 이벤트에 붙일 tracking payload를 내려줘야 합니다.

tracking payload:
- project_id = projects.project_key
- experiment_id = experiments.id 문자열
- variant_id = experiment_variants.id 문자열
- creative_id = generated_contents.id 문자열
- mapping_id = segment_ad_mappings.id 문자열
- action_id = recommendation_actions.id 문자열

주의:
- variant_id에 "control", "treatment_a"를 넣지 않습니다.
- "control", "treatment_a"는 PostgreSQL의 variant_key입니다.
- purchase 이벤트에도 tracking payload가 붙어야 실험 성과로 집계됩니다.

컨텐츠 생성 파트는 generated_contents만 만듭니다.
실험/매핑 생성은 추천+실험 파트가 content_generated 이후에 처리합니다.

대시보드는 PostgreSQL의 metrics/anomaly/root cause/recommendation/content/experiment 테이블을 읽어 화면을 구성합니다.
```

이 정도 공유하면 광고 서버, SDK, 대시보드, 데이터 파이프라인, 컨텐츠 생성 팀이 헷갈릴 만한 지점은 거의 정리돼.