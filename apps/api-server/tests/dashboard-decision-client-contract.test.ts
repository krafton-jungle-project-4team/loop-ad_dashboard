import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { afterEach, test } from "node:test";
import { AppError } from "../src/app-errors.js";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("decision client preserves segment recommendation request contract", async () => {
  const { client, requests } = await createClientWithResponse({
    analysis_id: "analysis-1",
    promotion_id: "promotion/1",
    status: "completed"
  });

  const result = await client.recommendPromotionSegments({
    campaignId: "campaign-1",
    projectId: "project-1",
    promotionId: "promotion/1",
    request: { segment_instruction: "최근 제주 숙소를 반복 검색한 고객" }
  });

  assert.deepEqual(result, {
    analysis_id: "analysis-1",
    promotion_id: "promotion/1",
    status: "completed",
    target_segments: []
  });
  assertDecisionRequest(requests[0], {
    path: "/decision/v1/promotions/promotion%2F1/segment-suggestions/recommend",
    body: {
      project_id: "project-1",
      campaign_id: "campaign-1",
      promotion_id: "promotion/1",
      operator_instruction: null,
      segment_instruction: "최근 제주 숙소를 반복 검색한 고객"
    }
  });
});

test("decision client preserves explicit segment analysis request contract", async () => {
  const { client, requests } = await createClientWithResponse({
    analysis_id: "analysis-2",
    promotion_id: "promotion/1",
    status: "completed"
  });

  const result = await client.analyzePromotionSegments({
    campaignId: "campaign-1",
    projectId: "project-1",
    promotionId: "promotion/1",
    request: {
      segment_ids: ["segment-1"],
      operator_instruction: "실패 원인을 다시 분석"
    }
  });

  assert.equal(result.analysis_id, "analysis-2");
  assertDecisionRequest(requests[0], {
    path: "/decision/v1/promotions/promotion%2F1/analyses",
    body: {
      project_id: "project-1",
      campaign_id: "campaign-1",
      promotion_id: "promotion/1",
      segment_ids: ["segment-1"],
      operator_instruction: "실패 원인을 다시 분석"
    }
  });
});

test("decision client preserves promotion generation request contract", async () => {
  const { client, requests } = await createClientWithResponse({
    generation_id: "generation-1",
    promotion_id: "promotion-1",
    status: "completed",
    content_candidates: [{}, {}]
  });

  const result = await client.startPromotionGeneration({
    campaignId: "campaign-1",
    projectId: "project-1",
    promotionId: "promotion-1",
    request: {
      analysis_id: "analysis-1"
    }
  });

  assert.deepEqual(result, {
    generation_id: "generation-1",
    promotion_id: "promotion-1",
    status: "completed",
    content_candidate_count: 2
  });
  assertDecisionRequest(requests[0], {
    path: "/decision/v1/promotions/promotion-1/generation",
    hasIdempotencyKey: true,
    body: {
      project_id: "project-1",
      campaign_id: "campaign-1",
      promotion_id: "promotion-1",
      analysis_id: "analysis-1",
      content_option_count: 3,
      operator_instruction: null
    }
  });
});

test("decision client preserves promotion run request contract", async () => {
  const response = promotionRunResponse();
  const { client, requests } = await createClientWithResponse(response);

  const result = await client.createPromotionRun({
    promotionId: "promotion-1",
    request: {
      analysis_id: "analysis-1",
      generation_id: "generation-1",
      segment_ids: ["segment-1"],
      loop_count: 2
    }
  });

  assert.deepEqual(result, response);
  assertDecisionRequest(requests[0], {
    path: "/decision/v1/promotions/promotion-1/runs",
    body: {
      analysis_id: "analysis-1",
      generation_id: "generation-1",
      segment_ids: ["segment-1"],
      loop_count: 2
    }
  });
});

test("decision client preserves segment assignment request contract", async () => {
  const response = {
    promotion_run_id: "run-1",
    matching_mode: "hybrid",
    vector_version: "v1",
    ann_candidate_limit: 100,
    ann_candidate_count: 80,
    exact_reranked_pair_count: 60,
    assignment_count: 40,
    batch_has_fallback: false,
    completion_scope: "current_request",
    fallback_count: 0,
    below_threshold_fallback_count: 0,
    no_candidate_fallback_count: 0,
    invalid_user_vector_fallback_count: 0,
    ann_underfilled_user_count: 0,
    skipped_existing_count: 0,
    insufficient_segment_count: 0,
    status: "completed"
  };
  const { client, requests } = await createClientWithResponse(response);

  const result = await client.buildPromotionRunSegmentAssignments({
    projectId: "project-1",
    promotionRunId: "run/1"
  });

  assert.deepEqual(result, response);
  assertDecisionRequest(requests[0], {
    path: "/decision/v1/promotion-runs/run%2F1/segment-assignments/build",
    body: {}
  });
});

test("decision client preserves promotion run evaluation request contract", async () => {
  const response = {
    promotion_run_id: "run-1",
    promotion_id: "promotion-1",
    status: "completed",
    ad_experiment_results: [
      {
        ad_experiment_id: "experiment-1",
        segment_id: "segment-1",
        actual_value: "0.42",
        status: "passed"
      }
    ],
    next_loop_required: false,
    failed_segment_ids: [],
    failed_ad_experiment_ids: []
  };
  const { client, requests } = await createClientWithResponse(response);

  const result = await client.evaluatePromotionRun({ promotionRunId: "run-1" });

  assert.equal(result.ad_experiment_results[0]?.actual_value, 0.42);
  assertDecisionRequest(requests[0], {
    path: "/decision/v1/promotion-runs/run-1/evaluate",
    body: {}
  });
});

test("decision client preserves next loop request contract", async () => {
  const response = {
    previous_promotion_run_id: "run-1",
    next_promotion_run_id: "run-2",
    promotion_id: "promotion-1",
    loop_count: 2,
    segment_ids: ["segment-1"],
    next_analysis_id: "analysis-2",
    next_generation_id: "generation-2",
    next_ad_experiments: [
      {
        ad_experiment_id: "experiment-fallback-2",
        segment_id: "seg_existing_all",
        segment_name: "fallback",
        content_id: "content-fallback-2",
        content_option_id: "option-fallback-2",
        channel: "email",
        is_fallback: true,
        loop_count: 2,
        status: "planned"
      }
    ]
  };
  const { client, requests } = await createClientWithResponse(response);

  const result = await client.createNextLoop({
    promotionRunId: "run-1",
    request: {
      failed_segment_ids: ["segment-1"],
      failed_ad_experiment_ids: ["experiment-1"]
    }
  });

  assert.deepEqual(result, response);
  assertDecisionRequest(requests[0], {
    path: "/decision/v1/promotion-runs/run-1/next-loop",
    body: {
      failed_segment_ids: ["segment-1"],
      failed_ad_experiment_ids: ["experiment-1"],
      operator_instruction: null
    }
  });
});

test("decision client rejects promotion run responses missing fallback contract fields", async () => {
  const response = promotionRunResponse();
  const invalidResponse = {
    ...response,
    ad_experiments: response.ad_experiments.map((experiment) => ({
      ...experiment,
      is_fallback: undefined
    }))
  };
  const { client } = await createClientWithResponse(invalidResponse);

  await assert.rejects(
    () =>
      client.createPromotionRun({
        promotionId: "promotion-1",
        request: {
          analysis_id: "analysis-1",
          generation_id: "generation-1",
          segment_ids: ["segment-1"],
          loop_count: 1
        }
      }),
    (error) => error instanceof AppError && error.code === "DASHBOARD_DECISION_REQUEST_FAILED"
  );
});

test("decision client rejects promotion run responses missing segment scope", async () => {
  const invalidResponse: Partial<ReturnType<typeof promotionRunResponse>> = {
    ...promotionRunResponse()
  };
  delete invalidResponse.segment_ids;
  const { client } = await createClientWithResponse(invalidResponse);

  await assert.rejects(
    () =>
      client.createPromotionRun({
        promotionId: "promotion-1",
        request: {
          analysis_id: "analysis-1",
          generation_id: "generation-1",
          segment_ids: ["segment-1"],
          loop_count: 1
        }
      }),
    (error) => error instanceof AppError && error.code === "DASHBOARD_DECISION_REQUEST_FAILED"
  );
});

test("decision client accepts the exact Decision assignment fallback contract", async () => {
  const { client } = await createClientWithResponse({
    promotion_run_id: "run-1",
    matching_mode: "hybrid",
    vector_version: "v1",
    ann_candidate_limit: 100,
    ann_candidate_count: 80,
    exact_reranked_pair_count: 60,
    assignment_count: 40,
    batch_has_fallback: false,
    completion_scope: "current_request",
    fallback_count: 0,
    below_threshold_fallback_count: 0,
    no_candidate_fallback_count: 0,
    invalid_user_vector_fallback_count: 0,
    ann_underfilled_user_count: 0,
    skipped_existing_count: 0,
    insufficient_segment_count: 0,
    status: "completed"
  });

  const result = await client.buildPromotionRunSegmentAssignments({
    projectId: "project-1",
    promotionRunId: "run-1"
  });

  assert.equal(result.batch_has_fallback, false);
  assert.equal(result.fallback_count, 0);
});

test("decision client parses the versioned Decision promotion run fixture", async () => {
  const fixture = JSON.parse(
    readFileSync(
      new URL("../../../docs/contracts/decision-promotion-run-response.v1.json", import.meta.url),
      "utf8"
    )
  );
  const { client } = await createClientWithResponse(fixture);

  const result = await client.createPromotionRun({
    promotionId: "promotion-1",
    request: {
      analysis_id: "analysis-1",
      generation_id: "generation-1",
      segment_ids: ["segment-a"],
      loop_count: 2
    }
  });

  assert.deepEqual(result.segment_ids, ["segment-a", "segment-b"]);
  assert.equal(result.ad_experiments.at(-1)?.is_fallback, true);
});

test("decision client preserves provider error status and detail", async () => {
  setRequiredEnv();
  const { DashboardDecisionClient } =
    await import("../src/features/dashboard/provider/dashboard-decision-client.js");
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ detail: "promotion is locked" }), {
      status: 409,
      headers: { "Content-Type": "application/json" }
    });

  await assert.rejects(
    () =>
      new DashboardDecisionClient().evaluatePromotionRun({
        promotionRunId: "run-1"
      }),
    (error) =>
      error instanceof AppError &&
      error.statusCode === 409 &&
      error.code === "DASHBOARD_DECISION_REQUEST_FAILED" &&
      error.message === "Decision API request failed. promotion is locked"
  );
});

test("decision client preserves structured Segment Audience errors", async () => {
  setRequiredEnv();
  const { DashboardDecisionClient } =
    await import("../src/features/dashboard/provider/dashboard-decision-client.js");
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        detail: {
          code: "segment_audience_allocation_empty",
          reason: "selected audience is empty",
          segment_id: "segment-a"
        }
      }),
      { status: 409, headers: { "Content-Type": "application/json" } }
    );

  await assert.rejects(
    () => new DashboardDecisionClient().evaluatePromotionRun({ promotionRunId: "run-1" }),
    (error) =>
      error instanceof AppError &&
      error.statusCode === 409 &&
      error.code === "segment_audience_allocation_empty" &&
      error.message === "selected audience is empty (segment-a)"
  );
});

type CapturedRequest = {
  init?: RequestInit;
  url: string;
};

async function createClientWithResponse(body: unknown) {
  setRequiredEnv();
  const { DashboardDecisionClient } =
    await import("../src/features/dashboard/provider/dashboard-decision-client.js");
  const requests: CapturedRequest[] = [];
  globalThis.fetch = async (input, init) => {
    requests.push({
      init,
      url: input instanceof Request ? input.url : input.toString()
    });
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  };

  return {
    client: new DashboardDecisionClient(),
    requests
  };
}

function assertDecisionRequest(
  request: CapturedRequest | undefined,
  expected: { body: unknown; hasIdempotencyKey?: boolean; path: string }
) {
  assert.ok(request);
  const url = new URL(request.url);
  assert.equal(url.origin, "http://localhost:8081");
  assert.equal(url.pathname, expected.path);
  assert.equal(request.init?.method, "POST");
  const headers = request.init?.headers as Record<string, string>;
  const { "Idempotency-Key": idempotencyKey, ...baseHeaders } = headers;
  assert.deepEqual(baseHeaders, {
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-Loop-Ad-Internal-Key": "test-internal-key"
  });
  if (expected.hasIdempotencyKey) {
    assert.match(
      idempotencyKey ?? "",
      /^dashboard-generation:[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    );
  } else {
    assert.equal(idempotencyKey, undefined);
  }
  assert.deepEqual(JSON.parse(String(request.init?.body)), expected.body);
}

function promotionRunResponse() {
  return {
    promotion_run_id: "run-1",
    project_id: "project-1",
    campaign_id: "campaign-1",
    promotion_id: "promotion-1",
    analysis_id: "analysis-1",
    generation_id: "generation-1",
    loop_count: 2,
    status: "ready",
    goal_snapshot_json: { metric: "booking_conversion_rate" },
    segment_ids: ["segment-1"],
    ad_experiments: [
      {
        ad_experiment_id: "experiment-1",
        segment_id: "segment-1",
        segment_name: "repeat visitors",
        content_id: "content-1",
        content_option_id: "option-1",
        channel: "email",
        is_fallback: false,
        loop_count: 2,
        status: "planned"
      },
      {
        ad_experiment_id: "experiment-fallback",
        segment_id: "seg_existing_all",
        segment_name: "fallback",
        content_id: "content-fallback",
        content_option_id: "option-fallback",
        channel: "email",
        is_fallback: true,
        loop_count: 2,
        status: "planned"
      }
    ]
  };
}

function setRequiredEnv() {
  process.env.LOOPAD_ENV ??= "local";
  process.env.LOOPAD_SERVICE_ID ??= "dashboard-api";
  process.env.PORT ??= "8080";
  process.env.LOOPAD_AURORA_HOST ??= "localhost";
  process.env.LOOPAD_AURORA_PORT ??= "15432";
  process.env.LOOPAD_AURORA_DATABASE ??= "loopad";
  process.env.LOOPAD_AURORA_USERNAME ??= "loopad";
  process.env.LOOPAD_AURORA_PASSWORD ??= "loopad";
  process.env.LOOPAD_CLICKHOUSE_URL ??= "http://localhost:18123";
  process.env.LOOPAD_CLICKHOUSE_DATABASE ??= "loopad";
  process.env.LOOPAD_CLICKHOUSE_USERNAME ??= "loopad_app";
  process.env.LOOPAD_CLICKHOUSE_PASSWORD ??= "loopad_local_password";
  process.env.LOOPAD_DECISION_API_BASE_URL ??= "http://localhost:8081";
  process.env.LOOPAD_INTERNAL_API_KEY ??= "test-internal-key";
  process.env.LOOPAD_OPENAI_API_KEY ??= "test-openai-api-key";
  process.env.LOOPAD_DEMO_DISPATCH_RECIPIENTS ??= JSON.stringify([
    {
      userId: "user-1",
      email: "demo-recipient-1@loop-ad.org",
      phoneNumber: "+821012345001"
    }
  ]);
}
