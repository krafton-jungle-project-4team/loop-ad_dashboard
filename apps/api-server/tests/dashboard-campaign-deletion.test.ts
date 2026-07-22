import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

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
    "ListDashboardCampaignPromotions"
  );

  assert.match(deleteCampaignSql, /UPDATE campaigns\s+SET status = 'stopped'/);
  assert.match(deleteCampaignSql, /UPDATE promotions\s+SET status = 'stopped'/);
  assert.match(deleteCampaignSql, /UPDATE promotion_target_segments\s+SET status = 'stopped'/);
  assert.match(deleteCampaignSql, /UPDATE generation_runs\s+SET status = 'failed'/);
  assert.match(deleteCampaignSql, /last_error_code = 'generation_invalidated_by_campaign_stop'/);
  assert.match(deleteCampaignSql, /UPDATE ad_dispatch_jobs\s+SET status = 'cancelled'/);
  assert.match(deleteCampaignSql, /UPDATE promotion_runs\s+SET status = 'stopped'/);
  assert.match(deleteCampaignSql, /UPDATE ad_experiments\s+SET status = 'stopped'/);
  assert.doesNotMatch(deleteCampaignSql, /DELETE FROM/);
  assert.match(deleteCampaignSql, /'deleted'::text AS status/);
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
