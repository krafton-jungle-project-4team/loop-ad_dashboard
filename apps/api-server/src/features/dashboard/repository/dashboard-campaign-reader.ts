import type {
  DashboardCampaignDetail,
  DashboardCampaignExperimentMetric,
  DashboardCampaignPromotion,
  DashboardCampaignSegment,
  DashboardCampaignSummary,
  DashboardContentCandidate,
  DashboardPromotionDetail,
  DashboardPromotionSummary,
  DashboardSegmentDetail
} from "@loopad/shared";
import { InjectTransaction, type Transaction } from "@nestjs-cls/transactional";
import { Injectable } from "@nestjs/common";
import { PgTypedTransactionalAdapter } from "../../../infra/database/pgtyped-transactional.adapter.js";
import {
  getDashboardCampaignSummary,
  getDashboardPromotionSegment,
  getDashboardPromotionSummary,
  listDashboardCampaignSummaries,
  listDashboardCampaignExperimentMetrics,
  listDashboardCampaignPromotions,
  listDashboardCampaignSegments,
  listDashboardPromotionExperimentMetrics,
  listDashboardPromotionSegments,
  listDashboardSegmentContentCandidates,
  listDashboardSegmentExperimentMetrics,
  type IGetDashboardCampaignSummaryResult,
  type IGetDashboardPromotionSegmentResult,
  type IGetDashboardPromotionSummaryResult,
  type IListDashboardCampaignExperimentMetricsResult,
  type IListDashboardCampaignPromotionsResult,
  type IListDashboardCampaignSummariesResult,
  type IListDashboardCampaignSegmentsResult,
  type IListDashboardSegmentContentCandidatesResult,
  type IListDashboardSegmentExperimentMetricsResult,
  type IListDashboardPromotionExperimentMetricsResult,
  type IListDashboardPromotionSegmentsResult
} from "../database/__generated__/dashboard.queries.js";

@Injectable()
export class DashboardCampaignReader {
  constructor(
    @InjectTransaction()
    private readonly db: Transaction<PgTypedTransactionalAdapter>
  ) {}

  async listCampaigns(projectId: string): Promise<DashboardCampaignSummary[]> {
    const rows = await this.db.query(listDashboardCampaignSummaries, { projectId }).multiple();

    return rows.map(toCampaignSummary);
  }

  async getCampaignDetail(
    projectId: string,
    campaignId: string
  ): Promise<Omit<DashboardCampaignDetail, "realtime_metrics">> {
    const [campaign, promotions, segments, experimentMetrics] = await Promise.all([
      this.db.query(getDashboardCampaignSummary, { campaignId, projectId }).single(),
      this.db.query(listDashboardCampaignPromotions, { campaignId, projectId }).multiple(),
      this.db.query(listDashboardCampaignSegments, { campaignId, projectId }).multiple(),
      this.db
        .query(listDashboardCampaignExperimentMetrics, { campaignId, projectId })
        .multiple()
    ]);

    return {
      campaign: toCampaignSummary(campaign),
      promotions: promotions.map(toCampaignPromotion),
      segments: segments.map(toCampaignSegment),
      experiment_metrics: experimentMetrics.map(toCampaignExperimentMetric)
    };
  }

  async getPromotionDetail(
    projectId: string,
    promotionId: string
  ): Promise<Omit<DashboardPromotionDetail, "realtime_metrics">> {
    const [promotion, segments, experimentMetrics] = await Promise.all([
      this.db.query(getDashboardPromotionSummary, { projectId, promotionId }).single(),
      this.db.query(listDashboardPromotionSegments, { projectId, promotionId }).multiple(),
      this.db
        .query(listDashboardPromotionExperimentMetrics, { projectId, promotionId })
        .multiple()
    ]);

    return {
      promotion: toPromotionSummary(promotion),
      segments: segments.map(toCampaignSegment),
      experiment_metrics: experimentMetrics.map(toCampaignExperimentMetric)
    };
  }

  async getSegmentDetail(
    projectId: string,
    promotionId: string,
    segmentId: string
  ): Promise<Omit<DashboardSegmentDetail, "realtime_metrics">> {
    const [segment, contentCandidates, experimentMetrics] = await Promise.all([
      this.db.query(getDashboardPromotionSegment, { projectId, promotionId, segmentId }).single(),
      this.db
        .query(listDashboardSegmentContentCandidates, { projectId, promotionId, segmentId })
        .multiple(),
      this.db
        .query(listDashboardSegmentExperimentMetrics, { projectId, promotionId, segmentId })
        .multiple()
    ]);

    return {
      segment: toCampaignSegment(segment),
      content_candidates: contentCandidates.map(toContentCandidate),
      experiment_metrics: experimentMetrics.map(toCampaignExperimentMetric)
    };
  }
}

function toCampaignSummary(
  row: IGetDashboardCampaignSummaryResult | IListDashboardCampaignSummariesResult
): DashboardCampaignSummary {
  return {
    campaign_id: row.campaignId,
    campaign_name: row.campaignName,
    objective: row.objective,
    primary_metric: row.primaryMetric,
    status: row.status,
    start_date: formatDate(row.startDate),
    end_date: formatDate(row.endDate),
    promotion_count: countValue(row.promotionCount),
    segment_count: countValue(row.segmentCount),
    ad_experiment_count: countValue(row.adExperimentCount),
    latest_goal_achievement_rate: nullableRate(row.latestGoalAchievementRate),
    updated_at: row.updatedAt.toISOString()
  };
}

function toCampaignPromotion(
  row: IListDashboardCampaignPromotionsResult
): DashboardCampaignPromotion {
  return {
    promotion_id: row.promotionId,
    channel: row.channel,
    marketing_theme: row.marketingTheme,
    goal_metric: row.goalMetric,
    goal_target_value: numberValue(row.goalTargetValue),
    goal_basis: row.goalBasis,
    status: row.status,
    target_segment_count: countValue(row.targetSegmentCount),
    ad_experiment_count: countValue(row.adExperimentCount),
    latest_actual_value: nullableRate(row.latestActualValue),
    updated_at: row.updatedAt.toISOString()
  };
}

function toPromotionSummary(row: IGetDashboardPromotionSummaryResult): DashboardPromotionSummary {
  return {
    promotion_id: row.promotionId,
    campaign_id: row.campaignId,
    channel: row.channel,
    marketing_theme: row.marketingTheme,
    target_audience: row.targetAudience,
    goal_metric: row.goalMetric,
    goal_target_value: numberValue(row.goalTargetValue),
    goal_basis: row.goalBasis,
    min_sample_size: countValue(row.minSampleSize),
    offer_type: row.offerType,
    landing_url: row.landingUrl,
    status: row.status,
    target_segment_count: countValue(row.targetSegmentCount),
    ad_experiment_count: countValue(row.adExperimentCount),
    latest_actual_value: nullableRate(row.latestActualValue),
    updated_at: row.updatedAt.toISOString()
  };
}

function toCampaignSegment(
  row:
    | IGetDashboardPromotionSegmentResult
    | IListDashboardCampaignSegmentsResult
    | IListDashboardPromotionSegmentsResult
): DashboardCampaignSegment {
  return {
    promotion_id: row.promotionId,
    segment_id: row.segmentId,
    segment_name: row.segmentName,
    source: row.source,
    natural_language_query: row.naturalLanguageQuery,
    rule_json: jsonObject(row.ruleJson),
    profile_json: jsonObject(row.profileJson),
    content_brief_json: jsonObject(row.contentBriefJson),
    data_evidence_json: jsonObject(row.dataEvidenceJson),
    estimated_size: countValue(row.estimatedSize),
    sample_size: countValue(row.sampleSize),
    total_eligible_user_count: countValue(row.totalEligibleUserCount),
    sample_ratio: numberValue(row.sampleRatio),
    priority: row.priority,
    status: row.status
  };
}

function toCampaignExperimentMetric(
  row:
    | IListDashboardCampaignExperimentMetricsResult
    | IListDashboardPromotionExperimentMetricsResult
    | IListDashboardSegmentExperimentMetricsResult
): DashboardCampaignExperimentMetric {
  return {
    promotion_id: row.promotionId,
    promotion_run_id: row.promotionRunId,
    ad_experiment_id: row.adExperimentId,
    segment_id: row.segmentId,
    content_id: row.contentId,
    content_option_id: row.contentOptionId,
    metric: row.metric,
    target_value: numberValue(row.targetValue),
    actual_value: numberValue(row.actualValue),
    numerator_count: countValue(row.numeratorCount),
    denominator_count: countValue(row.denominatorCount),
    sample_size: countValue(row.sampleSize),
    basis: row.basis,
    status: row.status,
    feedback: row.feedback,
    next_loop_required: row.nextLoopRequired,
    result_json: jsonObject(row.resultJson),
    created_at: row.createdAt.toISOString()
  };
}

function toContentCandidate(
  row: IListDashboardSegmentContentCandidatesResult
): DashboardContentCandidate {
  return {
    content_id: row.contentId,
    content_option_id: row.contentOptionId,
    promotion_id: row.promotionId,
    segment_id: row.segmentId,
    channel: row.channel,
    title: row.title,
    body: row.body,
    cta: row.cta,
    message: row.message,
    image_prompt: row.imagePrompt,
    landing_url: row.landingUrl,
    generation_prompt: row.generationPrompt,
    reason_summary: row.reasonSummary,
    data_evidence_json: jsonObject(row.dataEvidenceJson),
    message_strategy: row.messageStrategy,
    metadata_json: jsonObject(row.metadataJson),
    status: row.status,
    updated_at: row.updatedAt.toISOString()
  };
}

function jsonObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function countValue(value: number | string | null): number {
  return Math.max(0, Math.trunc(numberValue(value)));
}

function nullableRate(value: number | string | null): number | null {
  return value === null ? null : Math.min(Math.max(numberValue(value), 0), 1);
}

function numberValue(value: number | string | null): number {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function formatDate(value: Date | null): string | null {
  if (!value) {
    return null;
  }
  return value.toISOString().slice(0, 10);
}
