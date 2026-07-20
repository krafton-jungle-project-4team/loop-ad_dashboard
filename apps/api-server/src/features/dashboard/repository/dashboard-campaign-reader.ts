import { DashboardAudienceAllocationPreviewContextSchema } from "@loopad/shared";
import type {
  DashboardAdExperiment,
  DashboardArchivePromotionScopedSegmentDefinitionResult,
  DashboardApproveContentCandidateResult,
  DashboardApproveContentCandidateRequest,
  DashboardCampaignDetail,
  DashboardCampaignPromotion,
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
  confirmDashboardLegacyPromotionSegments,
  confirmDashboardV2PromotionSegmentSuggestions,
  decideDashboardPromotionSegmentSuggestion,
  deleteDashboardCampaign,
  ensureDashboardPromotionTargetSegmentApproved,
  getDashboardCampaignSummary,
  getDashboardContentCandidate,
  getDashboardContentCandidateForApproval,
  getDashboardPromotionGenerationResult,
  getDashboardPromotionSegment,
  getDashboardPromotionSummary,
  getDashboardSegmentQueryPreviewForSave,
  insertDashboardCampaign,
  insertDashboardManualPromotionAnalysis,
  insertDashboardNextLoopAnalysis,
  insertDashboardProject,
  insertDashboardPromotion,
  insertDashboardPromotionCustomSegmentDefinition,
  insertDashboardPromotionManualSegmentDefinition,
  insertDashboardPromotionTargetSegment,
  listDashboardPromotionSegmentSuggestions,
  listDashboardPromotionSegmentSuggestionAudienceMembers,
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
import { buildCustomStructuredAudienceRule } from "../segment-audience-v2-contract.js";
import { listDashboardRunningAdExperimentCounts } from "../database/__generated__/project-experiments.queries.js";
import {
  backfillDashboardPromotionRunMinSampleSize,
  normalizeDashboardPromotionRunLegacyGoalNearEvaluations
} from "../database/__generated__/promotion-run-compatibility.queries.js";

const confirmationWriteRetryDelaysMs = [50, 100, 200, 400, 500, 750] as const;

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

  async listCampaignPromotions(
    projectId: string,
    campaignId: string
  ): Promise<DashboardCampaignPromotion[]> {
    const rows = await this.db
      .query(listDashboardCampaignPromotions, { campaignId, projectId })
      .multiple();
    return rows.map(toCampaignPromotion);
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
        executionMode: request.execution_mode,
        scheduledStartAt: request.scheduled_start_at,
        scheduledEndAt: request.scheduled_end_at,
        loopIntervalUnit: request.loop_interval_unit,
        loopIntervalValue: request.loop_interval_value,
        messageBrief: request.message_brief ?? null,
        minSampleSize: request.min_sample_size,
        offerLinksIsSet: Object.hasOwn(request, "offer_links"),
        offerLinksJson: JSON.stringify(request.offer_links ?? []),
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
        executionMode: request.execution_mode,
        scheduledStartAt: request.scheduled_start_at ?? null,
        scheduledStartAtIsSet: Object.hasOwn(request, "scheduled_start_at"),
        scheduledEndAt: request.scheduled_end_at ?? null,
        scheduledEndAtIsSet: Object.hasOwn(request, "scheduled_end_at"),
        loopIntervalUnit: request.loop_interval_unit,
        loopIntervalValue: request.loop_interval_value,
        messageBrief: request.message_brief ?? null,
        messageBriefIsSet: Object.hasOwn(request, "message_brief"),
        minSampleSize: request.min_sample_size,
        offerLinksIsSet: Object.hasOwn(request, "offer_links"),
        offerLinksJson: JSON.stringify(request.offer_links ?? []),
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

    const preview = DashboardAudienceAllocationPreviewContextSchema.safeParse(
      rows[0]?.audienceAllocationPreviewContext
    );

    return {
      suggestions: rows.map(toPromotionSegmentSuggestion),
      audience_allocation_preview_context: preview.success ? preview.data : null
    };
  }

  async listPromotionSegmentSuggestionAudienceMemberIds(
    projectId: string,
    promotionId: string,
    suggestionId: string
  ): Promise<string[]> {
    const rows = await this.db
      .query(listDashboardPromotionSegmentSuggestionAudienceMembers, {
        projectId,
        promotionId,
        suggestionId
      })
      .multiple();

    return rows.map((row) => row.userId);
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
      const preview = await this.db
        .query(getDashboardSegmentQueryPreviewForSave, {
          projectId,
          queryPreviewId
        })
        .single();
      if (preview.sampleSizeStatus !== "valid" || preview.status !== "previewed") {
        throw dashboardErrors.segmentPreviewNotSaveable();
      }
      let ruleJson: ReturnType<typeof buildCustomStructuredAudienceRule>;
      try {
        ruleJson = buildCustomStructuredAudienceRule(preview.queryParamsJson);
      } catch {
        throw dashboardErrors.segmentPreviewNotSaveable();
      }
      const row = await this.db
        .query(insertDashboardPromotionCustomSegmentDefinition, {
          campaignId: promotion.campaign_id,
          projectId,
          promotionId,
          queryPreviewId,
          ruleJson: ruleJson as unknown as Json,
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

  async confirmLegacyPromotionSegments(
    projectId: string,
    promotionId: string,
    request: DashboardConfirmSegmentSuggestionsRequest
  ): Promise<DashboardConfirmSegmentSuggestionsResult> {
    const promotion = await this.getPromotionSummary(projectId, promotionId);
    const manualAnalysisId = promotionConfirmationAnalysisId(projectId, promotionId);

    await this.db
      .query(insertDashboardManualPromotionAnalysis, {
        analysisId: manualAnalysisId,
        campaignId: promotion.campaign_id,
        projectId,
        promotionId
      })
      .single();

    const row = await this.db
      .query(confirmDashboardLegacyPromotionSegments, {
        analysisId: request.analysis_id,
        confirmedBy: request.confirmed_by ?? null,
        manualAnalysisId,
        projectId,
        promotionId,
        segmentIds: request.segment_ids,
        suggestionIds: request.suggestion_ids
      })
      .single();

    return {
      analysis_id: manualAnalysisId,
      confirmed_segment_count: countValue(row.confirmedSegmentCount),
      promotion_id: row.promotionId ?? promotionId,
      status: "confirmed",
      target_segments: []
    };
  }

  async confirmV2PromotionSegmentSuggestions(request: {
    confirmationAnalysisId: string;
    confirmedBy: string | null;
    projectId: string;
    promotionId: string;
    sourceAnalysisId: string;
    suggestionIds: string[];
  }): Promise<number> {
    for (let attempt = 0; attempt <= confirmationWriteRetryDelaysMs.length; attempt += 1) {
      const row = await this.db
        .query(confirmDashboardV2PromotionSegmentSuggestions, {
          confirmationAnalysisId: request.confirmationAnalysisId,
          confirmedBy: request.confirmedBy,
          projectId: request.projectId,
          promotionId: request.promotionId,
          sourceAnalysisId: request.sourceAnalysisId,
          suggestionIds: request.suggestionIds
        })
        .single();

      const confirmedCount = countValue(row.confirmedSegmentCount);
      const updatedSuggestionCount = countValue(row.updatedSuggestionCount);
      if (
        confirmedCount === request.suggestionIds.length &&
        updatedSuggestionCount === confirmedCount
      ) {
        return confirmedCount;
      }

      const decisionWriteIsNotVisible = confirmedCount === 0 && updatedSuggestionCount === 0;
      const retryDelayMs = confirmationWriteRetryDelaysMs[attempt];
      if (!decisionWriteIsNotVisible || retryDelayMs === undefined) {
        throw dashboardErrors.decisionRequestFailed({
          detail: {
            code: "segment_audience_confirmation_write_mismatch",
            reason: "확정된 고객군 정보를 저장하지 못했어요. 다시 시도해 주세요."
          },
          status: 409
        });
      }

      await new Promise<void>((resolve) => setTimeout(resolve, retryDelayMs));
    }

    throw new Error("unreachable");
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
    analysisId: string,
    segmentId?: string
  ): Promise<DashboardStartPromotionGenerationResult | undefined> {
    const rows = await this.db
      .query(getDashboardPromotionGenerationResult, {
        analysisId,
        projectId,
        promotionId,
        segmentId: segmentId ?? null
      })
      .multiple();
    const row = rows[0];

    return row ? toStartPromotionGenerationResult(row) : undefined;
  }

  async ensurePromotionTargetSegmentApproved(
    projectId: string,
    promotionId: string,
    analysisId: string,
    segmentId: string
  ): Promise<void> {
    await this.db
      .query(ensureDashboardPromotionTargetSegmentApproved, {
        analysisId,
        projectId,
        promotionId,
        segmentId
      })
      .single();
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

  async findAdExperiment(
    projectId: string,
    promotionId: string,
    segmentId: string,
    adExperimentId: string
  ): Promise<DashboardAdExperiment | null> {
    const rows = await this.db
      .query(listDashboardSegmentAdExperiments, { projectId, promotionId, segmentId })
      .multiple();
    const row = rows.find((candidate) => candidate.adExperimentId === adExperimentId);

    return row ? toSegmentAdExperiment(row) : null;
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
  ): Promise<Omit<DashboardSegmentDetail, "generation" | "realtime_metrics">> {
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

  async getCampaignSummary(
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
