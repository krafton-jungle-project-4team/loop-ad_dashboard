import type {
  DashboardArchivePromotionScopedSegmentDefinitionResult,
  DashboardApproveContentCandidateResult,
  DashboardApproveContentCandidateRequest,
  DashboardCampaignDetail,
  DashboardCampaignSegment,
  DashboardCampaignSummary,
  DashboardContentCandidate,
  DashboardConfirmSegmentSuggestionsRequest,
  DashboardConfirmSegmentSuggestionsResult,
  DashboardAttachSegmentRequest,
  DashboardCreateCampaignRequest,
  DashboardCreateProjectRequest,
  DashboardCreatePromotionSegmentDefinitionRequest,
  DashboardCreatePromotionRequest,
  DashboardDecideSegmentSuggestionRequest,
  DashboardDeleteCampaignResult,
  DashboardDeleteProjectResult,
  DashboardDeletePromotionResult,
  DashboardDeletePromotionSegmentResult,
  DashboardNextLoopAnalysis,
  DashboardProject,
  DashboardProjectList,
  DashboardPromotionDetail,
  DashboardPromotionScopedSegmentDefinition,
  DashboardPromotionScopedSegmentDefinitionList,
  DashboardPromotionSegmentSuggestion,
  DashboardPromotionSegmentSuggestionList,
  DashboardPromotionSummary,
  DashboardRejectContentCandidateRequest,
  DashboardRejectContentCandidateResult,
  DashboardSegmentDetail,
  DashboardStartPromotionGenerationResult,
  DashboardStartAdExperimentResult,
  DashboardStartNextLoopRequest,
  DashboardUnapproveContentCandidateRequest,
  DashboardUnapproveContentCandidateResult,
  DashboardUpdateContentCandidateCopyRequest,
  DashboardUpdateContentCandidateCopyResult,
  DashboardUpdateCampaignRequest,
  DashboardUpdatePromotionRequest,
  DashboardUpdatePromotionSegmentRequest
} from "@loopad/shared";
import { createHash, randomUUID } from "node:crypto";
import { InjectTransaction, type Transaction } from "@nestjs-cls/transactional";
import { Injectable } from "@nestjs/common";
import { PgTypedTransactionalAdapter } from "../../../infra/database/pgtyped-transactional.adapter.js";
import { dashboardErrors } from "../dashboard-errors.js";
import {
  countValue,
  jsonStringArray,
  toAdExperiment,
  toCampaignAdExperiment,
  toCampaignContentCandidate,
  toCampaignExperimentMetric,
  toCampaignPromotion,
  toCampaignSegment,
  toCampaignSummary,
  toContentCandidate,
  toProject,
  toPromotionAnalysis,
  toPromotionScopedSegmentDefinition,
  toPromotionSegmentSuggestion,
  toPromotionSummary,
  toRejectContentCandidateResult,
  toSegmentAdExperiment,
  toStartPromotionGenerationResult
} from "./dashboard-campaign-mappers.js";
import {
  archiveDashboardProject,
  approveDashboardContentCandidate,
  archiveDashboardPromotionScopedSegmentDefinition,
  confirmDashboardPromotionSegmentSuggestions,
  decideDashboardPromotionSegmentSuggestion,
  deleteDashboardCampaign,
  getDashboardCampaignSummary,
  getDashboardContentCandidate,
  getDashboardContentCandidateForApproval,
  getDashboardPromotionGenerationResult,
  getDashboardPromotionSegment,
  getDashboardPromotionSummary,
  insertDashboardCampaign,
  insertDashboardManualPromotionAnalysis,
  insertDashboardNextLoopAnalysis,
  insertDashboardProject,
  insertDashboardPromotion,
  insertDashboardPromotionCustomSegmentDefinition,
  insertDashboardPromotionManualSegmentDefinition,
  insertDashboardPromotionTargetSegment,
  listDashboardPromotionSegmentSuggestions,
  listDashboardPromotionScopedSegmentDefinitions,
  listDashboardProjects,
  listDashboardCampaignAdExperiments,
  listDashboardCampaignContentCandidates,
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
  rejectDashboardContentCandidate,
  startDashboardAdExperiment,
  stopDashboardPromotion,
  stopDashboardPromotionTargetSegment,
  updateDashboardCampaign,
  updateDashboardContentCandidateCopy,
  updateDashboardPromotion,
  updateDashboardPromotionTargetSegment,
  unapproveDashboardContentCandidate,
  type IListDashboardSegmentContentCandidatesResult,
  type Json
} from "../database/__generated__/dashboard.queries.js";
import { listDashboardRunningAdExperimentCounts } from "../database/__generated__/project-experiments.queries.js";
import {
  backfillDashboardPromotionRunMinSampleSize,
  normalizeDashboardPromotionRunLegacyGoalNearEvaluations
} from "../database/__generated__/promotion-run-compatibility.queries.js";

@Injectable()
export class DashboardCampaignReader {
  constructor(
    @InjectTransaction()
    private readonly db: Transaction<PgTypedTransactionalAdapter>
  ) {}

  async listProjects(): Promise<DashboardProjectList> {
    const rows = await this.db.query(listDashboardProjects, undefined).multiple();

    return { projects: rows.map(toProject) };
  }

  async createProject(request: DashboardCreateProjectRequest): Promise<DashboardProject> {
    const projectId = `project_${randomUUID()}`;
    const row = await this.db
      .query(insertDashboardProject, {
        domain: request.domain,
        projectId,
        projectName: request.project_name,
        status: request.status,
        writeKey: `wk_${randomUUID().replace(/-/g, "")}`
      })
      .single();

    return toProject(row);
  }

  async archiveProject(projectId: string): Promise<DashboardDeleteProjectResult> {
    const row = await this.db.query(archiveDashboardProject, { projectId }).single();

    return {
      project_id: row.projectId,
      status: "archived"
    };
  }

  async listCampaigns(projectId: string): Promise<DashboardCampaignSummary[]> {
    const [rows, runningCounts] = await Promise.all([
      this.db.query(listDashboardCampaignSummaries, { projectId }).multiple(),
      this.runningAdExperimentCounts(projectId)
    ]);

    return rows.map((row) => toCampaignSummary(row, runningCounts.get(row.campaignId)));
  }

  async preparePromotionRunEvaluationCompatibility(
    projectId: string,
    promotionRunId: string
  ): Promise<void> {
    await this.db
      .query(backfillDashboardPromotionRunMinSampleSize, { projectId, promotionRunId })
      .multiple();
    await this.db
      .query(normalizeDashboardPromotionRunLegacyGoalNearEvaluations, {
        projectId,
        promotionRunId
      })
      .multiple();
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
        status: request.status
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
        status: request.status
      })
      .single();

    return this.getCampaignSummary(projectId, campaignId);
  }

  async deleteCampaign(
    projectId: string,
    campaignId: string
  ): Promise<DashboardDeleteCampaignResult> {
    const row = await this.db.query(deleteDashboardCampaign, { campaignId, projectId }).single();

    return {
      campaign_id: row.campaignId,
      status: "deleted"
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
        status: request.status
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
        status: request.status
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

  async archivePromotionScopedSegmentDefinition(
    projectId: string,
    promotionId: string,
    segmentId: string
  ): Promise<DashboardArchivePromotionScopedSegmentDefinitionResult> {
    const row = await this.db
      .query(archiveDashboardPromotionScopedSegmentDefinition, {
        projectId,
        promotionId,
        segmentId
      })
      .single();

    return {
      promotion_id: row.promotionId ?? promotionId,
      segment_id: row.segmentId,
      status: "archived"
    };
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
    request: DashboardConfirmSegmentSuggestionsRequest,
    analysisId: string
  ): Promise<DashboardConfirmSegmentSuggestionsResult> {
    const row = await this.db
      .query(confirmDashboardPromotionSegmentSuggestions, {
        analysisId: request.analysis_id,
        projectId,
        promotionId,
        suggestionIds: request.suggestion_ids
      })
      .single();

    return {
      analysis_id: analysisId,
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

  async getPromotionGenerationResult(
    projectId: string,
    promotionId: string,
    analysisId: string
  ): Promise<DashboardStartPromotionGenerationResult | undefined> {
    const rows = await this.db
      .query(getDashboardPromotionGenerationResult, { analysisId, projectId, promotionId })
      .multiple();
    const row = rows[0];

    return row ? toStartPromotionGenerationResult(row) : undefined;
  }

  async getContentCandidate(
    projectId: string,
    promotionId: string,
    segmentId: string,
    contentId: string
  ): Promise<DashboardContentCandidate> {
    const row = await this.db
      .query(getDashboardContentCandidate, { contentId, projectId, promotionId, segmentId })
      .single();

    return toContentCandidate(row);
  }

  async updateContentCandidateCopy(
    projectId: string,
    promotionId: string,
    segmentId: string,
    contentId: string,
    request: DashboardUpdateContentCandidateCopyRequest,
    metadataJson: Record<string, unknown>,
    htmlUrl: string
  ): Promise<DashboardUpdateContentCandidateCopyResult> {
    const row = await this.db
      .query(updateDashboardContentCandidateCopy, {
        body: request.body,
        contentId,
        cta: request.cta,
        headline: request.headline,
        metadataJson: metadataJson as unknown as Json,
        projectId,
        promotionId,
        segmentId
      })
      .single();

    return {
      body: row.body ?? request.body,
      content_id: row.contentId,
      cta: row.cta ?? request.cta,
      headline: row.headline ?? request.headline,
      html_url: htmlUrl,
      promotion_id: row.promotionId,
      segment_id: row.segmentId,
      status: "draft",
      updated_at: row.updatedAt.toISOString()
    };
  }

  async approveContentCandidate(
    projectId: string,
    promotionId: string,
    segmentId: string,
    contentId: string,
    _request: DashboardApproveContentCandidateRequest
  ): Promise<DashboardApproveContentCandidateResult> {
    const candidate = await this.db
      .query(getDashboardContentCandidateForApproval, {
        contentId,
        projectId,
        promotionId,
        segmentId
      })
      .single();
    const approvedCandidate = await this.getApprovedContentCandidate(
      projectId,
      promotionId,
      segmentId,
      candidate.analysisId
    );

    if (approvedCandidate && approvedCandidate.contentId !== contentId) {
      throw dashboardErrors.contentCandidateApprovalLocked();
    }

    const approved = await this.db
      .query(approveDashboardContentCandidate, {
        contentId,
        projectId,
        promotionId,
        segmentId
      })
      .single();

    return {
      content_id: approved.contentId,
      content_option_id: approved.contentOptionId,
      promotion_id: promotionId,
      segment_id: segmentId,
      status: "approved"
    };
  }

  async unapproveContentCandidate(
    projectId: string,
    promotionId: string,
    segmentId: string,
    contentId: string,
    _request: DashboardUnapproveContentCandidateRequest
  ): Promise<DashboardUnapproveContentCandidateResult> {
    const unapproved = await this.db
      .query(unapproveDashboardContentCandidate, {
        contentId,
        projectId,
        promotionId,
        segmentId
      })
      .single();

    return {
      content_id: unapproved.contentId,
      content_option_id: unapproved.contentOptionId,
      promotion_id: promotionId,
      segment_id: segmentId,
      status: "draft"
    };
  }

  async rejectContentCandidate(
    projectId: string,
    promotionId: string,
    segmentId: string,
    contentId: string,
    _request: DashboardRejectContentCandidateRequest
  ): Promise<DashboardRejectContentCandidateResult> {
    const candidates = await this.db
      .query(listDashboardSegmentContentCandidates, { projectId, promotionId, segmentId })
      .multiple();
    const candidate = candidates.find((item) => item.contentId === contentId);
    const approvedCandidate = candidates.find(
      (item) => item.analysisId === candidate?.analysisId && item.status === "approved"
    );

    if (approvedCandidate?.contentId === contentId) {
      throw dashboardErrors.contentCandidateApprovalLocked();
    }

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

  private async getApprovedContentCandidate(
    projectId: string,
    promotionId: string,
    segmentId: string,
    analysisId: string
  ): Promise<IListDashboardSegmentContentCandidatesResult | undefined> {
    const candidates = await this.db
      .query(listDashboardSegmentContentCandidates, { projectId, promotionId, segmentId })
      .multiple();

    return candidates.find(
      (candidate) => candidate.analysisId === analysisId && candidate.status === "approved"
    );
  }

  async startAdExperiment(
    projectId: string,
    promotionId: string,
    adExperimentId: string
  ): Promise<DashboardStartAdExperimentResult> {
    const row = await this.db
      .query(startDashboardAdExperiment, {
        adExperimentId,
        projectId,
        promotionId
      })
      .single();

    return {
      ...toAdExperiment(row),
      status: "running"
    };
  }

  async getCampaignDetail(
    projectId: string,
    campaignId: string
  ): Promise<Omit<DashboardCampaignDetail, "realtime_metrics">> {
    const [
      campaign,
      promotions,
      segments,
      adExperiments,
      contentCandidates,
      experimentMetrics,
      runningCounts
    ] = await Promise.all([
      this.db.query(getDashboardCampaignSummary, { campaignId, projectId }).single(),
      this.db.query(listDashboardCampaignPromotions, { campaignId, projectId }).multiple(),
      this.db.query(listDashboardCampaignSegments, { campaignId, projectId }).multiple(),
      this.db.query(listDashboardCampaignAdExperiments, { campaignId, projectId }).multiple(),
      this.db.query(listDashboardCampaignContentCandidates, { campaignId, projectId }).multiple(),
      this.db.query(listDashboardCampaignExperimentMetrics, { campaignId, projectId }).multiple(),
      this.runningAdExperimentCounts(projectId)
    ]);

    return {
      campaign: toCampaignSummary(campaign, runningCounts.get(campaignId)),
      promotions: promotions.map(toCampaignPromotion),
      segments: segments.map(toCampaignSegment),
      ad_experiments: adExperiments.map(toCampaignAdExperiment),
      content_candidates: contentCandidates.map(toCampaignContentCandidate),
      experiment_metrics: experimentMetrics.map(toCampaignExperimentMetric)
    };
  }

  async getPromotionDetail(
    projectId: string,
    promotionId: string
  ): Promise<
    Omit<DashboardPromotionDetail, "generation" | "realtime_metrics" | "segment_realtime_summaries">
  > {
    const [promotion, analyses, segments, experimentMetrics] = await Promise.all([
      this.db.query(getDashboardPromotionSummary, { projectId, promotionId }).single(),
      this.db.query(listDashboardPromotionAnalyses, { projectId, promotionId }).multiple(),
      this.db.query(listDashboardPromotionSegments, { projectId, promotionId }).multiple(),
      this.db.query(listDashboardPromotionExperimentMetrics, { projectId, promotionId }).multiple()
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
    const [row, runningCounts] = await Promise.all([
      this.db.query(getDashboardCampaignSummary, { campaignId, projectId }).single(),
      this.runningAdExperimentCounts(projectId)
    ]);
    return toCampaignSummary(row, runningCounts.get(campaignId));
  }

  private async runningAdExperimentCounts(projectId: string): Promise<Map<string, number>> {
    const rows = await this.db
      .query(listDashboardRunningAdExperimentCounts, { projectId })
      .multiple();

    return new Map(
      rows.map((row) => [row.campaignId, countValue(row.runningAdExperimentCount)] as const)
    );
  }

  async getPromotionSummary(
    projectId: string,
    promotionId: string
  ): Promise<DashboardPromotionSummary> {
    const row = await this.db
      .query(getDashboardPromotionSummary, { projectId, promotionId })
      .single();
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
}

export function promotionConfirmationAnalysisId(projectId: string, promotionId: string) {
  const digest = createHash("sha256")
    .update(`${projectId}:${promotionId}`)
    .digest("hex")
    .slice(0, 24);
  return `analysis_manual_confirm_${digest}`;
}
