import assert from "node:assert/strict";
import { test } from "node:test";
import { AdsServeRequestSchema } from "@loopad/shared";
import { AppError } from "../src/app-errors.js";
import { AdsService } from "../src/features/ads/service/ads.service.js";
import { AdServingDomain } from "../src/features/ads/domain/index.js";
import type {
  AdServingCandidateSnapshot,
  AdServingProjectSnapshot,
  AdServingSegmentSnapshot
} from "../src/features/ads/domain/index.js";

const request = {
  projectId: "demo-shop",
  userId: "user-123",
  placementKey: "C1_MAIN_TOP",
  context: {
    pageUrl: "/",
    device: "desktop"
  }
};

test("validates missing required serve fields", () => {
  const result = AdsServeRequestSchema.safeParse({
    projectId: "demo-shop",
    placementKey: "C1_MAIN_TOP"
  });

  assert.equal(result.success, false);
});

test("throws a 404 when the project does not exist", async () => {
  const reader = new FakeAdsReader();
  reader.project = null;

  await assert.rejects(
    () => createService(reader).serve(request),
    (error) =>
      error instanceof AppError &&
      error.statusCode === 404 &&
      error.code === "ADS_PROJECT_NOT_FOUND"
  );
});

test("falls back to the default segment when the user has no primary segment", async () => {
  const reader = new FakeAdsReader();
  reader.primarySegment = null;
  reader.defaultSegment = { segmentDbId: "default-segment" };
  reader.candidates = [candidate({ mappingId: "default-mapping" })];

  const response = await createService(reader).serve(request);

  assert.deepEqual(reader.candidateLookups, [
    {
      projectDbId: "project-1",
      segmentDbId: "default-segment",
      placementKey: "C1_MAIN_TOP"
    }
  ]);
  assert.equal(response.status, "filled");
  assert.equal(response.tracking?.mappingId, "default-mapping");
});

test("returns an empty no-fill response without treating it as an error", async () => {
  const reader = new FakeAdsReader();
  reader.candidates = [];

  const response = await createService(reader).serve(request);

  assert.deepEqual(response, {
    placementKey: "C1_MAIN_TOP",
    status: "empty",
    ad: null,
    tracking: null
  });
});

test("maps creative and tracking ids from the selected serving row", async () => {
  const reader = new FakeAdsReader();
  reader.candidates = [
    candidate({
      mappingId: "501",
      experimentId: "42",
      variantId: "11",
      creativeId: "101",
      actionId: "7"
    })
  ];

  const response = await createService(reader).serve(request);

  assert.equal(response.status, "filled");
  assert.deepEqual(response.tracking, {
    projectId: "demo-shop",
    experimentId: "42",
    variantId: "11",
    creativeId: "101",
    mappingId: "501",
    actionId: "7"
  });
  assert.deepEqual(response.ad, {
    creativeId: "101",
    contentType: "banner",
    title: "Summer sale",
    body: "Save today",
    ctaLabel: "Shop now",
    imageUrl: "https://cdn.loop-ad.org/banner.png",
    landingUrl: "https://demo-shop.loop-ad.org/sale"
  });
});

test("uses max priority first and then deterministic traffic weight selection", async () => {
  const reader = new FakeAdsReader();
  reader.candidates = [
    candidate({ mappingId: "lower-priority", priority: 1, trafficWeight: 1 }),
    candidate({ mappingId: "zero-weight", priority: 10, trafficWeight: 0 }),
    candidate({ mappingId: "weighted-fill", priority: 10, trafficWeight: 1 })
  ];

  const first = await createService(reader).serve(request);
  const second = await createService(reader).serve(request);

  assert.equal(first.status, "filled");
  assert.equal(first.tracking?.mappingId, "weighted-fill");
  assert.deepEqual(first, second);
});

test("falls back to deterministic uniform selection when every candidate weight is zero", () => {
  const candidates = [
    { id: "a", trafficWeight: 0 },
    { id: "b", trafficWeight: 0 },
    { id: "c", trafficWeight: 0 }
  ];

  const first = AdServingDomain.pickDeterministicWeightedCandidate(
    candidates,
    "demo-shop:user-123:C1_MAIN_TOP"
  );
  const second = AdServingDomain.pickDeterministicWeightedCandidate(
    candidates,
    "demo-shop:user-123:C1_MAIN_TOP"
  );

  assert.equal(first?.id, second?.id);
});

function createService(reader: FakeAdsReader) {
  return new AdsService(reader as ConstructorParameters<typeof AdsService>[0]);
}

function candidate(
  overrides: Partial<AdServingCandidateSnapshot> = {}
): AdServingCandidateSnapshot {
  return {
    mappingId: "mapping-1",
    priority: 100,
    trafficWeight: 1,
    experimentId: "",
    variantId: "",
    creativeId: "101",
    contentType: "banner",
    title: "Summer sale",
    body: "Save today",
    ctaLabel: "Shop now",
    imageUrl: "https://cdn.loop-ad.org/banner.png",
    landingUrl: "https://demo-shop.loop-ad.org/sale",
    actionId: "",
    ...overrides
  };
}

class FakeAdsReader {
  project: AdServingProjectSnapshot | null = { projectDbId: "project-1", projectId: "demo-shop" };
  primarySegment: AdServingSegmentSnapshot | null = { segmentDbId: "primary-segment" };
  defaultSegment: AdServingSegmentSnapshot | null = { segmentDbId: "default-segment" };
  candidates: AdServingCandidateSnapshot[] = [candidate()];
  candidateLookups: Array<{
    projectDbId: string;
    segmentDbId: string;
    placementKey: string;
  }> = [];

  async findProject(): Promise<AdServingProjectSnapshot | null> {
    return this.project;
  }

  async findLatestPrimarySegment(): Promise<AdServingSegmentSnapshot | null> {
    return this.primarySegment;
  }

  async findDefaultSegment(): Promise<AdServingSegmentSnapshot | null> {
    return this.defaultSegment;
  }

  async listServingCandidates(
    projectDbId: string,
    segmentDbId: string,
    placementKey: string
  ): Promise<AdServingCandidateSnapshot[]> {
    this.candidateLookups.push({ projectDbId, segmentDbId, placementKey });

    return this.candidates;
  }
}
