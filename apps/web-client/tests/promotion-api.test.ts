import assert from "node:assert/strict";
import test from "node:test";
import {
  promotionAnalysisPath,
  promotionSegmentRecommendationPath
} from "../src/features/dashboard/api/promotion-api-paths.js";
import { readDashboardApiErrorMessage } from "../src/features/dashboard/api/dashboard-request.js";

test("AI recommendation request uses the dedicated recommend endpoint", () => {
  assert.equal(
    promotionSegmentRecommendationPath("promotion/1"),
    "/dashboard/v1/promotions/promotion%2F1/segment-suggestions/recommend"
  );
});

test("confirmed segment analysis uses the dedicated analyses endpoint", () => {
  assert.equal(
    promotionAnalysisPath("promotion/1"),
    "/dashboard/v1/promotions/promotion%2F1/analyses"
  );
});

test("promotion offer catalog errors distinguish missing setup from a temporary outage", async () => {
  const missingCatalog = new Response(
    JSON.stringify({
      requestId: "request-1",
      error: {
        statusCode: 404,
        code: "promotion_offer_catalog_not_found",
        message: "promotion offer catalog is not configured"
      }
    }),
    { status: 404 }
  );
  const unavailableCatalog = new Response(
    JSON.stringify({
      requestId: "request-2",
      error: {
        statusCode: 503,
        code: "promotion_offer_catalog_unavailable",
        message: "promotion offer catalog is unavailable"
      }
    }),
    { status: 503 }
  );

  assert.equal(
    await readDashboardApiErrorMessage(missingCatalog),
    "프로모션에 사용할 숙소 목록이 아직 준비되지 않았어요."
  );
  assert.equal(
    await readDashboardApiErrorMessage(unavailableCatalog),
    "숙소 목록을 불러올 수 없어요. 잠시 후 다시 시도해 주세요."
  );
});

test("manual HTML errors explain validation and concurrent revision conflicts", async () => {
  const invalidHtml = dashboardErrorResponse(
    422,
    "DASHBOARD_CONTENT_CANDIDATE_HTML_REVISION_INVALID",
    "invalid HTML"
  );
  const revisionConflict = dashboardErrorResponse(
    409,
    "DASHBOARD_CONTENT_CANDIDATE_HTML_REVISION_CONFLICT",
    "stale revision"
  );

  assert.match(await readDashboardApiErrorMessage(invalidHtml), /HTML 안전성 검증/);
  assert.match(await readDashboardApiErrorMessage(revisionConflict), /새 버전이 먼저 저장/);
});

test("offer-set generation errors explain local request requirements", async () => {
  const unsupportedChannel = dashboardErrorResponse(
    400,
    "DASHBOARD_OFFER_SET_GENERATION_CHANNEL_UNSUPPORTED",
    "email only"
  );
  const missingIdempotencyKey = dashboardErrorResponse(
    400,
    "DASHBOARD_OFFER_SET_GENERATION_IDEMPOTENCY_KEY_REQUIRED",
    "missing key"
  );

  assert.match(await readDashboardApiErrorMessage(unsupportedChannel), /이메일 프로모션/);
  assert.match(await readDashboardApiErrorMessage(missingIdempotencyKey), /페이지를 새로고침/);
});

test("upstream offer-set conflicts and outages preserve their actionable messages", async () => {
  const conflict = dashboardErrorResponse(
    409,
    "offer_set_catalog_version_conflict",
    "요청한 V3 카탈로그가 활성 버전과 일치하지 않습니다."
  );
  const unavailable = dashboardErrorResponse(
    503,
    "offer_set_catalog_unavailable",
    "V3 카탈로그를 일시적으로 불러올 수 없습니다."
  );

  assert.equal(
    await readDashboardApiErrorMessage(conflict),
    "요청한 V3 카탈로그가 활성 버전과 일치하지 않습니다."
  );
  assert.equal(
    await readDashboardApiErrorMessage(unavailable),
    "V3 카탈로그를 일시적으로 불러올 수 없습니다."
  );
});

function dashboardErrorResponse(status: number, code: string, message: string) {
  return new Response(
    JSON.stringify({
      requestId: "request-html-edit",
      error: { code, message, statusCode: status }
    }),
    { status }
  );
}
