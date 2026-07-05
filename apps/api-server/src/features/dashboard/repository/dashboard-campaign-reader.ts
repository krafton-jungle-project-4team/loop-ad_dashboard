import type {
  DashboardAdExperiment,
  DashboardApproveContentCandidateRequest,
  DashboardCampaignDetail,
  DashboardCampaignExperimentMetric,
  DashboardCampaignPromotion,
  DashboardCampaignSegment,
  DashboardCampaignSummary,
  DashboardConfirmSegmentSuggestionsRequest,
  DashboardConfirmSegmentSuggestionsResult,
  DashboardContentCandidate,
  DashboardAttachSegmentRequest,
  DashboardCreateCampaignRequest,
  DashboardCreatePromotionSegmentDefinitionRequest,
  DashboardCreatePromotionRequest,
  DashboardDecideSegmentSuggestionRequest,
  DashboardDeleteCampaignResult,
  DashboardDeletePromotionResult,
  DashboardDeletePromotionSegmentResult,
  DashboardNextLoopAnalysis,
  DashboardPromotionAnalysis,
  DashboardPromotionDetail,
  DashboardPromotionScopedSegmentDefinition,
  DashboardPromotionScopedSegmentDefinitionList,
  DashboardPromotionSegmentSuggestion,
  DashboardPromotionSegmentSuggestionList,
  DashboardPromotionSummary,
  DashboardRejectContentCandidateRequest,
  DashboardRejectContentCandidateResult,
  DashboardSegmentDetail,
  DashboardStartNextLoopRequest,
  DashboardUpdateCampaignRequest,
  DashboardUpdatePromotionRequest,
  DashboardUpdatePromotionSegmentRequest
} from "@loopad/shared";
import { randomUUID } from "node:crypto";
import { InjectTransaction, type Transaction } from "@nestjs-cls/transactional";
import { Injectable } from "@nestjs/common";
import { PgTypedTransactionalAdapter } from "../../../infra/database/pgtyped-transactional.adapter.js";
import {
  approveDashboardContentCandidate,
  confirmDashboardPromotionSegmentSuggestions,
  decideDashboardPromotionSegmentSuggestion,
  getDashboardCampaignSummary,
  getDashboardContentCandidateForApproval,
  getDashboardNextPromotionLoopCount,
  getDashboardPromotionSegment,
  getDashboardPromotionRunByGeneration,
  getDashboardPromotionSummary,
  insertDashboardCampaign,
  insertDashboardManualPromotionAnalysis,
  insertDashboardNextLoopAnalysis,
  insertDashboardPromotion,
  insertDashboardPromotionCustomSegmentDefinition,
  insertDashboardPromotionManualSegmentDefinition,
  insertDashboardPromotionTargetSegment,
  insertDashboardPromotionRun,
  listDashboardPromotionSegmentSuggestions,
  listDashboardPromotionScopedSegmentDefinitions,
  listDashboardCampaignSummaries,
  listDashboardCampaignExperimentMetrics,
  listDashboardCampaignPromotions,
  listDashboardCampaignSegments,
  listDashboardPromotionAnalyses,
  listDashboardPromotionExperimentMetrics,
  listDashboardPromotionSegments,
  listDashboardSegmentAdExperiments,
  listDashboardSegmentContentCandidates,
  listDashboardSegmentExperimentMetrics,
  markDashboardSegmentQueryPreviewSaved,
  markDashboardPromotionTargetSegmentApproved,
  rejectDashboardContentCandidate,
  rejectDashboardSiblingContentCandidates,
  stopDashboardCampaign,
  stopDashboardPromotion,
  stopDashboardPromotionTargetSegment,
  updateDashboardCampaign,
  updateDashboardPromotion,
  updateDashboardPromotionTargetSegment,
  upsertDashboardAdExperimentFromApprovedContent,
  type IGetDashboardCampaignSummaryResult,
  type IGetDashboardPromotionSegmentResult,
  type IGetDashboardPromotionSummaryResult,
  type IDecideDashboardPromotionSegmentSuggestionResult,
  type IInsertDashboardPromotionCustomSegmentDefinitionResult,
  type IInsertDashboardPromotionManualSegmentDefinitionResult,
  type IListDashboardPromotionScopedSegmentDefinitionsResult,
  type IListDashboardPromotionSegmentSuggestionsResult,
  type IRejectDashboardContentCandidateResult,
  type IListDashboardCampaignExperimentMetricsResult,
  type IListDashboardCampaignPromotionsResult,
  type IListDashboardCampaignSummariesResult,
  type IListDashboardCampaignSegmentsResult,
  type IListDashboardPromotionAnalysesResult,
  type IListDashboardSegmentAdExperimentsResult,
  type IListDashboardSegmentContentCandidatesResult,
  type IListDashboardSegmentExperimentMetricsResult,
  type IListDashboardPromotionExperimentMetricsResult,
  type IListDashboardPromotionSegmentsResult,
  type IUpsertDashboardAdExperimentFromApprovedContentResult,
  type Json
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

  async createCampaign(
    projectId: string,
    request: DashboardCreateCampaignRequest
  ): Promise<DashboardCampaignSummary> {
    const campaignId = `camp_${randomUUID()}`;
    await this.db
      .query(insertDashboardCampaign, {
        campaignId,
        campaignName: request.campaign_name,
        endDate: request.end_date ?? null,
        objective: request.objective ?? null,
        primaryMetric: request.primary_metric ?? null,
        projectId,
        startDate: request.start_date ?? null,
        status: request.status,
        targetAudience: request.target_audience
      })
      .single();

    return this.getCampaignSummary(projectId, campaignId);
  }

  async updateCampaign(
    projectId: string,
    campaignId: string,
    request: DashboardUpdateCampaignRequest
  ): Promise<DashboardCampaignSummary> {
    await this.db
      .query(updateDashboardCampaign, {
        campaignId,
        campaignName: request.campaign_name,
        endDate: request.end_date ?? null,
        endDateIsSet: Object.hasOwn(request, "end_date"),
        objective: request.objective ?? null,
        objectiveIsSet: Object.hasOwn(request, "objective"),
        primaryMetric: request.primary_metric ?? null,
        primaryMetricIsSet: Object.hasOwn(request, "primary_metric"),
        projectId,
        startDate: request.start_date ?? null,
        startDateIsSet: Object.hasOwn(request, "start_date"),
        status: request.status,
        targetAudience: request.target_audience
      })
      .single();

    return this.getCampaignSummary(projectId, campaignId);
  }

  async stopCampaign(
    projectId: string,
    campaignId: string
  ): Promise<DashboardDeleteCampaignResult> {
    const row = await this.db.query(stopDashboardCampaign, { campaignId, projectId }).single();

    return {
      campaign_id: row.campaignId,
      status: "stopped"
    };
  }

  async createPromotion(
    projectId: string,
    campaignId: string,
    request: DashboardCreatePromotionRequest
  ): Promise<DashboardPromotionSummary> {
    const promotionId = `promo_${randomUUID()}`;
    await this.db
      .query(insertDashboardPromotion, {
        campaignId,
        channel: request.channel,
        goalBasis: request.goal_basis,
        goalMetric: request.goal_metric,
        goalTargetValue: request.goal_target_value,
        landingType: request.landing_type ?? null,
        landingUrl: request.landing_url ?? null,
        marketingTheme: request.marketing_theme,
        maxLoopCount: request.max_loop_count,
        messageBrief: request.message_brief ?? null,
        minSampleSize: request.min_sample_size,
        offerType: request.offer_type ?? null,
        projectId,
        promotionId,
        status: request.status,
        targetAudience: request.target_audience
      })
      .single();

    return this.getPromotionSummary(projectId, promotionId);
  }

  async updatePromotion(
    projectId: string,
    promotionId: string,
    request: DashboardUpdatePromotionRequest
  ): Promise<DashboardPromotionSummary> {
    await this.db
      .query(updateDashboardPromotion, {
        channel: request.channel,
        goalBasis: request.goal_basis,
        goalMetric: request.goal_metric,
        goalTargetValue: request.goal_target_value,
        landingType: request.landing_type ?? null,
        landingTypeIsSet: Object.hasOwn(request, "landing_type"),
        landingUrl: request.landing_url ?? null,
        landingUrlIsSet: Object.hasOwn(request, "landing_url"),
        marketingTheme: request.marketing_theme,
        maxLoopCount: request.max_loop_count,
        messageBrief: request.message_brief ?? null,
        messageBriefIsSet: Object.hasOwn(request, "message_brief"),
        minSampleSize: request.min_sample_size,
        offerType: request.offer_type ?? null,
        offerTypeIsSet: Object.hasOwn(request, "offer_type"),
        projectId,
        promotionId,
        status: request.status,
        targetAudience: request.target_audience
      })
      .single();

    return this.getPromotionSummary(projectId, promotionId);
  }

  async stopPromotion(
    projectId: string,
    promotionId: string
  ): Promise<DashboardDeletePromotionResult> {
    const row = await this.db.query(stopDashboardPromotion, { projectId, promotionId }).single();

    return {
      promotion_id: row.promotionId,
      status: "stopped"
    };
  }

  async attachSegmentToPromotion(
    projectId: string,
    promotionId: string,
    request: DashboardAttachSegmentRequest
  ): Promise<DashboardCampaignSegment> {
    const promotion = await this.getPromotionSummary(projectId, promotionId);
    const analysisId = `analysis_manual_${randomUUID()}`;

    await this.db
      .query(insertDashboardManualPromotionAnalysis, {
        analysisId,
        campaignId: promotion.campaign_id,
        projectId,
        promotionId
      })
      .single();
    await this.db
      .query(insertDashboardPromotionTargetSegment, {
        analysisId,
        campaignId: promotion.campaign_id,
        priority: request.priority ?? null,
        projectId,
        promotionId,
        segmentId: request.segment_id,
        segmentName: request.segment_name,
        status: request.status
      })
      .single();

    return this.getPromotionSegment(projectId, promotionId, request.segment_id);
  }

  async updatePromotionSegment(
    projectId: string,
    promotionId: string,
    segmentId: string,
    request: DashboardUpdatePromotionSegmentRequest
  ): Promise<DashboardCampaignSegment> {
    await this.db
      .query(updateDashboardPromotionTargetSegment, {
        priority: request.priority ?? null,
        priorityIsSet: Object.hasOwn(request, "priority"),
        projectId,
        promotionId,
        segmentId,
        segmentName: request.segment_name,
        status: request.status
      })
      .single();

    return this.getPromotionSegment(projectId, promotionId, segmentId);
  }

  async stopPromotionSegment(
    projectId: string,
    promotionId: string,
    segmentId: string
  ): Promise<DashboardDeletePromotionSegmentResult> {
    const row = await this.db
      .query(stopDashboardPromotionTargetSegment, { projectId, promotionId, segmentId })
      .single();

    return {
      promotion_id: row.promotionId,
      segment_id: row.segmentId,
      status: "stopped"
    };
  }

  async listPromotionSegmentSuggestions(
    projectId: string,
    promotionId: string,
    analysisId?: string | null
  ): Promise<DashboardPromotionSegmentSuggestionList> {
    const rows = await this.db
      .query(listDashboardPromotionSegmentSuggestions, {
        analysisId: analysisId ?? null,
        projectId,
        promotionId
      })
      .multiple();

    return { suggestions: rows.map(toPromotionSegmentSuggestion) };
  }

  async listPromotionScopedSegmentDefinitions(
    projectId: string,
    promotionId: string
  ): Promise<DashboardPromotionScopedSegmentDefinitionList> {
    const rows = await this.db
      .query(listDashboardPromotionScopedSegmentDefinitions, { projectId, promotionId })
      .multiple();

    return { segments: rows.map(toPromotionScopedSegmentDefinition) };
  }

  async createPromotionScopedSegmentDefinition(
    projectId: string,
    promotionId: string,
    request: DashboardCreatePromotionSegmentDefinitionRequest
  ): Promise<DashboardPromotionScopedSegmentDefinition> {
    const promotion = await this.getPromotionSummary(projectId, promotionId);
    const segmentId = `seg_${request.source}_${randomUUID()}`;

    if (request.source === "custom_chatkit") {
      const queryPreviewId = request.query_preview_id ?? "";
      const row = await this.db
        .query(insertDashboardPromotionCustomSegmentDefinition, {
          campaignId: promotion.campaign_id,
          projectId,
          promotionId,
          queryPreviewId,
          segmentId,
          segmentName: request.segment_name
        })
        .single();

      await this.db
        .query(markDashboardSegmentQueryPreviewSaved, { projectId, queryPreviewId })
        .single();

      return toPromotionScopedSegmentDefinition(row);
    }

    const row = await this.db
      .query(insertDashboardPromotionManualSegmentDefinition, {
        campaignId: promotion.campaign_id,
        naturalLanguageQuery: request.natural_language_query ?? null,
        profileJson: request.profile_json as unknown as Json,
        projectId,
        promotionId,
        ruleJson: request.rule_json as unknown as Json,
        sampleRatio: request.sample_ratio,
        sampleSize: request.sample_size,
        segmentId,
        segmentName: request.segment_name,
        totalEligibleUserCount: request.total_eligible_user_count
      })
      .single();

    return toPromotionScopedSegmentDefinition(row);
  }

  async decidePromotionSegmentSuggestion(
    projectId: string,
    promotionId: string,
    suggestionId: string,
    request: DashboardDecideSegmentSuggestionRequest
  ): Promise<DashboardPromotionSegmentSuggestion> {
    const row = await this.db
      .query(decideDashboardPromotionSegmentSuggestion, {
        projectId,
        promotionId,
        status: request.status,
        suggestionId
      })
      .single();

    return toPromotionSegmentSuggestion(row);
  }

  async confirmPromotionSegmentSuggestions(
    projectId: string,
    promotionId: string,
    request: DashboardConfirmSegmentSuggestionsRequest
  ): Promise<DashboardConfirmSegmentSuggestionsResult> {
    const promotion = await this.getPromotionSummary(projectId, promotionId);
    const manualAnalysisId = `analysis_manual_confirm_${randomUUID()}`;

    await this.db
      .query(insertDashboardManualPromotionAnalysis, {
        analysisId: manualAnalysisId,
        campaignId: promotion.campaign_id,
        projectId,
        promotionId
      })
      .single();

    const row = await this.db
      .query(confirmDashboardPromotionSegmentSuggestions, {
        confirmedBy: request.confirmed_by ?? null,
        manualAnalysisId,
        projectId,
        promotionId
      })
      .single();

    return {
      confirmed_segment_count: countValue(row.confirmedSegmentCount),
      promotion_id: row.promotionId ?? promotionId,
      status: "confirmed"
    };
  }

  async startNextLoopAnalysis(
    projectId: string,
    promotionId: string,
    request: DashboardStartNextLoopRequest
  ): Promise<DashboardNextLoopAnalysis> {
    const promotion = await this.getPromotionSummary(projectId, promotionId);
    const analysisId = `analysis_next_loop_${randomUUID()}`;
    const row = await this.db
      .query(insertDashboardNextLoopAnalysis, {
        analysisId,
        campaignId: promotion.campaign_id,
        focusSegmentIdsJson: request.focus_segment_ids,
        operatorInstruction: request.operator_instruction ?? null,
        projectId,
        promotionId
      })
      .single();

    return {
      analysis_id: row.analysisId,
      focus_segment_ids: jsonStringArray(row.focusSegmentIdsJson),
      promotion_id: row.promotionId,
      status: "requested"
    };
  }

  async approveContentCandidate(
    projectId: string,
    promotionId: string,
    segmentId: string,
    contentId: string,
    _request: DashboardApproveContentCandidateRequest
  ): Promise<DashboardAdExperiment> {
    const candidate = await this.db
      .query(getDashboardContentCandidateForApproval, {
        contentId,
        projectId,
        promotionId,
        segmentId
      })
      .single();

    await this.db
      .query(rejectDashboardSiblingContentCandidates, {
        contentId,
        generationId: candidate.generationId,
        projectId,
        segmentId
      })
      .multiple();
    await this.db
      .query(approveDashboardContentCandidate, {
        contentId,
        projectId,
        promotionId,
        segmentId
      })
      .single();

    const promotionRun = await this.getOrCreatePromotionRunForCandidate(candidate);
    const experiment = await this.db
      .query(upsertDashboardAdExperimentFromApprovedContent, {
        adExperimentId: `ad_exp_${randomUUID()}`,
        analysisId: candidate.analysisId,
        campaignId: candidate.campaignId,
        channel: candidate.channel,
        contentId: candidate.contentId,
        contentOptionId: candidate.contentOptionId,
        generationId: candidate.generationId,
        goalBasis: candidate.goalBasis,
        goalMetric: candidate.goalMetric,
        goalTargetValue: candidate.goalTargetValue ?? 0,
        loopCount: promotionRun.loopCount,
        projectId,
        promotionId,
        promotionRunId: promotionRun.promotionRunId,
        segmentId,
        segmentName: candidate.segmentName
      })
      .single();

    await this.db
      .query(markDashboardPromotionTargetSegmentApproved, { projectId, promotionId, segmentId })
      .single();

    return toAdExperiment(experiment);
  }

  async rejectContentCandidate(
    projectId: string,
    promotionId: string,
    segmentId: string,
    contentId: string,
    _request: DashboardRejectContentCandidateRequest
  ): Promise<DashboardRejectContentCandidateResult> {
    const rejected = await this.db
      .query(rejectDashboardContentCandidate, {
        contentId,
        projectId,
        promotionId,
        segmentId
      })
      .single();

    return toRejectContentCandidateResult(rejected);
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
  ): Promise<Omit<DashboardPromotionDetail, "realtime_metrics" | "segment_realtime_summaries">> {
    const [promotion, analyses, segments, experimentMetrics] = await Promise.all([
      this.db.query(getDashboardPromotionSummary, { projectId, promotionId }).single(),
      this.db.query(listDashboardPromotionAnalyses, { projectId, promotionId }).multiple(),
      this.db.query(listDashboardPromotionSegments, { projectId, promotionId }).multiple(),
      this.db
        .query(listDashboardPromotionExperimentMetrics, { projectId, promotionId })
        .multiple()
    ]);

    return {
      promotion: toPromotionSummary(promotion),
      analyses: analyses.map(toPromotionAnalysis),
      segments: segments.map(toCampaignSegment),
      experiment_metrics: experimentMetrics.map(toCampaignExperimentMetric)
    };
  }

  async getSegmentDetail(
    projectId: string,
    promotionId: string,
    segmentId: string
  ): Promise<Omit<DashboardSegmentDetail, "realtime_metrics">> {
    const [segment, adExperiments, contentCandidates, experimentMetrics] = await Promise.all([
      this.db.query(getDashboardPromotionSegment, { projectId, promotionId, segmentId }).single(),
      this.db
        .query(listDashboardSegmentAdExperiments, { projectId, promotionId, segmentId })
        .multiple(),
      this.db
        .query(listDashboardSegmentContentCandidates, { projectId, promotionId, segmentId })
        .multiple(),
      this.db
        .query(listDashboardSegmentExperimentMetrics, { projectId, promotionId, segmentId })
        .multiple()
    ]);

    return {
      segment: toCampaignSegment(segment),
      ad_experiments: adExperiments.map(toSegmentAdExperiment),
      content_candidates: contentCandidates.map(toContentCandidate),
      experiment_metrics: experimentMetrics.map(toCampaignExperimentMetric)
    };
  }

  private async getCampaignSummary(
    projectId: string,
    campaignId: string
  ): Promise<DashboardCampaignSummary> {
    const row = await this.db.query(getDashboardCampaignSummary, { campaignId, projectId }).single();
    return toCampaignSummary(row);
  }

  private async getPromotionSummary(
    projectId: string,
    promotionId: string
  ): Promise<DashboardPromotionSummary> {
    const row = await this.db.query(getDashboardPromotionSummary, { projectId, promotionId }).single();
    return toPromotionSummary(row);
  }

  private async getPromotionSegment(
    projectId: string,
    promotionId: string,
    segmentId: string
  ): Promise<DashboardCampaignSegment> {
    const row = await this.db
      .query(getDashboardPromotionSegment, { projectId, promotionId, segmentId })
      .single();
    return toCampaignSegment(row);
  }

  private async getOrCreatePromotionRunForCandidate(candidate: {
    analysisId: string;
    campaignId: string;
    generationId: string;
    goalBasis: string;
    goalMetric: string;
    goalTargetValue: number | null;
    projectId: string;
    promotionId: string;
  }) {
    const existingRun = await this.db
      .query(getDashboardPromotionRunByGeneration, {
        generationId: candidate.generationId,
        projectId: candidate.projectId,
        promotionId: candidate.promotionId
      })
      .singleOrNull();

    if (existingRun) {
      return existingRun;
    }

    const loop = await this.db
      .query(getDashboardNextPromotionLoopCount, {
        projectId: candidate.projectId,
        promotionId: candidate.promotionId
      })
      .single();

    return this.db
      .query(insertDashboardPromotionRun, {
        analysisId: candidate.analysisId,
        campaignId: candidate.campaignId,
        generationId: candidate.generationId,
        goalBasis: candidate.goalBasis,
        goalMetric: candidate.goalMetric,
        goalTargetValue: candidate.goalTargetValue ?? 0,
        loopCount: loop.loopCount ?? 1,
        projectId: candidate.projectId,
        promotionId: candidate.promotionId,
        promotionRunId: `run_${randomUUID()}`
      })
      .single();
  }
}

function toCampaignSummary(
  row: IGetDashboardCampaignSummaryResult | IListDashboardCampaignSummariesResult
): DashboardCampaignSummary {
  return {
    campaign_id: row.campaignId,
    campaign_name: row.campaignName,
    objective: row.objective,
    target_audience: row.targetAudience,
    primary_metric: row.primaryMetric,
    status: row.status,
    start_date: formatDate(row.startDate),
    end_date: formatDate(row.endDate),
    max_loop_count: countValue(row.maxLoopCount),
    current_loop_count: countValue(row.currentLoopCount),
    promotion_count: countValue(row.promotionCount),
    segment_count: countValue(row.segmentCount),
    ad_experiment_count: countValue(row.adExperimentCount),
    latest_goal_achievement_rate: nullableRate(row.latestGoalAchievementRate),
    next_action: row.nextAction ?? "monitor",
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
    target_audience: row.targetAudience,
    goal_metric: row.goalMetric,
    goal_target_value: numberValue(row.goalTargetValue),
    goal_basis: row.goalBasis,
    min_sample_size: countValue(row.minSampleSize),
    max_loop_count: countValue(row.maxLoopCount),
    current_loop_count: countValue(row.currentLoopCount),
    message_brief: row.messageBrief,
    offer_type: row.offerType,
    landing_url: row.landingUrl,
    landing_type: row.landingType,
    status: row.status,
    target_segment_count: countValue(row.targetSegmentCount),
    ad_experiment_count: countValue(row.adExperimentCount),
    latest_actual_value: nullableRate(row.latestActualValue),
    next_action: row.nextAction ?? "monitor",
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
    max_loop_count: countValue(row.maxLoopCount),
    current_loop_count: countValue(row.currentLoopCount),
    message_brief: row.messageBrief,
    offer_type: row.offerType,
    landing_url: row.landingUrl,
    landing_type: row.landingType,
    status: row.status,
    target_segment_count: countValue(row.targetSegmentCount),
    ad_experiment_count: countValue(row.adExperimentCount),
    latest_actual_value: nullableRate(row.latestActualValue),
    next_action: row.nextAction ?? "monitor",
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
    goal_metric: row.goalMetric,
    latest_actual_value: nullableRate(row.latestActualValue),
    ad_experiment_id: row.adExperimentId,
    next_action: row.nextAction ?? "monitor",
    priority: row.priority,
    status: row.status
  };
}

function toPromotionSegmentSuggestion(
  row:
    | IDecideDashboardPromotionSegmentSuggestionResult
    | IListDashboardPromotionSegmentSuggestionsResult
): DashboardPromotionSegmentSuggestion {
  return {
    analysis_id: row.analysisId,
    campaign_id: row.campaignId,
    created_at: row.createdAt.toISOString(),
    decided_at: row.decidedAt ? row.decidedAt.toISOString() : null,
    profile_json: jsonObject(row.profileJson),
    promotion_id: row.promotionId,
    reason_json: jsonObject(row.reasonJson),
    rule_json: jsonObject(row.ruleJson),
    sample_ratio: numberValue(row.sampleRatio),
    sample_size: countValue(row.sampleSize),
    score_json: jsonObject(row.scoreJson),
    segment_id: row.segmentId,
    segment_name: row.segmentName,
    segment_source: segmentSource(row.segmentSource),
    suggested_rank: countValue(row.suggestedRank),
    suggestion_id: row.suggestionId,
    suggestion_source: suggestionSource(row.suggestionSource),
    suggestion_status: suggestionStatus(row.suggestionStatus),
    updated_at: row.updatedAt.toISOString()
  };
}

function toPromotionScopedSegmentDefinition(
  row:
    | IInsertDashboardPromotionCustomSegmentDefinitionResult
    | IInsertDashboardPromotionManualSegmentDefinitionResult
    | IListDashboardPromotionScopedSegmentDefinitionsResult
): DashboardPromotionScopedSegmentDefinition {
  return {
    campaign_id: row.campaignId ?? "",
    generated_sql: row.generatedSql,
    natural_language_query: row.naturalLanguageQuery,
    profile_json: jsonObject(row.profileJson),
    promotion_id: row.promotionId ?? "",
    query_preview_id: row.queryPreviewId,
    rule_json: jsonObject(row.ruleJson),
    sample_ratio: numberValue(row.sampleRatio),
    sample_size: countValue(row.sampleSize),
    segment_id: row.segmentId,
    segment_name: row.segmentName,
    source: promotionScopedSegmentSource(row.source),
    status: savedSegmentStatus(row.status),
    total_eligible_user_count: countValue(row.totalEligibleUserCount)
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

function toSegmentAdExperiment(row: IListDashboardSegmentAdExperimentsResult): DashboardAdExperiment {
  return {
    ad_experiment_id: row.adExperimentId,
    channel: row.channel,
    content_id: row.contentId,
    content_option_id: row.contentOptionId,
    goal_basis: row.goalBasis,
    goal_metric: row.goalMetric,
    goal_target_value: row.goalTargetValue ?? 0,
    loop_count: row.loopCount,
    promotion_id: row.promotionId,
    promotion_run_id: row.promotionRunId,
    segment_id: row.segmentId,
    status: row.status
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
    subject: row.subject,
    preheader: row.preheader,
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

function toAdExperiment(
  row: IUpsertDashboardAdExperimentFromApprovedContentResult
): DashboardAdExperiment {
  return {
    ad_experiment_id: row.adExperimentId,
    channel: row.channel,
    content_id: row.contentId,
    content_option_id: row.contentOptionId,
    goal_basis: row.goalBasis,
    goal_metric: row.goalMetric,
    goal_target_value: row.goalTargetValue ?? 0,
    loop_count: row.loopCount,
    promotion_id: row.promotionId,
    promotion_run_id: row.promotionRunId,
    segment_id: row.segmentId,
    status: row.status
  };
}

function toRejectContentCandidateResult(
  row: IRejectDashboardContentCandidateResult
): DashboardRejectContentCandidateResult {
  return {
    content_id: row.contentId,
    promotion_id: row.promotionId,
    rejected_at: row.rejectedAt.toISOString(),
    segment_id: row.segmentId,
    status: "rejected"
  };
}

function toPromotionAnalysis(row: IListDashboardPromotionAnalysesResult): DashboardPromotionAnalysis {
  return {
    analysis_id: row.analysisId,
    created_at: row.createdAt.toISOString(),
    focus_segment_ids: jsonStringArray(row.focusSegmentIdsJson),
    input_snapshot_json: jsonObject(row.inputSnapshotJson),
    operator_instruction: row.operatorInstruction,
    output_json: row.outputJson === null ? null : jsonObject(row.outputJson),
    profile_summary_json: jsonObject(row.profileSummaryJson),
    promotion_id: row.promotionId,
    status: row.status,
    updated_at: row.updatedAt.toISOString()
  };
}

function jsonObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function jsonStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
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

function suggestionStatus(value: string): DashboardPromotionSegmentSuggestion["suggestion_status"] {
  return value === "accepted" || value === "dismissed" || value === "confirmed"
    ? value
    : "suggested";
}

function suggestionSource(value: string): DashboardPromotionSegmentSuggestion["suggestion_source"] {
  return value === "ai_ranked_existing" ? value : "ai_generated";
}

function segmentSource(value: string): DashboardPromotionSegmentSuggestion["segment_source"] {
  return value === "custom_chatkit" || value === "manual_rule" || value === "system_default"
    ? value
    : "ai_suggested";
}

function promotionScopedSegmentSource(
  value: string
): DashboardPromotionScopedSegmentDefinition["source"] {
  return value === "custom_chatkit" ? "custom_chatkit" : "manual_rule";
}

function savedSegmentStatus(value: string): DashboardPromotionScopedSegmentDefinition["status"] {
  return value === "archived" ? "archived" : "active";
}

function formatDate(value: Date | null): string | null {
  if (!value) {
    return null;
  }
  return value.toISOString().slice(0, 10);
}
