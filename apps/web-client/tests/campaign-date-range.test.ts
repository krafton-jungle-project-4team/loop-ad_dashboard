import assert from "node:assert/strict";
import test from "node:test";
import {
  DashboardCreateCampaignRequestSchema,
  DashboardUpdateCampaignRequestSchema,
  campaignDateKey,
  campaignScheduleBoundaries,
  getDashboardCreateCampaignRequestSchema,
  isCampaignDateRangeValid,
  isCampaignScheduleExpired,
  isPromotionScheduleWithinCampaign
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

test("campaign creation requires dates and rejects a past start date", () => {
  const schema = getDashboardCreateCampaignRequestSchema("2026-07-16");

  assert.equal(schema.safeParse({ campaign_name: "날짜 없음" }).success, false);
  assert.equal(
    schema.safeParse({
      campaign_name: "과거 시작",
      end_date: "2026-07-20",
      start_date: "2026-07-15"
    }).success,
    false
  );
  assert.equal(
    schema.safeParse({
      campaign_name: "오늘 시작",
      end_date: "2026-07-20",
      start_date: "2026-07-16"
    }).success,
    true
  );
  assert.equal(
    schema.safeParse({
      campaign_name: "미래 시작",
      end_date: "2026-07-21",
      start_date: "2026-07-17"
    }).success,
    true
  );
});

test("campaign date keys use the dashboard time zone", () => {
  assert.equal(campaignDateKey(new Date("2026-07-15T15:30:00.000Z")), "2026-07-16");
});

test("campaign schedule boundaries use inclusive Korea dates", () => {
  const campaign = { end_date: "2026-07-20", start_date: "2026-07-20" };

  assert.deepEqual(campaignScheduleBoundaries(campaign), {
    endAt: "2026-07-20T15:00:00.000Z",
    startAt: "2026-07-19T15:00:00.000Z"
  });
  assert.equal(isCampaignScheduleExpired(campaign, new Date("2026-07-20T14:59:59.999Z")), false);
  assert.equal(isCampaignScheduleExpired(campaign, new Date("2026-07-20T15:00:00.000Z")), true);
});

test("promotion schedules must stay inside their campaign boundaries", () => {
  const campaign = { end_date: "2026-08-31", start_date: "2026-08-01" };

  assert.equal(
    isPromotionScheduleWithinCampaign(
      {
        scheduled_end_at: "2026-08-31T15:00:00.000Z",
        scheduled_start_at: "2026-07-31T15:00:00.000Z"
      },
      campaign
    ),
    true
  );
  assert.equal(
    isPromotionScheduleWithinCampaign(
      {
        scheduled_end_at: "2026-09-01T00:00:01.000+09:00",
        scheduled_start_at: "2026-08-01T00:00:00.000+09:00"
      },
      campaign
    ),
    false
  );
  assert.equal(
    isPromotionScheduleWithinCampaign(
      {
        scheduled_end_at: null,
        scheduled_start_at: "2026-09-01T00:00:00.000+09:00"
      },
      campaign
    ),
    false
  );
});
