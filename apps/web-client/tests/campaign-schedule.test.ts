import assert from "node:assert/strict";
import test from "node:test";
import {
  campaignScheduleStatus,
  groupCampaignsBySchedule,
  type CampaignScheduleCandidate
} from "../src/features/dashboard/ui/pages/campaign/workspace/campaignSchedule.js";

test("campaign schedule status uses inclusive start and end dates", () => {
  const today = "2026-07-16";

  assert.equal(
    campaignScheduleStatus({ start_date: "2026-07-17", end_date: "2026-07-20" }, today),
    "scheduled"
  );
  assert.equal(
    campaignScheduleStatus({ start_date: "2026-07-16", end_date: "2026-07-20" }, today),
    "in_progress"
  );
  assert.equal(
    campaignScheduleStatus({ start_date: "2026-07-10", end_date: "2026-07-16" }, today),
    "in_progress"
  );
  assert.equal(
    campaignScheduleStatus({ start_date: "2026-07-10", end_date: "2026-07-15" }, today),
    "completed"
  );
});

test("campaign groups are ordered by the relevant schedule date", () => {
  const campaigns: CampaignScheduleCandidate[] = [
    campaign("ongoing-later", "진행 나중", "2026-07-01", "2026-07-25"),
    campaign("completed-older", "완료 이전", "2026-06-01", "2026-06-30"),
    campaign("scheduled-later", "예정 나중", "2026-08-01", "2026-08-20"),
    campaign("ongoing-sooner", "진행 먼저", "2026-07-10", "2026-07-20"),
    campaign("completed-newer", "완료 최근", "2026-07-01", "2026-07-15"),
    campaign("scheduled-sooner", "예정 먼저", "2026-07-18", "2026-07-30")
  ];

  const groups = groupCampaignsBySchedule(campaigns, "2026-07-16");

  assert.deepEqual(
    groups.in_progress.map((item) => item.campaign_id),
    ["ongoing-sooner", "ongoing-later"]
  );
  assert.deepEqual(
    groups.scheduled.map((item) => item.campaign_id),
    ["scheduled-sooner", "scheduled-later"]
  );
  assert.deepEqual(
    groups.completed.map((item) => item.campaign_id),
    ["completed-newer", "completed-older"]
  );
  assert.deepEqual(
    campaigns.map((item) => item.campaign_id),
    [
      "ongoing-later",
      "completed-older",
      "scheduled-later",
      "ongoing-sooner",
      "completed-newer",
      "scheduled-sooner"
    ]
  );
});

function campaign(
  campaignId: string,
  campaignName: string,
  startDate: string,
  endDate: string
): CampaignScheduleCandidate {
  return {
    campaign_id: campaignId,
    campaign_name: campaignName,
    end_date: endDate,
    start_date: startDate
  };
}
