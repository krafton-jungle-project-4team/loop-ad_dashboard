import assert from "node:assert/strict";
import test from "node:test";
import {
  DashboardCreateCampaignRequestSchema,
  DashboardUpdateCampaignRequestSchema,
  isCampaignDateRangeValid
} from "../../../packages/shared/src/dashboard/campaign.js";

test("campaign date ranges allow missing, equal, and increasing dates", () => {
  assert.equal(isCampaignDateRangeValid(undefined, undefined), true);
  assert.equal(isCampaignDateRangeValid("2026-07-12", null), true);
  assert.equal(isCampaignDateRangeValid("2026-07-12", "2026-07-12"), true);
  assert.equal(isCampaignDateRangeValid("2026-07-12", "2026-07-13"), true);
});

test("campaign date ranges reject an end date before the start date", () => {
  assert.equal(isCampaignDateRangeValid("2026-07-13", "2026-07-12"), false);

  const createResult = DashboardCreateCampaignRequestSchema.safeParse({
    campaign_name: "역전된 기간",
    end_date: "2026-07-12",
    start_date: "2026-07-13"
  });
  assert.equal(createResult.success, false);
  assert.deepEqual(createResult.error?.issues[0]?.path, ["end_date"]);

  const updateResult = DashboardUpdateCampaignRequestSchema.safeParse({
    end_date: "2026-07-12",
    start_date: "2026-07-13"
  });
  assert.equal(updateResult.success, false);
  assert.deepEqual(updateResult.error?.issues[0]?.path, ["end_date"]);
});
