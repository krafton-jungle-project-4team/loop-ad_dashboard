# Dashboard 숙소 목록·URL 연동 규약

## 1. 목적

Dashboard의 프로모션 생성·수정 화면에서 기획자가 숙소 ID와 상세 URL을 직접 입력하지 않고, Decision이 제공하는 숙소 목록에서 선택하게 한다.

Decision이 다음 책임을 가진다.

- private S3 brand context와 현재 V2 숙소 catalog 조회
- S3 `hotel_id`를 API의 `offer_id`로 정규화
- 숙소 이미지 URL과 상세 페이지 URL 생성
- 생성 요청을 큐에 넣기 전 `offer_links`를 현재 catalog와 재검증

Dashboard는 S3 구조를 해석하거나 URL을 재조합하지 않고 Decision 응답을 그대로 사용한다.

> 이 규약은 `dashboard-email-multi-redirect-handoff.md`의 숙소 ID·URL 수기 입력 부분을 대체한다. 발송 시 redirect 생성과 SDK tracking 규약은 기존 문서를 함께 따른다.

## 2. 호출 흐름

```text
Dashboard Web
  -> Dashboard API
  -> Decision internal API
  -> private S3 current.json / manifest / catalog
  <- 정규화된 숙소 목록
  <- Dashboard Web 선택 UI
  -> promotions.metadata_json.offer_links 저장
  -> 기존 Generation API 호출
```

- 브라우저에 `X-Loop-Ad-Internal-Key`를 노출하지 않는다.
- Dashboard API 서버만 Decision internal API를 호출한다.
- Dashboard Web/API는 private S3를 직접 조회하지 않는다.

## 3. Decision internal API

### 3.1 요청

```http
GET /decision/v1/projects/{project_id}/promotion-offers
Accept: application/json
X-Loop-Ad-Internal-Key: {internal_api_key}
```

- body는 없다.
- `project_id`는 필수다.
- 현재 dev 데모 프로젝트는 `demo_project`다.

### 3.2 성공 응답

```json
{
  "project_id": "demo_project",
  "catalog_id": "black-friday-hotels",
  "catalog_version": "v2",
  "offers": [
    {
      "offer_id": "jeju-ocean-breeze-006",
      "hotel_name": "Jeju Ocean Breeze Resort",
      "destination_id": "jeju",
      "currency": "KRW",
      "sale_price_per_night": 278000,
      "original_price_per_night": 342000,
      "discount_rate_percent": 19,
      "image_url": "https://demo-shoppingmall.dev.loop-ad.org/stayloop/promotions/jeju-resort-exterior.png",
      "destination_url": "https://demo-shoppingmall.dev.loop-ad.org/hotel/jeju-ocean-breeze-006"
    }
  ]
}
```

### 3.3 응답 규칙

- `offers`는 `hotel_name` 오름차순이다.
- `offer_id`는 S3 catalog의 `hotel_id`와 같다.
- 중복 `offer_id`는 한 번만 반환한다.
- 생성에 필요한 필드나 이미지가 없는 숙소는 반환하지 않는다.
- Dashboard는 `image_url`과 `destination_url`을 그대로 사용한다.
- `destination_url`에 query, trailing slash 등을 임의로 추가하지 않는다.

### 3.4 현재 dev URL 생성 규칙

Decision이 다음 규칙으로 URL을 완성한다.

```text
image_url
= https://demo-shoppingmall.dev.loop-ad.org + manifest.frontend_path

destination_url
= https://demo-shoppingmall.dev.loop-ad.org/hotel/{offer_id}
```

이 규칙은 현재 `demo_project` dev 환경 기준이다. 다른 프로젝트나 운영 도메인이 필요하면 Dashboard에서 변경하지 말고 Decision URL 계약을 먼저 확장한다.

### 3.5 오류 응답

```json
{
  "requestId": "request-id",
  "error": {
    "statusCode": 404,
    "code": "promotion_offer_catalog_not_found",
    "message": "promotion offer catalog is not configured"
  }
}
```

| HTTP  | `code`                                | 조건                                      |
| ----- | ------------------------------------- | ----------------------------------------- |
| `400` | `project_id_invalid`                  | `project_id` 형식이 올바르지 않음         |
| `401` | `internal_api_key_invalid`            | 내부 API key가 없거나 올바르지 않음       |
| `404` | `promotion_offer_catalog_not_found`   | current brand context 또는 catalog가 없음 |
| `503` | `promotion_offer_catalog_unavailable` | S3/catalog를 읽을 수 없음                 |

- `requestId`는 응답의 `X-Request-Id` header와 같다.
- Dashboard API는 Decision 오류를 Dashboard의 기존 오류 envelope로 변환한다.
- `200` + `offers=[]`, `404` catalog 미설정, `503` 일시 장애를 UI에서 구분한다.

## 4. Dashboard public API

Web client에는 Dashboard API만 노출한다.

```http
GET /api/dashboard/v1/promotion-offers?project_id={project_id}
Accept: application/json
```

Dashboard API의 책임:

1. 사용자가 해당 `project_id`에 접근할 수 있는지 확인한다.
2. `project_id`를 검증한다.
3. Decision internal API에 `X-Loop-Ad-Internal-Key`를 넣어 호출한다.
4. 성공 응답은 필드를 재해석하지 않고 Web에 전달한다.
5. loading, empty, error 상태를 구분해 반환한다.

## 5. 프로모션 UI 및 저장 규약

### 5.1 UI

- 이메일 프로모션은 숙소를 최소 1개, 최대 8개 선택한다.
- 숙소명, 지역, 이미지, 판매가, 할인율을 표시한다.
- `offer_id`와 `destination_url`은 표시용 텍스트 입력으로 받지 않는다.
- 사용자는 API에서 받은 숙소만 선택할 수 있다.

### 5.2 저장 payload

선택한 항목의 `offer_id`와 `destination_url`만 저장한다.

```json
{
  "offer_links": [
    {
      "offer_id": "jeju-ocean-breeze-006",
      "destination_url": "https://demo-shoppingmall.dev.loop-ad.org/hotel/jeju-ocean-breeze-006"
    },
    {
      "offer_id": "okinawa-onna-coral-019",
      "destination_url": "https://demo-shoppingmall.dev.loop-ad.org/hotel/okinawa-onna-coral-019"
    }
  ]
}
```

저장 규칙:

- 기존 `promotions.metadata_json.offer_links`에 저장한다.
- DB table/column/migration을 추가하지 않는다.
- `metadata_json`의 기존 다른 key를 덮어쓰지 않고 merge한다.
- 선택 순서를 배열 순서로 유지한다.
- `offer_id`는 중복되면 안 된다.
- `destination_url`도 중복되면 안 된다.
- 목록 API의 `destination_url`을 변경 없이 저장한다.

> Decision은 현재 catalog에 없는 `offer_id`나 정규 URL과 다른 `destination_url`을 생성 큐 등록 전에 거절한다.

## 6. Generation API 연동

기존 Generation API request body는 변경하지 않는다.

```http
POST /decision/v1/promotions/{promotion_id}/generation
Idempotency-Key: {new_key}
Content-Type: application/json
```

Decision은 공유 DB의 `promotions.metadata_json.offer_links`를 직접 읽는다. Dashboard가 Generation request body에 `offer_links`를 중복 추가하지 않는다.

생성 요청 접수 시 Decision이 다음을 확인한다.

- `offer_id`가 현재 S3 catalog에 존재하는지
- `destination_url`이 `offer_id`의 정규 상세 URL과 정확히 같은지
- `offer_id`와 `destination_url`이 각각 중복되지 않는지
- 선택 개수가 8개를 넘지 않는지

검증에 실패하면 generation row와 worker job을 만들지 않고 `409`를 반환한다. 이미 `failed`된 generation ID를 재사용하지 말고, 입력을 수정한 뒤 새 `Idempotency-Key`로 요청한다.

> 과거 `offer_links`가 없던 이메일 프로모션은 하위 호환을 위해 Decision이 계속 허용한다. 신규 Dashboard UI에서는 반드시 1개 이상을 검증한다.

## 7. 생성 후 redirect 계약

현재 variant type은 다음과 같다.

| `variant_type` | 클릭 대상                          | placeholder                                       |
| -------------- | ---------------------------------- | ------------------------------------------------- |
| `editorial`    | 프로모션 전체 페이지               | `{{redirect_url}}`                                |
| `offer_cards`  | 프로모션 + 숙소 카드별 상세 페이지 | `{{redirect_url}}`, `{{offer_redirect_url_1..N}}` |
| `comparison`   | 프로모션 전체 페이지               | `{{redirect_url}}`                                |

`offer_cards`의 candidate `metadata_json.creative.link_targets` 예시:

```json
[
  {
    "placeholder": "{{redirect_url}}",
    "target_type": "promotion"
  },
  {
    "placeholder": "{{offer_redirect_url_1}}",
    "target_type": "offer",
    "offer_id": "jeju-ocean-breeze-006",
    "destination_url": "https://demo-shoppingmall.dev.loop-ad.org/hotel/jeju-ocean-breeze-006"
  }
]
```

발송 시 Dashboard는:

1. `target_type=promotion`이면 `promotions.landing_url`로 redirect row를 만든다.
2. `target_type=offer`이면 target의 `destination_url`로 redirect row를 만든다.
3. 각 placeholder를 해당 `/r/{redirectId}`로 치환한다.
4. redirect 조회는 `redirect_links.target_url` snapshot을 사용한다.
5. 치환 후 `{{offer_redirect_url_...}}`이 HTML에 남아 있으면 발송하지 않는다.
6. 원본 `destination_url`을 HTML에 직접 넣어 SDK tracking을 우회하지 않는다.

SDK 계약은 기존 `/r/{redirectId}` tracking 흐름을 그대로 사용하며, 새 SDK 패키지나 DB schema는 필요하지 않다.

## 8. Dashboard 구현 체크리스트

- [x] Dashboard API에 `GET /api/dashboard/v1/promotion-offers` 추가
- [x] Decision internal API client 추가
- [x] `X-Loop-Ad-Internal-Key`를 서버에서만 사용
- [x] 프로모션 생성·수정 화면에 숙소 선택 UI 추가
- [x] loading, empty, error UI 구분
- [x] 1~8개 선택 검증
- [x] API 응답의 `offer_id`, `destination_url`을 그대로 저장
- [x] `metadata_json` merge 시 기존 key 보존
- [x] 편집 화면에서 기존 `offer_links`를 목록 선택 상태로 복원
- [x] `link_targets` 기반 다중 redirect 생성
- [x] 발송 HTML의 모든 placeholder 치환 검증
- [x] API client, UI validation, DB mapper, redirect 통합 테스트 추가

## 9. Smoke test

1. Dashboard 프로모션 화면에서 `demo_project` 숙소 목록을 조회한다.
2. 현재 V2 숙소 8개가 이미지·가격·상세 URL과 함께 표시되는지 확인한다.
3. 1~8개를 선택하고 프로모션을 저장한다.
4. DB의 `promotions.metadata_json.offer_links`가 API 응답과 같은지 확인한다.
5. `content_option_count=3`과 새 `Idempotency-Key`로 Generation API를 호출한다.
6. generation이 `completed`로 전환되고 `editorial`, `offer_cards`, `comparison` 3개가 생성되는지 확인한다.
7. `offer_cards` HTML에 숙소별 placeholder와 `link_targets`가 1:1로 맞는지 확인한다.
8. 발송/preview 치환 후 숙소 버튼을 눌러 해당 상세 페이지로 이동하는지 확인한다.
9. `/r/{redirectId}` 경유와 기존 SDK 클릭 tracking이 유지되는지 확인한다.

## 10. 비적용 범위

다음 변경은 필요하지 않다.

- S3 V2 catalog 변경
- 신규 DB table/column/migration
- Infra/IAM 변경
- 신규 Decision 환경변수
- SDK 패키지 변경
