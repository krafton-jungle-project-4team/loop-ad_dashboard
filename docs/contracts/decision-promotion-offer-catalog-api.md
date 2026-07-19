# Decision 프로모션 숙소 목록 API 규약

## 목적

프로모션 생성 화면에서 사용자가 숙소 ID와 상세 URL을 직접 입력하지 않고, Decision이 제공하는 광고 생성 가능 숙소 중 최대 8개를 선택할 수 있게 한다.

숙소 카탈로그와 S3 구조를 해석하는 책임은 Decision에 둔다. Dashboard API와 웹 클라이언트는 S3를 직접 조회하지 않는다.

## 호출 흐름

1. 웹 클라이언트가 프로모션 생성·수정 창을 연다.
2. 웹 클라이언트가 Dashboard API에 숙소 목록을 요청한다.
3. Dashboard API가 Decision 내부 API를 호출한다.
4. Decision은 해당 프로젝트의 현재 브랜드 컨텍스트와 숙소 카탈로그를 읽는다.
5. Decision은 광고 생성에 바로 사용할 수 있는 숙소만 정규화해 반환한다.
6. 웹 클라이언트는 사용자가 선택한 숙소의 `offer_id`와 `destination_url`을 프로모션의 `offer_links`로 저장한다.

## Decision 내부 API

### 요청

```http
GET /decision/v1/projects/{project_id}/promotion-offers
Accept: application/json
X-Loop-Ad-Internal-Key: {internal_api_key}
```

- `project_id`: 필수. URL 인코딩된 프로젝트 ID.
- 요청 본문은 없다.

### 성공 응답

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
      "image_url": "https://demo-shoppingmall.dev.loop-ad.org/assets/hotels/jeju-ocean-breeze-006.jpg",
      "destination_url": "https://demo-shoppingmall.dev.loop-ad.org/hotel/jeju-ocean-breeze-006"
    }
  ]
}
```

### 필드 규칙

| 필드 | 형식 | 필수 | 규칙 |
| --- | --- | --- | --- |
| `project_id` | string | O | 요청한 프로젝트 ID와 같아야 한다. |
| `catalog_id` | string | O | 현재 선택된 숙소 카탈로그 ID다. |
| `catalog_version` | string | O | 현재 브랜드 컨텍스트 또는 카탈로그 버전이다. 응답 캐시와 장애 추적에 사용한다. |
| `offers` | array | O | 숙소 이름 기준 오름차순으로 반환한다. 빈 배열을 허용한다. |
| `offer_id` | string | O | 카탈로그의 `hotel_id`를 정규화한 값이다. 프로모션 `offer_links[].offer_id`에 그대로 저장한다. |
| `hotel_name` | string | O | UI에 표시할 숙소 이름이다. |
| `destination_id` | string | O | UI에 표시할 지역 식별자다. |
| `currency` | string | O | ISO 4217 통화 코드다. |
| `sale_price_per_night` | integer | O | 0 이상인 1박 판매 가격이다. |
| `original_price_per_night` | integer 또는 null | O | 0 이상인 원래 가격이다. 없으면 `null`이다. |
| `discount_rate_percent` | integer 또는 null | O | 0 이상인 할인율이다. 없으면 `null`이다. |
| `image_url` | HTTP(S) URL | O | 목록 썸네일과 광고 생성에 사용할 공개 이미지 URL이다. |
| `destination_url` | HTTP(S) URL | O | 광고 클릭 시 이동할 정규 숙소 상세 URL이다. 프로모션 `offer_links[].destination_url`에 그대로 저장한다. |

### 조회·필터링 규칙

- Decision은 `brand-context/{project_id}/current.json`이 가리키는 현재 카탈로그를 사용한다.
- Decision은 카탈로그와 이미지 에셋을 결합해 `image_url`을 만든다.
- `offer_id`, `hotel_name`, `image_url`, `destination_url` 중 하나라도 만들 수 없는 숙소는 `offers`에서 제외한다.
- 같은 `offer_id`를 중복해서 반환하지 않는다.
- Dashboard는 응답 값을 재해석하거나 S3 키를 조합하지 않는다.
- 프로모션 생성 이후 카탈로그가 바뀔 수 있으므로 Decision은 광고 생성 요청을 작업 큐에 넣기 전에 저장된 `offer_id`를 현재 스냅샷과 다시 검증한다.

### 오류 응답

오류는 기존 Decision 오류 봉투를 사용한다.

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

| HTTP | code | 조건 |
| --- | --- | --- |
| `400` | `project_id_invalid` | 프로젝트 ID 형식이 올바르지 않다. |
| `401` | 기존 내부 인증 오류 코드 | 내부 API 키가 없거나 올바르지 않다. |
| `404` | `promotion_offer_catalog_not_found` | 현재 브랜드 컨텍스트 또는 숙소 카탈로그가 없다. |
| `503` | `promotion_offer_catalog_unavailable` | S3 또는 카탈로그를 일시적으로 읽을 수 없다. |

## Dashboard 공개 API

웹 클라이언트에는 아래 API만 노출한다.

```http
GET /api/dashboard/v1/promotion-offers?project_id={project_id}
Accept: application/json
```

- Dashboard API는 `project_id`를 검증하고 Decision 내부 API에 전달한다.
- 성공 응답은 Decision 성공 응답과 같은 형식을 사용한다.
- Dashboard API는 S3를 직접 조회하지 않는다.
- Decision 오류는 기존 Dashboard 오류 봉투로 변환한다.

## 프로모션 저장 규약

사용자가 선택한 숙소는 기존 프로모션 생성·수정 요청에 그대로 포함한다. DB 스키마 변경은 없다.

```json
{
  "offer_links": [
    {
      "offer_id": "jeju-ocean-breeze-006",
      "destination_url": "https://demo-shoppingmall.dev.loop-ad.org/hotel/jeju-ocean-breeze-006"
    }
  ]
}
```

- 이메일 프로모션은 숙소를 1개 이상 선택해야 한다.
- 최대 8개까지 선택할 수 있다.
- `offer_id`와 `destination_url`은 각각 중복될 수 없다.
- 사용자가 `offer_id`나 `destination_url`을 직접 입력하는 UI는 제공하지 않는다.

## 완료 조건

- 프로모션 생성 창을 열면 프로젝트의 숙소 목록이 표시된다.
- 목록 로딩·빈 목록·조회 실패 상태가 구분되어 표시된다.
- 사용자는 숙소를 최대 8개 선택할 수 있다.
- 선택한 값만 `offer_links`로 저장된다.
- 목록에서 선택한 숙소로 이메일 광고 소재 생성이 `generation_invalid_input` 없이 시작된다.
