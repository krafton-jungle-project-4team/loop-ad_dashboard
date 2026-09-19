import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { resolve } from "node:path";
import type {
  DashboardBuildPromotionRunAssignmentsResult,
  DashboardCreatePromotionRunRequest,
  DashboardCreatePromotionRunResult
} from "@loopad/shared";
import { AppError } from "../../apps/api-server/src/app-errors.js";
import { launchPromotionExperiment } from "../../apps/web-client/src/features/dashboard/ui/pages/campaign/promotion/promotionExperimentFlow.js";
import { promotionRunLaunchTarget } from "../../apps/web-client/src/features/dashboard/ui/pages/campaign/promotion/promotionRunLaunchTarget.js";

type Sample = {
  case_id: string;
  request_id: string;
  body_file: string;
  body_sha256: string;
  method: string;
  path: string;
  request: DashboardCreatePromotionRunRequest;
  status: number;
  content_type: string;
};
type Call = { operation: "build" | "start" | "dispatch"; id: string };
const [inputPath, outputPath, baselinePath] = process.argv.slice(2);
assert.ok(inputPath && outputPath && baselinePath, "verified input, output and baseline required");
const input = JSON.parse(readFileSync(inputPath, "utf8"));
const output = resolve(outputPath);
mkdirSync(resolve(output, "derived"), { recursive: true });
const manifest = JSON.parse(readFileSync(resolve(input.bundle_directory, "manifest.json"), "utf8"));
const expected = JSON.parse(readFileSync(baselinePath, "utf8"));
const caseManifest: Record<string, string[]> = JSON.parse(
  readFileSync(new URL("./cases.json", import.meta.url), "utf8")
);
const sha256 = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
const writeJson = (name: string, value: unknown) =>
  writeFileSync(resolve(output, name), JSON.stringify(value, null, 2) + "\n");
const sample = (stem: string): Sample => {
  const matches = (manifest.samples as Sample[]).filter(
    (entry) => `${entry.case_id}-${entry.request_id}` === stem
  );
  assert.equal(matches.length, 1, `sample missing or ambiguous: ${stem}`);
  return matches[0]!;
};
let active: { metadata: Sample; bytes: Buffer } | undefined;
let requests: unknown[] = [];
let replayError: string | undefined;
const server = createServer(async (request, response) => {
  try {
    assert.ok(active);
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    requests.push({
      method: request.method,
      path: request.url,
      body: JSON.parse(Buffer.concat(chunks).toString())
    });
    assert.equal(request.headers["x-loop-ad-internal-key"], "synthetic-replay-only");
    assert.equal(request.url, active.metadata.path);
    assert.equal(request.method, active.metadata.method);
    response.writeHead(active.metadata.status, { "Content-Type": active.metadata.content_type });
    response.end(active.bytes);
  } catch (error) {
    replayError = String(error);
    response.writeHead(500).end();
  }
});
const results: Array<{
  id: string;
  outcome: "passed" | "failed";
  evidence_file: string;
  evidence_sha256: string;
}> = [];
let cleanup = false;
try {
  await new Promise<void>((ready, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", ready);
  });
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  // No application bootstrap, credential files, database or downstream service clients.
  Object.assign(process.env, {
    LOOPAD_ENV: "rcg-synthetic",
    LOOPAD_SERVICE_ID: "dashboard-api",
    PORT: "3000",
    LOOPAD_AURORA_HOST: "127.0.0.1",
    LOOPAD_AURORA_PORT: "1",
    LOOPAD_AURORA_DATABASE: "unused",
    LOOPAD_AURORA_USERNAME: "unused",
    LOOPAD_AURORA_PASSWORD: "synthetic-unused",
    LOOPAD_CLICKHOUSE_URL: "http://127.0.0.1:1",
    LOOPAD_CLICKHOUSE_DATABASE: "unused",
    LOOPAD_CLICKHOUSE_USERNAME: "unused",
    LOOPAD_CLICKHOUSE_PASSWORD: "synthetic-unused",
    LOOPAD_DECISION_API_BASE_URL: `http://127.0.0.1:${address.port}`,
    LOOPAD_INTERNAL_API_KEY: "synthetic-replay-only",
    LOOPAD_OPENAI_API_KEY: "synthetic-unused",
    LOOPAD_DEMO_DISPATCH_RECIPIENTS: "[]"
  });
  const { DashboardDecisionClient } =
    await import("../../apps/api-server/src/features/dashboard/provider/dashboard-decision-client.js");
  const client = new DashboardDecisionClient();
  for (const [logicalId, scenarios] of Object.entries(caseManifest)) {
    for (const scenario of scenarios) {
      const id = `${logicalId}/${scenario}`;
      const source = sample(
        logicalId === "RCC-02" || logicalId === "RCC-05"
          ? scenario
          : logicalId === "RCC-03"
            ? "RCG-08-reuse"
            : "RCG-01-create"
      );
      const original = readFileSync(resolve(input.bundle_directory, source.body_file));
      assert.equal(sha256(original), source.body_sha256);
      const body = JSON.parse(original.toString()) as DashboardCreatePromotionRunResult;
      const request = structuredClone(source.request);
      const mutations: string[] = [];
      const expectedCalls: Call[] = [];
      const calls: Call[] = [];
      let shouldReject: "client" | "launch" | undefined;
      let errorPattern: RegExp | undefined;
      let batchFallback = false;
      let fallbackCount = 0;
      let scheduled = false;
      let failedStart: string | undefined;
      let dispatchFailure = false;
      let buildFailure = false;
      const edit = (description: string, change: () => void) => {
        mutations.push(description);
        change();
      };
      const channel = (value: string) =>
        edit(`ad_experiments[*].channel=${value}`, () =>
          body.ad_experiments.forEach((entry) => {
            entry.channel = value;
          })
        );
      const addFallback = () =>
        edit("append synthetic fallback experiment", () =>
          body.ad_experiments.push({
            ...body.ad_experiments[0]!,
            ad_experiment_id: `rcg_synthetic_fallback_${body.ad_experiments.length}`,
            segment_id: "seg_existing_all",
            is_fallback: true
          })
        );
      if (logicalId === "RCC-01" && scenario === "next-loop-request") {
        edit("request.next_loop_preparation_id=rcg_synthetic_preparation", () => {
          request.next_loop_preparation_id = "rcg_synthetic_preparation";
        });
      }
      if (logicalId === "RCC-04") {
        shouldReject = scenario === "malformed-dto" ? "client" : "launch";
        switch (scenario) {
          case "malformed-dto":
            edit("delete generation_id", () => {
              delete (body as Partial<DashboardCreatePromotionRunResult>).generation_id;
            });
            break;
          case "wrong-scope":
            edit("segment_ids[0]=rcg_unrequested", () => {
              body.segment_ids[0] = "rcg_unrequested";
            });
            break;
          case "duplicate-scope":
            edit("segment_ids[1]=segment_ids[0]", () => {
              body.segment_ids[1] = body.segment_ids[0]!;
            });
            break;
          case "missing-experiment":
            edit("remove ad_experiments[1]", () => {
              body.ad_experiments.pop();
            });
            break;
          case "duplicate-row":
            edit("append clone of ad_experiments[0]", () => {
              body.ad_experiments.push(structuredClone(body.ad_experiments[0]!));
            });
            break;
          case "duplicate-identity":
            edit(
              "ad_experiments[1].ad_experiment_id=ad_experiments[0].ad_experiment_id; distinct segment IDs preserved",
              () => {
                body.ad_experiments[1]!.ad_experiment_id = body.ad_experiments[0]!.ad_experiment_id;
              }
            );
            errorPattern = /광고 실험 ID가 중복되어 있어요/;
            break;
          case "invalid-fallback":
            edit("ad_experiments[0].is_fallback=true", () => {
              body.ad_experiments[0]!.is_fallback = true;
            });
            break;
          case "duplicate-fallback":
            addFallback();
            addFallback();
            break;
          default:
            throw new Error(`Unimplemented case: ${id}`);
        }
      }
      if (logicalId === "RCC-05") shouldReject = "client";
      if (logicalId === "RCC-06") {
        switch (scenario) {
          case "scheduled":
            scheduled = true;
            break;
          case "start-failure":
            channel("email");
            failedStart = body.ad_experiments[0]!.ad_experiment_id;
            break;
          case "dispatch-failure":
            channel("email");
            dispatchFailure = true;
            break;
          case "email":
            channel("email");
            break;
          case "sms":
            channel("sms");
            break;
          case "onsite":
            break;
          case "already-running":
            channel("email");
            edit("ad_experiments[*].status=running", () =>
              body.ad_experiments.forEach((entry) => {
                entry.status = "running";
              })
            );
            break;
          case "fallback-required":
            addFallback();
            batchFallback = true;
            fallbackCount = 1;
            break;
          case "fallback-count":
            addFallback();
            fallbackCount = 1;
            break;
          case "unused-fallback":
            addFallback();
            break;
          case "missing-required-fallback":
            batchFallback = true;
            shouldReject = "launch";
            errorPattern = /fallback 배정에 필요한 기본 광고 실험/;
            break;
          case "unstartable":
            edit("ad_experiments[0].status=goal_met", () => {
              body.ad_experiments[0]!.status = "goal_met";
            });
            shouldReject = "launch";
            errorPattern = /시작할 수 없는 상태/;
            break;
          case "build-failure":
            buildFailure = true;
            shouldReject = "launch";
            errorPattern = /synthetic build failure/;
            break;
          default:
            throw new Error(`Unimplemented case: ${id}`);
        }
      }
      // Only response mutations serialize a derived body; unchanged original bytes stay intact.
      const responseMutated = mutations.some((entry) => !entry.startsWith("request."));
      const bytes = responseMutated ? Buffer.from(JSON.stringify(body)) : original;
      const derivedFile = responseMutated ? `derived/${logicalId}-${scenario}.body` : null;
      if (derivedFile) writeFileSync(resolve(output, derivedFile), bytes);
      active = { metadata: source, bytes };
      requests = [];
      replayError = undefined;
      let phase = "client";
      let rejectedAt: string | null = null;
      let rejection: unknown;
      let target: ReturnType<typeof promotionRunLaunchTarget> | undefined;
      let parsedRun: DashboardCreatePromotionRunResult | undefined;
      let result: Awaited<ReturnType<typeof launchPromotionExperiment>> | undefined;
      try {
        result = await launchPromotionExperiment(
          { segmentIds: request.segment_ids },
          {
            createRun: async () => {
              parsedRun = await client.createPromotionRun({
                promotionId: "rcg_synthetic_promotion",
                request
              });
              phase = "transform";
              target = promotionRunLaunchTarget(parsedRun);
              phase = "launch";
              return target;
            },
            buildAssignments: async (runId) => {
              calls.push({ operation: "build", id: runId });
              if (buildFailure) throw new Error("synthetic build failure");
              return assignment(runId, batchFallback, fallbackCount, scheduled);
            },
            startExperiment: async (experimentId) => {
              calls.push({ operation: "start", id: experimentId });
              if (experimentId === failedStart) throw new Error("synthetic start failure");
            },
            dispatch: async (runId) => {
              calls.push({ operation: "dispatch", id: runId });
              if (dispatchFailure) throw new Error("synthetic dispatch failure");
            }
          }
        );
      } catch (error) {
        rejectedAt = phase;
        rejection = error;
      }
      let failure: string | null = null;
      try {
        assert.equal(replayError, undefined);
        assert.ok(source.status < 500, "unexpected producer 500: stop, never normalize");
        assert.deepEqual(requests, [{ method: "POST", path: source.path, body: request }]);
        if (shouldReject) {
          assert.equal(rejectedAt, shouldReject);
          assert.ok(rejection instanceof Error);
          if (errorPattern) assert.match(rejection.message, errorPattern);
        } else assert.equal(rejectedAt, null, String(rejection));
        if (logicalId === "RCC-04" || logicalId === "RCC-05") assert.deepEqual(calls, []);
        if (logicalId === "RCC-04" && scenario === "malformed-dto") {
          assert.ok(rejection instanceof AppError);
          assert.equal(rejection.code, "DASHBOARD_DECISION_REQUEST_FAILED");
        }
        if (logicalId === "RCC-05") {
          assert.ok(rejection instanceof AppError);
          assert.equal(rejection.statusCode, source.status);
          const detail = JSON.parse(original.toString()).detail;
          assert.deepEqual((rejection.cause as { detail: unknown }).detail, detail);
          assert.equal(
            rejection.code,
            typeof detail === "object" ? detail.code : "DASHBOARD_DECISION_REQUEST_FAILED"
          );
          assert.equal(target, undefined);
          assert.equal(result, undefined);
        } else if (parsedRun && target) {
          // Independent field assertions, not a replacement parser or launch implementation.
          assert.deepEqual(parsedRun, body);
          assert.equal(target.promotionRunId, body.promotion_run_id);
          assert.deepEqual(target.segmentIds, body.segment_ids);
          assert.equal(target.experiments.length, body.ad_experiments.length);
          for (const [index, experiment] of body.ad_experiments.entries()) {
            assert.deepEqual(target.experiments[index], {
              adExperimentId: experiment.ad_experiment_id,
              channel: experiment.channel,
              isFallback: experiment.is_fallback,
              segmentId: experiment.segment_id,
              status: experiment.status
            });
          }
        }
        if (logicalId === "RCC-03") {
          assert.deepEqual(request, expected.request);
          assert.deepEqual(body, expected.response);
          assert.equal(
            JSON.parse(readFileSync(resolve(input.bundle_directory, "RCG-08.json"), "utf8"))
              .baseline_rows_unchanged,
            true
          );
        }
        if (logicalId === "RCC-02" && scenario !== "RCG-12-A") {
          assert.equal(body.promotion_run_id, expected.response.promotion_run_id);
          assert.deepEqual(
            body.ad_experiments.map((entry) => entry.ad_experiment_id),
            expected.response.ad_experiments.map(
              (entry: { ad_experiment_id: string }) => entry.ad_experiment_id
            )
          );
          assert.deepEqual(body.segment_ids, expected.response.segment_ids);
        }
        if (logicalId !== "RCC-04" && logicalId !== "RCC-05") {
          expectedCalls.push({ operation: "build", id: body.promotion_run_id });
          const selected = body.ad_experiments.filter((entry) => !entry.is_fallback);
          const required = batchFallback || fallbackCount > 0 ? body.ad_experiments : selected;
          const startIds = required
            .filter((entry) => entry.status !== "running")
            .map((entry) => entry.ad_experiment_id);
          const dispatch =
            !scheduled &&
            !shouldReject &&
            !failedStart &&
            ["email", "sms"].includes(selected[0]!.channel);
          if (!scheduled && !shouldReject)
            for (const id of startIds) expectedCalls.push({ operation: "start", id });
          if (dispatch) expectedCalls.push({ operation: "dispatch", id: body.promotion_run_id });
          assert.deepEqual(calls, expectedCalls);
          if (!shouldReject)
            assert.deepEqual(result, {
              activationStatus: scheduled ? "scheduled" : "manual_start_required",
              dispatched: dispatch && !dispatchFailure,
              dispatchFailed: dispatch && dispatchFailure,
              failedExperimentIds: failedStart ? [failedStart] : [],
              promotionRunId: body.promotion_run_id,
              scheduledStartAt: scheduled ? "2026-10-01T00:00:00.000Z" : null,
              startedExperimentIds: scheduled ? [] : startIds.filter((id) => id !== failedStart)
            });
        }
      } catch (error) {
        failure = String(error);
      }
      const evidenceFile = `${logicalId}-${scenario}.json`;
      writeJson(evidenceFile, {
        id,
        lane: input.lane,
        source_sample: `${source.case_id}-${source.request_id}`,
        source_body_file: source.body_file,
        parent_body_sha256: source.body_sha256,
        derived: mutations.length > 0 || logicalId === "RCC-06",
        mutations,
        derived_body_file: derivedFile,
        replay_body_sha256: sha256(bytes),
        http_status: source.status,
        assignment_stub: {
          batchFallback,
          fallbackCount,
          scheduled,
          buildFailure,
          failedStart,
          dispatchFailure
        },
        requests,
        target,
        calls,
        result,
        rejected_at: rejectedAt,
        rejection:
          rejection instanceof Error
            ? {
                name: rejection.name,
                message: rejection.message,
                ...(rejection instanceof AppError
                  ? {
                      code: rejection.code,
                      statusCode: rejection.statusCode,
                      cause: rejection.cause
                    }
                  : {})
              }
            : null,
        outcome: failure ? "failed" : "passed",
        failure
      });
      results.push({
        id,
        outcome: failure ? "failed" : "passed",
        evidence_file: evidenceFile,
        evidence_sha256: sha256(readFileSync(resolve(output, evidenceFile)))
      });
    }
  }
} finally {
  server.closeAllConnections();
  await new Promise<void>((done, reject) =>
    server.close((error) => (error ? reject(error) : done()))
  );
  cleanup = !server.listening;
}
const failures = results.filter((entry) => entry.outcome === "failed");
writeJson("result.json", {
  schema_version: "rcc-consumer.v1",
  lane: input.lane,
  status: failures.length ? "FAIL" : "PASS",
  input,
  cleanup_ok: cleanup,
  cases: results
});
const escape = (value: string) =>
  value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
writeFileSync(
  resolve(output, "junit.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<testsuite name="RCC-${input.lane}" tests="${results.length}" failures="${failures.length}" errors="0" skipped="0">\n${results.map((entry) => `  <testcase name="${escape(entry.id)}">${entry.outcome === "failed" ? '<failure message="Actual consumer assertion failed; see case JSON"/>' : ""}</testcase>`).join("\n")}\n</testsuite>\n`
);
console.log(
  JSON.stringify({
    lane: input.lane,
    cases: results.length,
    failures: failures.length,
    cleanup_ok: cleanup
  })
);
process.exitCode = failures.length ? 1 : 0;

function assignment(
  runId: string,
  batch: boolean,
  count: number,
  scheduled: boolean
): DashboardBuildPromotionRunAssignmentsResult {
  return {
    promotion_run_id: runId,
    matching_mode: "synthetic",
    vector_version: "synthetic",
    ann_candidate_limit: 0,
    ann_candidate_count: 0,
    exact_reranked_pair_count: 0,
    assignment_count: 0,
    batch_has_fallback: batch,
    completion_scope: "current_request",
    fallback_count: count,
    below_threshold_fallback_count: 0,
    no_candidate_fallback_count: 0,
    invalid_user_vector_fallback_count: 0,
    ann_underfilled_user_count: 0,
    skipped_existing_count: 0,
    insufficient_segment_count: 0,
    status: "completed",
    activation_status: scheduled ? "scheduled" : "manual_start_required",
    scheduled_start_at: scheduled ? "2026-10-01T00:00:00.000Z" : null
  };
}
