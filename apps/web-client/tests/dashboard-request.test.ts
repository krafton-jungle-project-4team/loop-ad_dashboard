import assert from "node:assert/strict";
import test from "node:test";
import { readDashboardApiErrorMessage } from "../src/features/dashboard/api/dashboard-request.js";

test("Decision이 고객군 후보를 반환하지 않으면 사용자 안내 문구를 제공한다", async () => {
  const response = new Response(
    JSON.stringify({
      requestId: "request-1",
      error: {
        statusCode: 422,
        code: "DASHBOARD_DECISION_REQUEST_FAILED",
        message:
          "Decision API request failed. no active segment candidates matched analysis request"
      }
    }),
    {
      headers: { "Content-Type": "application/json" },
      status: 422
    }
  );

  assert.equal(
    await readDashboardApiErrorMessage(response),
    "현재 프로모션 조건에 맞는 고객군 후보가 없어 결과를 만들지 못했어요. 조건을 조정한 뒤 다시 시도해 주세요."
  );
});

test("다른 Decision 오류는 서버 메시지를 유지한다", async () => {
  const response = new Response(
    JSON.stringify({
      requestId: "request-2",
      error: {
        statusCode: 422,
        code: "DASHBOARD_DECISION_REQUEST_FAILED",
        message: "Decision API request failed. another reason"
      }
    }),
    {
      headers: { "Content-Type": "application/json" },
      status: 422
    }
  );

  assert.equal(
    await readDashboardApiErrorMessage(response),
    "Decision API request failed. another reason"
  );
});
