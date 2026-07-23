import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  deleteDashboardCampaign,
  listDashboardStoppedCampaignAudienceTargetsForRelease,
  releaseDashboardPromotionAllocationPlan,
  releaseDashboardPromotionTargetAudience
} from "../src/features/dashboard/database/__generated__/dashboard.queries.js";
import { DashboardCampaignReader } from "../src/features/dashboard/repository/dashboard-campaign-reader.js";

const dashboardSql = readFileSync(
  new URL("../src/features/dashboard/database/dashboard.sql", import.meta.url),
  "utf8"
);
const projectExperimentsSql = readFileSync(
  new URL("../src/features/dashboard/database/project-experiments.sql", import.meta.url),
  "utf8"
);

test("campaign deletion stops mutable data without deleting retained audience records", () => {
  const deleteCampaignSql = namedQuery(
    dashboardSql,
    "DeleteDashboardCampaign",
    "ListDashboardStoppedCampaignAudienceTargetsForRelease"
  );
  const releaseTargetsSql = namedQuery(
    dashboardSql,
    "ListDashboardStoppedCampaignAudienceTargetsForRelease",
    "ListDashboardCampaignPromotions"
  );

  assert.match(deleteCampaignSql, /UPDATE campaigns\s+SET status = 'stopped'/);
  assert.match(deleteCampaignSql, /UPDATE promotions\s+SET status = 'stopped'/);
  assert.match(deleteCampaignSql, /UPDATE promotion_target_segments\s+SET status = 'stopped'/);
  assert.match(deleteCampaignSql, /UPDATE generation_runs\s+SET status = 'failed'/);
  assert.match(deleteCampaignSql, /last_error_code = 'generation_invalidated_by_campaign_stop'/);
  assert.match(deleteCampaignSql, /UPDATE ad_dispatch_jobs\s+SET status = 'cancelled'/);
  assert.match(deleteCampaignSql, /UPDATE promotion_runs\s+SET status = 'stopped'/);
  assert.match(
    deleteCampaignSql,
    /promotion_runs[\s\S]*status IN \('planned', 'approved', 'running', 'evaluating'\)/
  );
  assert.doesNotMatch(
    deleteCampaignSql,
    /promotion_runs[\s\S]*status IN \([^)]*'goal_met'[^)]*\)/
  );
  assert.match(deleteCampaignSql, /UPDATE promotion_automation_jobs\s+SET status = 'cancelled'/);
  assert.match(
    deleteCampaignSql,
    /promotion_automation_jobs[\s\S]*FROM promotion_runs[\s\S]*campaign_id = :campaignId/
  );
  assert.match(deleteCampaignSql, /UPDATE ad_experiments\s+SET status = 'stopped'/);
  assert.doesNotMatch(deleteCampaignSql, /DELETE FROM/);
  assert.match(deleteCampaignSql, /'deleted'::text AS status/);
  assert.match(releaseTargetsSql, /status = 'stopped'/);
  assert.match(releaseTargetsSql, /audience_snapshot_id IS NOT NULL/);
  assert.match(releaseTargetsSql, /audience_reservation_state IN \('reserved', 'consumed'\)/);
  assert.match(releaseTargetsSql, /FOR UPDATE/);
});

test("campaign deletion releases every stopped snapshot audience after stopping the campaign", async () => {
  const calls: Array<{ name: string; params: Record<string, unknown> }> = [];
  const targets = [
    { promotionId: "promotion-1", segmentId: "segment-1" },
    { promotionId: "promotion-2", segmentId: "segment-2" }
  ];
  const reader = new DashboardCampaignReader({
    query: (query: unknown, params: Record<string, unknown>) => {
      if (query === deleteDashboardCampaign) {
        calls.push({ name: "deleteCampaign", params });
        return {
          single: async () => ({ campaignId: "campaign-1", status: "deleted" })
        };
      }
      if (query === listDashboardStoppedCampaignAudienceTargetsForRelease) {
        calls.push({ name: "listAudienceTargets", params });
        return { multiple: async () => targets };
      }
      if (query === releaseDashboardPromotionTargetAudience) {
        calls.push({ name: "releaseAudience", params });
        return {
          single: async () => ({ releasedTargetCount: 1, releasedUserCount: 1 })
        };
      }
      if (query === releaseDashboardPromotionAllocationPlan) {
        calls.push({ name: "releaseAllocationPlan", params });
        return { multiple: async () => [] };
      }
      throw new Error("Unexpected query");
    }
  } as never);

  const result = await reader.deleteCampaign("project-1", "campaign-1");

  assert.deepEqual(result, { campaign_id: "campaign-1", status: "deleted" });
  assert.deepEqual(calls, [
    {
      name: "deleteCampaign",
      params: { campaignId: "campaign-1", projectId: "project-1" }
    },
    {
      name: "listAudienceTargets",
      params: { campaignId: "campaign-1", projectId: "project-1" }
    },
    {
      name: "releaseAudience",
      params: {
        projectId: "project-1",
        promotionId: "promotion-1",
        segmentId: "segment-1"
      }
    },
    {
      name: "releaseAllocationPlan",
      params: {
        projectId: "project-1",
        promotionId: "promotion-1",
        segmentId: "segment-1"
      }
    },
    {
      name: "releaseAudience",
      params: {
        projectId: "project-1",
        promotionId: "promotion-2",
        segmentId: "segment-2"
      }
    },
    {
      name: "releaseAllocationPlan",
      params: {
        projectId: "project-1",
        promotionId: "promotion-2",
        segmentId: "segment-2"
      }
    }
  ]);
});

test("stopped campaigns are hidden from campaign and experiment lists", () => {
  const listCampaignsSql = namedQuery(
    dashboardSql,
    "ListDashboardCampaignSummaries",
    "GetDashboardCampaignSummary"
  );
  const getCampaignSql = namedQuery(
    dashboardSql,
    "GetDashboardCampaignSummary",
    "InsertDashboardCampaign"
  );
  const listExperimentsSql = namedQuery(
    projectExperimentsSql,
    "ListDashboardProjectExperiments",
    "ListDashboardRunningAdExperimentCounts"
  );

  assert.match(listCampaignsSql, /c\.status <> 'stopped'/);
  assert.match(getCampaignSql, /c\.status <> 'stopped'/);
  assert.match(listExperimentsSql, /c\.status <> 'stopped'/);
  assert.match(listExperimentsSql, /p\.status <> 'stopped'/);
});

test("stopped segments and experiments are excluded from dashboard counts and detail lists", () => {
  const summaryQueries = [
    namedQuery(
      dashboardSql,
      "ListDashboardCampaignSummaries",
      "GetDashboardCampaignSummary"
    ),
    namedQuery(
      dashboardSql,
      "GetDashboardCampaignSummary",
      "InsertDashboardCampaign"
    ),
    namedQuery(
      dashboardSql,
      "ListDashboardCampaignPromotions",
      "GetDashboardPromotionSummary"
    ),
    namedQuery(
      dashboardSql,
      "GetDashboardPromotionSummary",
      "InsertDashboardPromotion"
    )
  ];

  for (const query of summaryQueries) {
    assert.match(query, /pts\.status <> 'stopped'/);
    assert.match(query, /ae\.status <> 'stopped'/);
    assert.match(query, /pe\.ad_experiment_id = ae\.ad_experiment_id/);
  }

  const segmentQueries = [
    namedQuery(
      dashboardSql,
      "ListDashboardCampaignSegments",
      "ListDashboardPromotionSegments"
    ),
    namedQuery(
      dashboardSql,
      "ListDashboardPromotionSegments",
      "GetDashboardPromotionSegment"
    ),
    namedQuery(
      dashboardSql,
      "GetDashboardPromotionSegment",
      "ListDashboardPromotionSegmentSuggestions"
    )
  ];

  for (const query of segmentQueries) {
    assert.match(query, /pts\.status <> 'stopped'/);
    assert.match(query, /ae\.status <> 'stopped'/);
    assert.match(query, /pe\.ad_experiment_id = ae\.ad_experiment_id/);
  }

  const campaignExperimentsSql = namedQuery(
    dashboardSql,
    "ListDashboardCampaignAdExperiments",
    "ListDashboardSegmentAdExperiments"
  );
  const segmentExperimentsSql = namedQuery(
    dashboardSql,
    "ListDashboardSegmentAdExperiments",
    "StartDashboardAdExperiment"
  );

  assert.match(campaignExperimentsSql, /ae\.status <> 'stopped'/);
  assert.match(segmentExperimentsSql, /ae\.status <> 'stopped'/);

  const metricQueries = [
    namedQuery(
      dashboardSql,
      "ListDashboardCampaignExperimentMetrics",
      "ListDashboardPromotionExperimentMetrics"
    ),
    namedQuery(
      dashboardSql,
      "ListDashboardPromotionExperimentMetrics",
      "ListDashboardSegmentExperimentMetrics"
    ),
    namedQuery(
      dashboardSql,
      "ListDashboardSegmentExperimentMetrics",
      "GetDashboardCampaignDeliveryStatus"
    )
  ];
  const deliveryQueries = [
    namedQuery(
      dashboardSql,
      "GetDashboardCampaignDeliveryStatus",
      "GetDashboardPromotionDeliveryStatus"
    ),
    namedQuery(
      dashboardSql,
      "GetDashboardPromotionDeliveryStatus",
      "GetDashboardSegmentDeliveryStatus"
    ),
    namedQuery(
      dashboardSql,
      "GetDashboardSegmentDeliveryStatus",
      "ListDashboardPromotionSegmentDeliverySummaries"
    ),
    namedQuery(
      dashboardSql,
      "ListDashboardPromotionSegmentDeliverySummaries",
      "ListDashboardCampaignContentCandidates"
    )
  ];

  for (const query of [...metricQueries, ...deliveryQueries]) {
    assert.match(query, /ae\.status <> 'stopped'/);
  }

  const contentQueries = [
    namedQuery(
      dashboardSql,
      "ListDashboardCampaignContentCandidates",
      "ListDashboardSegmentContentCandidates"
    ),
    namedQuery(
      dashboardSql,
      "ListDashboardSegmentContentCandidates",
      "GetDashboardContentCandidate"
    ),
    namedQuery(
      dashboardSql,
      "GetDashboardContentCandidate",
      "GetDashboardPromotionGenerationResult"
    )
  ];

  for (const query of contentQueries) {
    assert.match(query, /status <> 'archived'/);
  }
});

function namedQuery(sql: string, name: string, nextName: string): string {
  const start = sql.indexOf(`/* @name ${name} */`);
  const end = sql.indexOf(`/* @name ${nextName} */`, start);

  assert.notEqual(start, -1, `${name} query is missing`);
  assert.notEqual(end, -1, `${nextName} query is missing`);
  return sql.slice(start, end);
}
