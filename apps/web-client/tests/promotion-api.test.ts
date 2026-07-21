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

function dashboardErrorResponse(status: number, code: string, message: string) {
  return new Response(
    JSON.stringify({
      requestId: "request-html-edit",
      error: { code, message, statusCode: status }
    }),
    { status }
  );
}
