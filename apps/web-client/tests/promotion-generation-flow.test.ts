import assert from "node:assert/strict";
import test from "node:test";
import { OFFER_SETS } from "@loopad/shared";
import {
  buildPromotionGenerationRequest,
  createPromotionGenerationAttemptTracker,
  offerSetGenerationChannelIsUnsupported
} from "../src/features/dashboard/ui/pages/campaign/promotion/promotionGenerationFlow.js";

test("last-call offer set is used only for the created segment's confirmed analysis", () => {
  assert.deepEqual(
    buildPromotionGenerationRequest({
      analysisId: "analysis-confirmed",
      confirmedCreatedSegmentAnalysisId: "analysis-confirmed",
      createdSegmentId: "segment-created",
      segmentId: "segment-created"
    }),
    {
      analysis_id: "analysis-confirmed",
      segment_id: "segment-created",
      content_option_count: 3,
      operator_instruction: null,
      offer_set_id: "summer-lastcall",
      expected_catalog_id: "black-friday-hotels-lastcall",
      expected_catalog_version: "v4"
    }
  );
  assert.equal(OFFER_SETS.lastcall.expected_catalog_version, "v4");
});

test("existing segments and stale analyses keep the existing generation contract", () => {
  const existingSegmentRequest = buildPromotionGenerationRequest({
    analysisId: "analysis-existing",
    confirmedCreatedSegmentAnalysisId: "analysis-confirmed",
    createdSegmentId: "segment-created",
    segmentId: "segment-existing"
  });
  const staleCreatedSegmentRequest = buildPromotionGenerationRequest({
    analysisId: "analysis-stale",
    confirmedCreatedSegmentAnalysisId: "analysis-confirmed",
    createdSegmentId: "segment-created",
    segmentId: "segment-created"
  });

  assert.equal(existingSegmentRequest.offer_set_id, undefined);
  assert.equal(existingSegmentRequest.expected_catalog_id, undefined);
  assert.equal(existingSegmentRequest.expected_catalog_version, undefined);
  assert.equal(staleCreatedSegmentRequest.offer_set_id, undefined);
});

test("email gating applies only to the last-call offer-set target", () => {
  assert.equal(offerSetGenerationChannelIsUnsupported(true, "onsite_banner"), true);
  assert.equal(offerSetGenerationChannelIsUnsupported(true, "email"), false);
  assert.equal(offerSetGenerationChannelIsUnsupported(false, "onsite_banner"), false);
});

test("generation retries preserve a key until the request changes or succeeds", () => {
  let keyCount = 0;
  const tracker = createPromotionGenerationAttemptTracker(() => `key-${++keyCount}`);
  const firstRequest = buildPromotionGenerationRequest({
    analysisId: "analysis-1",
    confirmedCreatedSegmentAnalysisId: null,
    createdSegmentId: null,
    segmentId: "segment-1"
  });
  const changedTargetRequest = buildPromotionGenerationRequest({
    analysisId: "analysis-2",
    confirmedCreatedSegmentAnalysisId: null,
    createdSegmentId: null,
    segmentId: "segment-2"
  });

  assert.equal(tracker.idempotencyKey("promotion-1", firstRequest), "key-1");
  assert.equal(tracker.idempotencyKey("promotion-1", firstRequest), "key-1");
  assert.equal(tracker.idempotencyKey("promotion-1", changedTargetRequest), "key-2");
  assert.equal(tracker.idempotencyKey("promotion-1", changedTargetRequest), "key-2");

  tracker.complete();
  assert.equal(tracker.idempotencyKey("promotion-1", changedTargetRequest), "key-3");
});

test("regeneration uses a distinct request signature and a fresh key after completion", () => {
  let keyCount = 0;
  const tracker = createPromotionGenerationAttemptTracker(() => `key-${++keyCount}`);
  const originalRequest = buildPromotionGenerationRequest({
    analysisId: "analysis-1",
    confirmedCreatedSegmentAnalysisId: null,
    createdSegmentId: null,
    segmentId: "segment-1"
  });
  const regenerationRequest = buildPromotionGenerationRequest({
    analysisId: "analysis-1",
    confirmedCreatedSegmentAnalysisId: null,
    createdSegmentId: null,
    regenerate: true,
    segmentId: "segment-1"
  });

  assert.equal(regenerationRequest.regenerate, true);
  assert.equal(tracker.idempotencyKey("promotion-1", originalRequest), "key-1");
  assert.equal(tracker.idempotencyKey("promotion-1", regenerationRequest), "key-2");
  assert.equal(tracker.idempotencyKey("promotion-1", regenerationRequest), "key-2");

  tracker.complete();
  assert.equal(tracker.idempotencyKey("promotion-1", regenerationRequest), "key-3");
});
