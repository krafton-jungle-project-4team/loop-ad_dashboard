import assert from "node:assert/strict";
import test from "node:test";
import {
  clearCampaignOnboardingScope,
  getCampaignOnboardingScopeStorageKey,
  parseCampaignOnboardingScope,
  readCampaignOnboardingScope,
  writeCampaignOnboardingScope
} from "../src/features/dashboard/model/campaign-onboarding-scope.js";
import type { ProjectSetupProgressStorage } from "../src/features/dashboard/model/project-setup-progress.js";

class MemoryStorage implements ProjectSetupProgressStorage {
  readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

test("campaign onboarding scope is project scoped and survives refresh", () => {
  const storage = new MemoryStorage();
  const scope = {
    campaignId: "campaign-1",
    completedAt: "2026-07-13T00:00:00.000Z",
    promotionId: "promotion-1",
    segmentId: "segment-1"
  };

  writeCampaignOnboardingScope(" project-1 ", scope, storage);

  assert.equal(
    getCampaignOnboardingScopeStorageKey(" project-1 "),
    "loopad.dashboard.campaign-onboarding.v1:project-1"
  );
  assert.deepEqual(readCampaignOnboardingScope("project-1", storage), scope);

  clearCampaignOnboardingScope("project-1", storage);
  assert.equal(readCampaignOnboardingScope("project-1", storage), null);
});

test("campaign onboarding scope rejects corrupt values", () => {
  assert.equal(parseCampaignOnboardingScope(null), null);
  assert.equal(parseCampaignOnboardingScope("not-json"), null);
  assert.equal(parseCampaignOnboardingScope(JSON.stringify([])), null);
  assert.equal(parseCampaignOnboardingScope(JSON.stringify({ campaignId: "campaign-1" })), null);
});
