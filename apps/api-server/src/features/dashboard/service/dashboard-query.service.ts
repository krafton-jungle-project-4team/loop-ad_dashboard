import { Inject, Injectable, Optional } from "@nestjs/common";
import { Transactional } from "@nestjs-cls/transactional";
import type {
  DashboardArchivePromotionScopedSegmentDefinitionResult,
  DashboardAnalyzePromotionSegmentsRequest,
  DashboardApproveContentCandidateResult,
  DashboardApproveContentCandidateRequest,
  DashboardBuildPromotionRunAssignmentsResult,
  DashboardConfirmSegmentSuggestionsRequest,
  DashboardConfirmSegmentSuggestionsResult,
  DashboardCreateNextLoopRequest,
  DashboardCreateNextLoopResult,
  DashboardCreatePromotionRunRequest,
  DashboardCreatePromotionRunResult,
  DashboardCreateFunnelRequest,
  DashboardCampaignDetail,
  DashboardCampaignSegment,
  DashboardCampaignSummary,
  DashboardContentCandidateHtmlSource,
  DashboardAttachSegmentRequest,
  DashboardCreateCampaignRequest,
  DashboardCreateProjectRequest,
  DashboardCreatePromotionSegmentDefinitionRequest,
  DashboardDecideSegmentSuggestionRequest,
  DashboardDeleteCampaignResult,
  DashboardDeleteProjectResult,
  DashboardCreatePromotionRequest,
  DashboardDeletePromotionResult,
  DashboardDeletePromotionSegmentResult,
  DashboardDeleteFunnelResult,
  DashboardEventCatalog,
  DashboardEvaluateAdExperimentResult,
  DashboardEvaluatePromotionRunResult,
  DashboardFunnel,
  DashboardFunnelList,
  DashboardFunnelMetrics,
  DashboardFunnelMetricsDateRange,
  DashboardFunnelMetricsScope,
  DashboardFunnelPreview,
  DashboardFunnelPreviewRequest,
  DashboardMain,
  DashboardNextLoopAnalysis,
  DashboardProject,
  DashboardProjectList,
  DashboardPromotionDetail,
  DashboardPromotionAnalysisResult,
  DashboardPromotionOfferCatalog,
  DashboardPromotionScopedSegmentDefinition,
  DashboardPromotionScopedSegmentDefinitionList,
  DashboardPromotionSegmentSuggestion,
  DashboardPromotionSegmentSuggestionList,
  DashboardPromotionSummary,
  DashboardPreviewContentCandidateHtmlRequest,
  DashboardPreviewContentCandidateHtmlResult,
  DashboardSaveContentCandidateHtmlRequest,
  DashboardSaveContentCandidateHtmlResult,
  DashboardRejectContentCandidateRequest,
  DashboardRejectContentCandidateResult,
  DashboardReviseContentCandidateHtmlRequest,
  DashboardReviseContentCandidateHtmlResult,
  DashboardSavedSegment,
  DashboardSaveSegmentRequest,
  DashboardSegmentDetail,
  DashboardSegmentAssistantRequest,
  DashboardSegmentAssistantResponse,
  DashboardSegmentAssistantSourceContext,
  DashboardSegmentQueryPreview,
  DashboardSegmentQueryPreviewRequest,
  DashboardRecommendPromotionSegmentsRequest,
  DashboardStartAdExperimentResult,
  DashboardStartPromotionGenerationRequest,
  DashboardStartPromotionGenerationResult,
  DashboardStartNextLoopRequest,
  DashboardUnapproveContentCandidateRequest,
  DashboardUnapproveContentCandidateResult,
  DashboardUpdateCampaignRequest,
  DashboardUpdateContentCandidateCopyRequest,
  DashboardUpdateContentCandidateCopyResult,
  DashboardUpdateFunnelRequest,
  DashboardUpdatePromotionRequest,
  DashboardUpdatePromotionSegmentRequest
} from "@loopad/shared";
import {
  isCampaignDateRangeValid,
  isCampaignScheduleExpired,
  isPromotionScheduleWithinCampaign
} from "@loopad/shared";
import {
  DashboardCampaignReader,
  DashboardFunnelReader,
  DashboardPromotionAutomationRepository,
  DashboardSegmentQueryRepository,
  MIN_SEGMENT_USER_COUNT,
  type SegmentAssistantDiagnostics
} from "../repository/index.js";
import { dashboardErrors } from "../dashboard-errors.js";
import {
  DashboardCreativeRevisionAgent,
  DashboardDecisionClient,
  DashboardSegmentAssistantAgent
} from "../provider/index.js";
import { LogContextScope, durationMs, log } from "../../../infra/logger/index.js";
import {
  applyCreativeHtmlReplacementPatch,
  contentCandidateCopy,
  contentCandidateHtmlRevision,
  contentCandidateHtmlUrl,
  editableCreative,
  editedCreativeMetadata,
  rewriteCreativeHtmlCopy,
  sanitizeCreativeHtmlRevision
} from "./content-candidate-copy.js";
import {
  applySourceBaseConditionEdit,
  buildSourceEditableConditions,
  isSourceBaseConditionEditRequest,
  removeRequestedSourceRefinements,
  removeUnchangedSourceConditions,
  selectSourceRefinementCandidates,
  sourceBaseConditionLabels,
  sourceConditionsEqual,
  sourceReferenceLabelEvents,
  upsertRefinementCondition
} from "../segment-assistant-refinements.js";
import {
  usesSourceAudienceMembership,
  type SegmentAssistantAudienceCondition,
  type SegmentAssistantPlan,
  type SegmentAssistantSourceAudience
} from "../segment-assistant.types.js";

const AI_CREATIVE_HTML_INPUT_LIMIT_BYTES = 500_000;

@Injectable()
export class DashboardQueryService {
  constructor(
    @Inject(DashboardCampaignReader)
    private readonly campaignReader: DashboardCampaignReader,
    @Inject(DashboardFunnelReader)
    private readonly funnelReader: DashboardFunnelReader,
    @Inject(DashboardSegmentQueryRepository)
    private readonly segmentQueryRepository: DashboardSegmentQueryRepository,
    @Inject(DashboardDecisionClient)
    private readonly decisionClient: DashboardDecisionClient,
    @Optional()
    @Inject(DashboardSegmentAssistantAgent)
    private readonly segmentAssistantAgent?: DashboardSegmentAssistantAgent,
    @Optional()
    @Inject(DashboardPromotionAutomationRepository)
    private readonly promotionAutomationRepository?: DashboardPromotionAutomationRepository,
    @Optional()
    @Inject(DashboardCreativeRevisionAgent)
    private readonly creativeRevisionAgent?: DashboardCreativeRevisionAgent
  ) {}

  @LogContextScope()
  async main(projectId: string): Promise<DashboardMain> {
    const startedAt = Date.now();
    log.assignContext({ projectId });
    log.info("started", { projectId });
    const [campaigns, realtimeMetrics] = await Promise.all([
      this.campaignReader.listCampaigns(projectId),
      this.funnelReader.getProjectRealtimeMetrics(projectId)
    ]);
    const response = { campaigns, realtime_metrics: realtimeMetrics };

    log.info("completed", { response, durationMs: durationMs(startedAt) });
    return response;
  }

  @LogContextScope()
  async projects(): Promise<DashboardProjectList> {
    const startedAt = Date.now();
    log.info("started");
    const response = await this.campaignReader.listProjects();

    log.info("completed", { response, durationMs: durationMs(startedAt) });
    return response;
  }

  @LogContextScope()
  @Transactional()
  async createProject(request: DashboardCreateProjectRequest): Promise<DashboardProject> {
    const startedAt = Date.now();
    log.info("started", { request });
    const response = await this.campaignReader.createProject(request);
    log.assignContext({ projectId: response.project_id });

    log.info("completed", { response, durationMs: durationMs(startedAt) });
    return response;
  }

  @LogContextScope()
  @Transactional()
  async archiveProject(projectId: string): Promise<DashboardDeleteProjectResult> {
    const startedAt = Date.now();
    log.assignContext({ projectId });
    log.info("started", { projectId });
    const response = await this.campaignReader.archiveProject(projectId);

    log.info("completed", { response, durationMs: durationMs(startedAt) });
    return response;
  }

  @LogContextScope()
  @Transactional()
  async createCampaign(
    projectId: string,
    request: DashboardCreateCampaignRequest
  ): Promise<DashboardCampaignSummary> {
    const startedAt = Date.now();
    log.assignContext({ projectId });
    log.info("started", { projectId, request });
    const response = await this.campaignReader.createCampaign(projectId, request);
    log.assignContext({ campaignId: response.campaign_id });

    log.info("completed", { response, durationMs: durationMs(startedAt) });
    return response;
  }

  @LogContextScope()
  @Transactional()
  async updateCampaign(
    projectId: string,
    campaignId: string,
    request: DashboardUpdateCampaignRequest
  ): Promise<DashboardCampaignSummary> {
    const startedAt = Date.now();
    log.assignContext({ campaignId, projectId });
    log.info("started", { projectId, campaignId, request });
    await this.validateCampaignScheduleUpdate(projectId, campaignId, request);
    const response = await this.campaignReader.updateCampaign(projectId, campaignId, request);

    log.info("completed", { response, durationMs: durationMs(startedAt) });
    return response;
  }

  @LogContextScope()
  @Transactional()
  async deleteCampaign(
    projectId: string,
    campaignId: string
  ): Promise<DashboardDeleteCampaignResult> {
    const startedAt = Date.now();
    log.assignContext({ campaignId, projectId });
    log.info("started", { projectId, campaignId });

    const response = await this.campaignReader.deleteCampaign(projectId, campaignId);

    log.info("completed", { response, durationMs: durationMs(startedAt) });
    return response;
  }

  @LogContextScope()
  @Transactional()
  async createPromotion(
    projectId: string,
    campaignId: string,
    request: DashboardCreatePromotionRequest
  ): Promise<DashboardPromotionSummary> {
    const startedAt = Date.now();
    log.assignContext({ campaignId, projectId });
    log.info("started", { projectId, campaignId, request });
    const campaign = await this.campaignReader.getCampaignSummary(projectId, campaignId);
    assertCampaignExecutionWindowOpen(campaign);
    assertPromotionScheduleWithinCampaign(request, campaign);
    const response = await this.campaignReader.createPromotion(projectId, campaignId, request);
    log.assignContext({ promotionId: response.promotion_id });

    log.info("completed", { response, durationMs: durationMs(startedAt) });
    return response;
  }

  @LogContextScope()
  async promotionOffers(projectId: string): Promise<DashboardPromotionOfferCatalog> {
    const startedAt = Date.now();
    log.assignContext({ projectId });
    log.info("started", { projectId });
    const response = await this.decisionClient.promotionOffers({ projectId });

    log.info("completed", { response, durationMs: durationMs(startedAt) });
    return response;
  }

  @LogContextScope()
  @Transactional()
  async updatePromotion(
    projectId: string,
    promotionId: string,
    request: DashboardUpdatePromotionRequest
  ): Promise<DashboardPromotionSummary> {
    const startedAt = Date.now();
    log.assignContext({ projectId, promotionId });
    log.info("started", { projectId, promotionId, request });
    const promotion = await this.campaignReader.getPromotionSummary(projectId, promotionId);
    log.assignContext({ campaignId: promotion.campaign_id });
    const campaign = await this.campaignReader.getCampaignSummary(projectId, promotion.campaign_id);
    assertCampaignExecutionWindowOpen(campaign);
    assertPromotionScheduleWithinCampaign(
      {
        scheduled_end_at: Object.hasOwn(request, "scheduled_end_at")
          ? request.scheduled_end_at
          : promotion.scheduled_end_at,
        scheduled_start_at: Object.hasOwn(request, "scheduled_start_at")
          ? request.scheduled_start_at
          : promotion.scheduled_start_at
      },
      campaign
    );
    const response = await this.campaignReader.updatePromotion(projectId, promotionId, request);
    await this.promotionAutomationRepository?.syncPendingJobs(projectId, promotionId);

    log.info("completed", { response, durationMs: durationMs(startedAt) });
    return response;
  }

  private async validateCampaignScheduleUpdate(
    projectId: string,
    campaignId: string,
    request: DashboardUpdateCampaignRequest
  ) {
    if (!Object.hasOwn(request, "start_date") && !Object.hasOwn(request, "end_date")) {
      return;
    }

    const [campaign, promotions] = await Promise.all([
      this.campaignReader.getCampaignSummary(projectId, campaignId),
      this.campaignReader.listCampaignPromotions(projectId, campaignId)
    ]);
    const nextCampaignSchedule = {
      end_date: Object.hasOwn(request, "end_date") ? request.end_date : campaign.end_date,
      start_date: Object.hasOwn(request, "start_date") ? request.start_date : campaign.start_date
    };
    if (
      !isCampaignDateRangeValid(nextCampaignSchedule.start_date, nextCampaignSchedule.end_date) ||
      promotions.some(
        (promotion) => !isPromotionScheduleWithinCampaign(promotion, nextCampaignSchedule)
      )
    ) {
      log.warn("campaign_promotion_schedule_conflict", {
        campaignSchedule: nextCampaignSchedule,
        promotionCount: promotions.length
      });
      throw dashboardErrors.campaignPromotionScheduleConflict();
    }
  }

  @LogContextScope()
  @Transactional()
  async stopPromotion(
    projectId: string,
    promotionId: string
  ): Promise<DashboardDeletePromotionResult> {
    const startedAt = Date.now();
    log.assignContext({ projectId, promotionId });
    log.info("started", { projectId, promotionId });
    const response = await this.campaignReader.stopPromotion(projectId, promotionId);

    log.info("completed", { response, durationMs: durationMs(startedAt) });
    return response;
  }

  @LogContextScope()
  @Transactional()
  async attachSegmentToPromotion(
    projectId: string,
    promotionId: string,
    request: DashboardAttachSegmentRequest
  ): Promise<DashboardCampaignSegment> {
    const startedAt = Date.now();
    log.assignContext({ projectId, promotionId });
    log.info("started", { projectId, promotionId, request });
    const response = await this.campaignReader.attachSegmentToPromotion(
      projectId,
      promotionId,
      request
    );
    log.assignContext({ segmentId: response.segment_id });

    log.info("completed", { response, durationMs: durationMs(startedAt) });
    return response;
  }

  @LogContextScope()
  @Transactional()
  async updatePromotionSegment(
    projectId: string,
    promotionId: string,
    segmentId: string,
    request: DashboardUpdatePromotionSegmentRequest
  ): Promise<DashboardCampaignSegment> {
    const startedAt = Date.now();
    log.assignContext({ projectId, promotionId, segmentId });
    log.info("started", { projectId, promotionId, segmentId, request });
    const response = await this.campaignReader.updatePromotionSegment(
      projectId,
      promotionId,
      segmentId,
      request
    );

    log.info("completed", { response, durationMs: durationMs(startedAt) });
    return response;
  }

  @LogContextScope()
  @Transactional()
  async stopPromotionSegment(
    projectId: string,
    promotionId: string,
    segmentId: string
  ): Promise<DashboardDeletePromotionSegmentResult> {
    const startedAt = Date.now();
    log.assignContext({ projectId, promotionId, segmentId });
    log.info("started", { projectId, promotionId, segmentId });
    const response = await this.campaignReader.stopPromotionSegment(
      projectId,
      promotionId,
      segmentId
    );

    log.info("completed", { response, durationMs: durationMs(startedAt) });
    return response;
  }

  @LogContextScope()
  async promotionSegmentSuggestions(
    projectId: string,
    promotionId: string,
    analysisId?: string | null
  ): Promise<DashboardPromotionSegmentSuggestionList> {
    const startedAt = Date.now();
    log.assignContext({ analysisId, projectId, promotionId });
    log.info("started", { projectId, promotionId, analysisId });
    const response = await this.campaignReader.listPromotionSegmentSuggestions(
      projectId,
      promotionId,
      analysisId
    );

    log.info("completed", { response, durationMs: durationMs(startedAt) });
    return response;
  }

  @LogContextScope()
  async promotionSegmentAssistantSourceContext(
    projectId: string,
    promotionId: string,
    suggestionId: string
  ): Promise<DashboardSegmentAssistantSourceContext> {
    const startedAt = Date.now();
    log.assignContext({ projectId, promotionId, suggestionId });
    log.info("started", { projectId, promotionId, suggestionId });
    await this.campaignReader.getPromotionSummary(projectId, promotionId);
    const source = await this.resolveSegmentAssistantSource(projectId, promotionId, suggestionId);
    const candidates = await this.segmentQueryRepository.analyzeSourceRefinements(
      projectId,
      source
    );
    const suggestedRefinements = selectSourceRefinementCandidates(
      candidates,
      source.base_user_ids.length,
      MIN_SEGMENT_USER_COUNT
    ).map((candidate) => ({
      refinement_key: candidate.key,
      label: candidate.condition.label,
      prompt: candidate.prompt,
      estimated_user_count: candidate.sampleSize,
      retention_ratio: roundRate(candidate.sampleSize / source.base_user_ids.length),
      meets_min_sample_size: candidate.sampleSize >= MIN_SEGMENT_USER_COUNT
    }));
    const response: DashboardSegmentAssistantSourceContext = {
      suggestion_id: source.suggestion_id,
      segment_id: source.segment_id,
      title: source.title,
      strategy_role: source.strategy_role,
      candidate_type: source.candidate_type,
      sample_size: source.base_user_ids.length,
      base_condition_labels: source.base_condition_labels,
      reference_labels: source.reference_labels,
      suggested_refinements: suggestedRefinements
    };
    log.info("completed", {
      candidateType: source.candidate_type,
      durationMs: durationMs(startedAt),
      refinementCount: suggestedRefinements.length,
      sampleSize: response.sample_size
    });
    return response;
  }

  private async resolveSegmentAssistantSource(
    projectId: string,
    promotionId: string,
    suggestionId: string
  ): Promise<ResolvedSegmentAssistantSource> {
    const suggestions = await this.campaignReader.listPromotionSegmentSuggestions(
      projectId,
      promotionId
    );
    const suggestion = suggestions.suggestions.find((item) => item.suggestion_id === suggestionId);
    if (!suggestion) {
      throw dashboardErrors.segmentAssistantSourceInvalid();
    }

    const rule = jsonObject(suggestion.rule_json);
    const audienceSpec = jsonObject(rule?.segment_audience_spec);
    const audienceParameters = jsonObject(audienceSpec?.parameters);
    const candidateType = nonEmptyString(rule?.candidate_type);
    const legacyBaseUserIds = canonicalSourceUserIds(rule?.candidate_user_ids);
    const hardPredicateKeys = canonicalStringArray(audienceSpec?.hard_predicate_keys);
    if (!rule || !audienceSpec || !candidateType) {
      throw dashboardErrors.segmentAssistantSourceInvalid();
    }

    const baseUserIds = suggestion.audience_snapshot_id
      ? canonicalSourceUserIds(
          await this.campaignReader.listPromotionSegmentSuggestionAudienceMemberIds(
            projectId,
            promotionId,
            suggestionId
          )
        )
      : legacyBaseUserIds;
    if (baseUserIds.length === 0) {
      throw dashboardErrors.segmentAssistantSourceInvalid();
    }

    const referenceLabels = suggestion.display_copy?.signal_chips ?? [];
    return {
      suggestion_id: suggestion.suggestion_id,
      segment_id: suggestion.segment_id,
      candidate_type: candidateType,
      title: suggestion.display_copy?.title ?? suggestion.segment_name,
      strategy_role:
        suggestion.display_copy?.strategy_role ?? suggestion.display_copy?.rank_role ?? null,
      base_condition_labels: sourceBaseConditionLabels(hardPredicateKeys),
      hard_predicate_keys: hardPredicateKeys,
      destination_ids: canonicalStringArray(audienceParameters?.destination_ids),
      reference_labels: referenceLabels,
      base_conditions: buildSourceEditableConditions(hardPredicateKeys, referenceLabels),
      base_user_ids: baseUserIds
    };
  }

  @LogContextScope()
  async recommendPromotionSegments(
    projectId: string,
    promotionId: string,
    request: DashboardRecommendPromotionSegmentsRequest
  ): Promise<DashboardPromotionAnalysisResult> {
    const startedAt = Date.now();
    log.assignContext({ projectId, promotionId });
    log.info("started", {
      hasOperatorInstruction: Boolean(request.operator_instruction),
      operatorInstructionLength: request.operator_instruction?.length ?? 0,
      hasSegmentInstruction: Boolean(request.segment_instruction),
      segmentInstructionLength: request.segment_instruction?.length ?? 0
    });
    const promotion = await this.campaignReader.getPromotionSummary(projectId, promotionId);
    log.assignContext({ campaignId: promotion.campaign_id });
    log.info("promotion_loaded", {
      channel: promotion.channel,
      goalMetric: promotion.goal_metric,
      status: promotion.status
    });
    const response = await this.decisionClient.recommendPromotionSegments({
      campaignId: promotion.campaign_id,
      projectId,
      promotionId,
      request
    });

    log.info("completed", {
      analysisId: response.analysis_id,
      status: response.status,
      durationMs: durationMs(startedAt)
    });
    return response;
  }

  @LogContextScope()
  async analyzePromotionSegments(
    projectId: string,
    promotionId: string,
    request: DashboardAnalyzePromotionSegmentsRequest
  ): Promise<DashboardPromotionAnalysisResult> {
    const startedAt = Date.now();
    log.assignContext({ projectId, promotionId });
    log.info("started", {
      hasOperatorInstruction: Boolean(request.operator_instruction),
      operatorInstructionLength: request.operator_instruction?.length ?? 0,
      selectedSegmentCount: request.segment_ids.length
    });
    const promotion = await this.campaignReader.getPromotionSummary(projectId, promotionId);
    log.assignContext({ campaignId: promotion.campaign_id });
    log.info("promotion_loaded", {
      channel: promotion.channel,
      goalMetric: promotion.goal_metric,
      status: promotion.status
    });
    const response = await this.decisionClient.analyzePromotionSegments({
      campaignId: promotion.campaign_id,
      projectId,
      promotionId,
      request
    });

    log.info("completed", {
      analysisId: response.analysis_id,
      status: response.status,
      durationMs: durationMs(startedAt)
    });
    return response;
  }

  @LogContextScope()
  async startPromotionGeneration(
    projectId: string,
    promotionId: string,
    request: DashboardStartPromotionGenerationRequest
  ): Promise<DashboardStartPromotionGenerationResult> {
    const startedAt = Date.now();
    log.assignContext({ analysisId: request.analysis_id, projectId, promotionId });
    log.info("started", { projectId, promotionId, request });
    const promotion = await this.campaignReader.getPromotionSummary(projectId, promotionId);
    log.assignContext({ campaignId: promotion.campaign_id });
    if (request.segment_id) {
      await this.campaignReader.ensurePromotionTargetSegmentApproved(
        projectId,
        promotionId,
        request.analysis_id,
        request.segment_id
      );
    }
    log.info("promotion_loaded", { promotion });
    const existingGeneration = await this.campaignReader.getPromotionGenerationResult(
      projectId,
      promotionId,
      request.analysis_id,
      request.segment_id
    );

    const completedWithoutCandidates =
      existingGeneration?.status === "completed" &&
      existingGeneration.content_candidate_count === 0;

    if (
      existingGeneration &&
      existingGeneration.status !== "failed" &&
      !completedWithoutCandidates
    ) {
      log.info("promotion_generation_reused", { existingGeneration });
      log.info("completed", { response: existingGeneration, durationMs: durationMs(startedAt) });
      return existingGeneration;
    }

    if (existingGeneration) {
      log.info("promotion_generation_retrying", { existingGeneration });
    }

    const response = await this.decisionClient.startPromotionGeneration({
      campaignId: promotion.campaign_id,
      projectId,
      promotionId,
      request
    });

    log.info("completed", { response, durationMs: durationMs(startedAt) });
    return response;
  }

  @LogContextScope()
  async promotionScopedSegmentDefinitions(
    projectId: string,
    promotionId: string
  ): Promise<DashboardPromotionScopedSegmentDefinitionList> {
    const startedAt = Date.now();
    log.assignContext({ projectId, promotionId });
    log.info("started", { projectId, promotionId });
    const response = await this.campaignReader.listPromotionScopedSegmentDefinitions(
      projectId,
      promotionId
    );

    log.info("completed", { response, durationMs: durationMs(startedAt) });
    return response;
  }

  @LogContextScope()
  @Transactional()
  async createPromotionScopedSegmentDefinition(
    projectId: string,
    promotionId: string,
    request: DashboardCreatePromotionSegmentDefinitionRequest
  ): Promise<DashboardPromotionScopedSegmentDefinition> {
    const startedAt = Date.now();
    log.assignContext({ projectId, promotionId });
    log.info("started", { projectId, promotionId, request });
    const response = await this.campaignReader.createPromotionScopedSegmentDefinition(
      projectId,
      promotionId,
      request
    );
    log.assignContext({ segmentId: response.segment_id });

    log.info("completed", { response, durationMs: durationMs(startedAt) });
    return response;
  }

  @LogContextScope()
  @Transactional()
  async archivePromotionScopedSegmentDefinition(
    projectId: string,
    promotionId: string,
    segmentId: string
  ): Promise<DashboardArchivePromotionScopedSegmentDefinitionResult> {
    const startedAt = Date.now();
    log.assignContext({ projectId, promotionId, segmentId });
    log.info("started", { projectId, promotionId, segmentId });
    const response = await this.campaignReader.archivePromotionScopedSegmentDefinition(
      projectId,
      promotionId,
      segmentId
    );

    log.info("completed", { response, durationMs: durationMs(startedAt) });
    return response;
  }

  @LogContextScope()
  @Transactional()
  async decidePromotionSegmentSuggestion(
    projectId: string,
    promotionId: string,
    suggestionId: string,
    request: DashboardDecideSegmentSuggestionRequest
  ): Promise<DashboardPromotionSegmentSuggestion> {
    const startedAt = Date.now();
    log.assignContext({ projectId, promotionId, suggestionId });
    log.info("started", { projectId, promotionId, suggestionId, request });
    const response = await this.campaignReader.decidePromotionSegmentSuggestion(
      projectId,
      promotionId,
      suggestionId,
      request
    );

    log.info("completed", { response, durationMs: durationMs(startedAt) });
    return response;
  }

  @LogContextScope()
  async confirmPromotionSegmentSuggestions(
    projectId: string,
    promotionId: string,
    request: DashboardConfirmSegmentSuggestionsRequest
  ): Promise<DashboardConfirmSegmentSuggestionsResult> {
    const startedAt = Date.now();
    log.assignContext({ projectId, promotionId });
    log.info("started", {
      directSegmentCount: request.segment_ids.length,
      selectedSuggestionCount: request.suggestion_ids.length
    });

    const sourceAnalysisId = request.analysis_id;
    if (request.suggestion_ids.length > 0 && !sourceAnalysisId) {
      log.warn("segment_audience_source_batch_mismatch", {
        selectedSuggestionCount: request.suggestion_ids.length
      });
      throw dashboardErrors.decisionRequestFailed({
        detail: {
          code: "segment_audience_source_batch_mismatch",
          reason: "AI 고객군 후보의 추천 회차를 확인할 수 없어요."
        },
        status: 409
      });
    }

    const selectedSuggestions = sourceAnalysisId
      ? (
          await this.campaignReader.listPromotionSegmentSuggestions(
            projectId,
            promotionId,
            sourceAnalysisId
          )
        ).suggestions.filter((suggestion) =>
          request.suggestion_ids.includes(suggestion.suggestion_id)
        )
      : [];
    const validSelection =
      selectedSuggestions.length === request.suggestion_ids.length &&
      selectedSuggestions.every(
        (suggestion) =>
          suggestion.analysis_id === sourceAnalysisId &&
          (suggestion.suggestion_status === "accepted" ||
            suggestion.suggestion_status === "confirmed")
      );
    if (!validSelection) {
      log.warn("segment_suggestion_selection_invalid", {
        requestedSuggestionCount: request.suggestion_ids.length,
        resolvedSuggestionCount: selectedSuggestions.length
      });
      throw dashboardErrors.segmentSuggestionSelectionInvalid();
    }

    const selectedDirectSegmentIds = new Set(request.segment_ids);
    const scopedSegments =
      selectedDirectSegmentIds.size > 0
        ? await this.campaignReader.listPromotionScopedSegmentDefinitions(projectId, promotionId)
        : { segments: [] };
    const selectedDirectSegments = scopedSegments.segments.filter((segment) =>
      selectedDirectSegmentIds.has(segment.segment_id)
    );
    if (selectedDirectSegments.length !== selectedDirectSegmentIds.size) {
      log.warn("segment_suggestion_selection_invalid", {
        invalidDirectSegmentCount: selectedDirectSegmentIds.size - selectedDirectSegments.length,
        selectedDirectSegmentCount: selectedDirectSegmentIds.size
      });
      throw dashboardErrors.segmentSuggestionSelectionInvalid();
    }

    const v2SuggestionCount = selectedSuggestions.filter(
      (suggestion) => suggestion.audience_snapshot_id !== null
    ).length;
    const v2DirectSegmentCount = selectedDirectSegments.filter(
      (segment) => segment.rule_json.audience_resolution_contract === "segment_audience.v1"
    ).length;
    const totalSelectedCount = selectedSuggestions.length + selectedDirectSegments.length;
    const totalV2Count = v2SuggestionCount + v2DirectSegmentCount;
    if (totalSelectedCount === 0) {
      log.warn("segment_suggestion_selection_empty");
      throw dashboardErrors.segmentSuggestionSelectionInvalid();
    }
    if (totalV2Count === 0) {
      const response = await this.campaignReader.confirmLegacyPromotionSegments(
        projectId,
        promotionId,
        request
      );

      log.info("completed", { response, durationMs: durationMs(startedAt) });
      return response;
    }
    if (totalV2Count !== totalSelectedCount) {
      log.warn("segment_audience_contract_mixed", {
        totalSelectedCount,
        totalV2Count
      });
      throw dashboardErrors.decisionRequestFailed({
        detail: {
          code: "segment_audience_contract_mixed",
          reason: "기존 방식과 새 방식의 고객군 후보를 함께 확정할 수 없어요."
        },
        status: 409
      });
    }

    const promotion = await this.campaignReader.getPromotionSummary(projectId, promotionId);
    const segmentIds = [
      ...new Set([
        ...selectedSuggestions.map((suggestion) => suggestion.segment_id),
        ...selectedDirectSegments.map((segment) => segment.segment_id)
      ])
    ].sort((left, right) => left.localeCompare(right));
    log.assignContext({ campaignId: promotion.campaign_id });
    const analysis = await this.decisionClient.analyzePromotionSegments({
      campaignId: promotion.campaign_id,
      projectId,
      promotionId,
      request: { operator_instruction: null, segment_ids: segmentIds }
    });
    const returnedSegmentIds = analysis.target_segments
      .map((segment) => segment.segment_id)
      .sort((left, right) => left.localeCompare(right));
    const hasCompleteV2Targets =
      returnedSegmentIds.length === segmentIds.length &&
      returnedSegmentIds.every((segmentId, index) => segmentId === segmentIds[index]) &&
      analysis.target_segments.every(
        (target) => target.audience_snapshot_id != null && target.final_audience_count != null
      );
    if (!hasCompleteV2Targets) {
      log.warn("segment_audience_confirmation_incomplete", {
        requestedSegmentCount: segmentIds.length,
        returnedSegmentCount: returnedSegmentIds.length
      });
      throw dashboardErrors.decisionRequestFailed({
        detail: {
          code: "segment_audience_confirmation_incomplete",
          reason: "Decision에서 최종 고객군 배정 정보를 완성하지 못했어요."
        },
        status: 502
      });
    }

    log.assignContext({ analysisId: analysis.analysis_id });
    const confirmedSuggestionCount =
      request.suggestion_ids.length > 0 && sourceAnalysisId
        ? await this.campaignReader.confirmV2PromotionSegmentSuggestions({
            confirmationAnalysisId: analysis.analysis_id,
            confirmedBy: request.confirmed_by ?? null,
            projectId,
            promotionId,
            sourceAnalysisId,
            suggestionIds: request.suggestion_ids
          })
        : 0;
    if (confirmedSuggestionCount !== request.suggestion_ids.length) {
      log.warn("segment_suggestion_confirmation_mismatch", {
        confirmedSuggestionCount,
        selectedSuggestionCount: request.suggestion_ids.length
      });
      throw dashboardErrors.segmentSuggestionSelectionInvalid();
    }
    const response: DashboardConfirmSegmentSuggestionsResult = {
      analysis_id: analysis.analysis_id,
      confirmed_segment_count: segmentIds.length,
      promotion_id: analysis.promotion_id,
      status: "confirmed",
      target_segments: analysis.target_segments.map((target) => ({
        audience_snapshot_id: target.audience_snapshot_id ?? null,
        audience_status: target.audience_status ?? null,
        final_audience_count: target.final_audience_count ?? null,
        meets_min_sample_size: target.meets_min_sample_size ?? null,
        segment_id: target.segment_id,
        targetable: target.targetable ?? null
      }))
    };

    log.info("completed", { response, durationMs: durationMs(startedAt) });
    return response;
  }

  @LogContextScope()
  @Transactional()
  async startNextLoopAnalysis(
    projectId: string,
    promotionId: string,
    request: DashboardStartNextLoopRequest
  ): Promise<DashboardNextLoopAnalysis> {
    const startedAt = Date.now();
    log.assignContext({ projectId, promotionId });
    log.info("started", { projectId, promotionId, request });
    const response = await this.campaignReader.startNextLoopAnalysis(
      projectId,
      promotionId,
      request
    );

    log.info("completed", { response, durationMs: durationMs(startedAt) });
    return response;
  }

  @LogContextScope()
  @Transactional()
  async approveContentCandidate(
    projectId: string,
    promotionId: string,
    segmentId: string,
    contentId: string,
    request: DashboardApproveContentCandidateRequest
  ): Promise<DashboardApproveContentCandidateResult> {
    const startedAt = Date.now();
    log.assignContext({ contentId, projectId, promotionId, segmentId });
    log.info("started", { projectId, promotionId, segmentId, contentId, request });
    const response = await this.campaignReader.approveContentCandidate(
      projectId,
      promotionId,
      segmentId,
      contentId,
      request
    );

    log.info("completed", { response, durationMs: durationMs(startedAt) });
    return response;
  }

  @LogContextScope()
  @Transactional()
  async unapproveContentCandidate(
    projectId: string,
    promotionId: string,
    segmentId: string,
    contentId: string,
    request: DashboardUnapproveContentCandidateRequest
  ): Promise<DashboardUnapproveContentCandidateResult> {
    const startedAt = Date.now();
    log.assignContext({ contentId, projectId, promotionId, segmentId });
    log.info("started", { projectId, promotionId, segmentId, contentId, request });
    const response = await this.campaignReader.unapproveContentCandidate(
      projectId,
      promotionId,
      segmentId,
      contentId,
      request
    );

    log.info("completed", { response, durationMs: durationMs(startedAt) });
    return response;
  }

  @LogContextScope()
  async updateContentCandidateCopy(
    projectId: string,
    promotionId: string,
    segmentId: string,
    contentId: string,
    request: DashboardUpdateContentCandidateCopyRequest,
    publicOrigin: string
  ): Promise<DashboardUpdateContentCandidateCopyResult> {
    const startedAt = Date.now();
    log.assignContext({ contentId, projectId, promotionId, segmentId });
    log.info("started", { projectId, promotionId, segmentId, contentId });
    const candidate = await this.campaignReader.getContentCandidate(
      projectId,
      promotionId,
      segmentId,
      contentId
    );
    if (candidate.status !== "draft") {
      log.warn("content_candidate_not_editable", { status: candidate.status });
      throw dashboardErrors.contentCandidateNotEditable();
    }

    const creative = editableCreative(candidate);
    if (!creative) {
      log.warn("content_candidate_not_editable", { reason: "creative_missing" });
      throw dashboardErrors.contentCandidateNotEditable();
    }

    const sourceHtml = await readContentCandidateHtml(creative);
    const previousCopy = contentCandidateCopy(candidate);
    const rewritten = rewriteCreativeHtmlCopy(sourceHtml, previousCopy, request);
    if (rewritten.missingFields.length > 0) {
      log.warn("content_candidate_copy_not_found", {
        missingFields: rewritten.missingFields
      });
      throw dashboardErrors.contentCandidateCopyNotFound();
    }

    const revision = contentCandidateHtmlRevision(rewritten.html);
    const htmlUrl = contentCandidateHtmlUrl({
      contentId,
      origin: publicOrigin,
      projectId,
      promotionId,
      revision,
      segmentId
    });
    const { metadataJson } = editedCreativeMetadata({
      candidate,
      creative,
      html: rewritten.html,
      htmlUrl
    });
    const response = await this.campaignReader.updateContentCandidateCopy(
      projectId,
      promotionId,
      segmentId,
      contentId,
      request,
      metadataJson,
      htmlUrl,
      { copy: previousCopy, metadataJson: candidate.metadata_json }
    );
    if (!response) {
      log.warn("content_candidate_html_revision_conflict", { revisionMode: "copy" });
      throw dashboardErrors.contentCandidateHtmlRevisionConflict();
    }

    log.info("completed", { response, durationMs: durationMs(startedAt) });
    return response;
  }

  @LogContextScope()
  async reviseContentCandidateHtml(
    projectId: string,
    promotionId: string,
    segmentId: string,
    contentId: string,
    request: DashboardReviseContentCandidateHtmlRequest,
    publicOrigin: string
  ): Promise<DashboardReviseContentCandidateHtmlResult> {
    const startedAt = Date.now();
    log.assignContext({ contentId, projectId, promotionId, segmentId });
    log.info("started", {
      contentId,
      feedbackLength: request.feedback.length,
      projectId,
      promotionId,
      segmentId
    });
    const candidate = await this.campaignReader.getContentCandidate(
      projectId,
      promotionId,
      segmentId,
      contentId
    );
    if (candidate.status !== "draft") {
      log.warn("content_candidate_not_editable", { status: candidate.status });
      throw dashboardErrors.contentCandidateNotEditable();
    }

    const creative = editableCreative(candidate);
    if (!creative) {
      log.warn("content_candidate_not_editable", { reason: "creative_missing" });
      throw dashboardErrors.contentCandidateNotEditable();
    }
    if (!this.creativeRevisionAgent) {
      log.warn("content_candidate_html_revision_unavailable", {
        reason: "revision_agent_unavailable"
      });
      throw dashboardErrors.contentCandidateHtmlRevisionFailed();
    }

    const sourceHtml = await readContentCandidateHtml(creative);
    if (Buffer.byteLength(sourceHtml) > AI_CREATIVE_HTML_INPUT_LIMIT_BYTES) {
      log.warn("content_candidate_html_revision_invalid", {
        inputHtmlBytes: Buffer.byteLength(sourceHtml),
        reason: "input_size_exceeded"
      });
      throw dashboardErrors.contentCandidateHtmlRevisionInvalid();
    }

    const currentCopy = contentCandidateCopy(candidate);
    const revisionInput = {
      ...currentCopy,
      channel: candidate.channel,
      feedback: request.feedback,
      html: sourceHtml
    };
    let plan;
    try {
      plan = await this.creativeRevisionAgent.planPatch(revisionInput);
    } catch (error) {
      log.warn("content_candidate_html_revision_failed", {
        err: error,
        revisionMode: "patch"
      });
      throw dashboardErrors.contentCandidateHtmlRevisionFailed(error);
    }

    let nextCopy = {
      body: plan.body,
      cta: plan.cta,
      headline: plan.headline
    };
    let changeSummary = plan.change_summary;
    let revisedHtml: string | undefined;
    let fallbackReason =
      plan.strategy === "full_revision" ? "model_requested_full_revision" : undefined;
    let patchError: unknown;
    if (plan.strategy === "patch") {
      try {
        const patchedHtml = applyCreativeHtmlReplacementPatch(sourceHtml, plan.replacements);
        revisedHtml = sanitizeCreativeHtmlRevision({
          copy: nextCopy,
          revisedHtml: patchedHtml,
          sourceHtml
        });
      } catch (error) {
        patchError = error;
        fallbackReason = "patch_validation_failed";
      }
    }

    let revisionMode: "full_fallback" | "patch" = "patch";
    if (!revisedHtml) {
      log.warn("content_candidate_html_revision_patch_fallback", {
        err: patchError,
        fallbackReason,
        operationCount: plan.replacements.length
      });
      let fullRevision;
      try {
        fullRevision = await this.creativeRevisionAgent.revise(revisionInput);
      } catch (error) {
        log.warn("content_candidate_html_revision_failed", {
          err: error,
          fallbackReason,
          revisionMode: "full_fallback"
        });
        throw dashboardErrors.contentCandidateHtmlRevisionFailed(error);
      }
      nextCopy = {
        body: fullRevision.body,
        cta: fullRevision.cta,
        headline: fullRevision.headline
      };
      changeSummary = fullRevision.change_summary;
      try {
        revisedHtml = sanitizeCreativeHtmlRevision({
          copy: nextCopy,
          revisedHtml: fullRevision.html,
          sourceHtml
        });
      } catch (error) {
        log.warn("content_candidate_html_revision_invalid", {
          err: error,
          fallbackReason,
          outputHtmlBytes: Buffer.byteLength(fullRevision.html),
          revisionMode: "full_fallback"
        });
        throw dashboardErrors.contentCandidateHtmlRevisionInvalid(error);
      }
      revisionMode = "full_fallback";
    }

    const htmlRevision = contentCandidateHtmlRevision(revisedHtml);
    const htmlUrl = contentCandidateHtmlUrl({
      contentId,
      origin: publicOrigin,
      projectId,
      promotionId,
      revision: htmlRevision,
      segmentId
    });
    const { metadataJson } = editedCreativeMetadata({
      candidate,
      creative,
      html: revisedHtml,
      htmlUrl
    });
    const saved = await this.campaignReader.updateContentCandidateCopy(
      projectId,
      promotionId,
      segmentId,
      contentId,
      nextCopy,
      metadataJson,
      htmlUrl,
      { copy: currentCopy, metadataJson: candidate.metadata_json }
    );
    if (!saved) {
      log.warn("content_candidate_html_revision_conflict", { revisionMode });
      throw dashboardErrors.contentCandidateHtmlRevisionConflict();
    }
    const response = { ...saved, change_summary: changeSummary };

    log.info("completed", {
      changeSummaryLength: changeSummary.length,
      durationMs: durationMs(startedAt),
      fallbackReason,
      operationCount: plan.replacements.length,
      outputHtmlBytes: Buffer.byteLength(revisedHtml),
      revisionMode,
      status: saved.status
    });
    return response;
  }

  @LogContextScope()
  async contentCandidateHtmlSource(
    projectId: string,
    promotionId: string,
    segmentId: string,
    contentId: string
  ): Promise<DashboardContentCandidateHtmlSource> {
    const startedAt = Date.now();
    log.assignContext({ contentId, projectId, promotionId, segmentId });
    log.info("started");
    const candidate = await this.campaignReader.getContentCandidate(
      projectId,
      promotionId,
      segmentId,
      contentId
    );
    const creative = editableCreative(candidate);
    if (!creative) {
      log.warn("content_candidate_not_editable", { reason: "creative_missing" });
      throw dashboardErrors.contentCandidateNotEditable();
    }

    const html = await readContentCandidateHtml(creative);
    const response = {
      html,
      revision: contentCandidateHtmlRevision(html),
      updated_at: candidate.updated_at
    };
    log.info("completed", {
      durationMs: durationMs(startedAt),
      htmlBytes: Buffer.byteLength(html),
      revision: response.revision
    });
    return response;
  }

  @LogContextScope()
  async previewContentCandidateHtml(
    projectId: string,
    promotionId: string,
    segmentId: string,
    contentId: string,
    request: DashboardPreviewContentCandidateHtmlRequest
  ): Promise<DashboardPreviewContentCandidateHtmlResult> {
    const startedAt = Date.now();
    log.assignContext({ contentId, projectId, promotionId, segmentId });
    log.info("started", { inputHtmlBytes: Buffer.byteLength(request.html) });
    const candidate = await this.campaignReader.getContentCandidate(
      projectId,
      promotionId,
      segmentId,
      contentId
    );
    const creative = editableCreative(candidate);
    if (!creative) {
      log.warn("content_candidate_not_editable", { reason: "creative_missing" });
      throw dashboardErrors.contentCandidateNotEditable();
    }

    const sourceHtml = await readContentCandidateHtml(creative);
    let html: string;
    try {
      html = sanitizeCreativeHtmlRevision({
        copy: contentCandidateCopy(candidate),
        revisedHtml: request.html,
        sourceHtml
      });
    } catch (error) {
      log.warn("content_candidate_html_revision_invalid", {
        err: error,
        inputHtmlBytes: Buffer.byteLength(request.html),
        revisionMode: "preview"
      });
      throw dashboardErrors.contentCandidateHtmlRevisionInvalid(error);
    }

    log.info("completed", {
      durationMs: durationMs(startedAt),
      outputHtmlBytes: Buffer.byteLength(html),
      revisionMode: "preview"
    });
    return { html };
  }

  @LogContextScope()
  async saveContentCandidateHtml(
    projectId: string,
    promotionId: string,
    segmentId: string,
    contentId: string,
    request: DashboardSaveContentCandidateHtmlRequest,
    publicOrigin: string
  ): Promise<DashboardSaveContentCandidateHtmlResult> {
    const startedAt = Date.now();
    log.assignContext({ contentId, projectId, promotionId, segmentId });
    log.info("started", {
      baseRevision: request.base_revision,
      inputHtmlBytes: Buffer.byteLength(request.html)
    });
    const candidate = await this.campaignReader.getContentCandidate(
      projectId,
      promotionId,
      segmentId,
      contentId
    );
    if (candidate.status !== "draft") {
      log.warn("content_candidate_not_editable", { status: candidate.status });
      throw dashboardErrors.contentCandidateNotEditable();
    }

    const creative = editableCreative(candidate);
    if (!creative) {
      log.warn("content_candidate_not_editable", { reason: "creative_missing" });
      throw dashboardErrors.contentCandidateNotEditable();
    }

    const sourceHtml = await readContentCandidateHtml(creative);
    const currentRevision = contentCandidateHtmlRevision(sourceHtml);
    if (request.base_revision !== currentRevision) {
      log.warn("content_candidate_html_revision_conflict", {
        baseRevision: request.base_revision,
        currentRevision,
        revisionMode: "manual_html"
      });
      throw dashboardErrors.contentCandidateHtmlRevisionConflict();
    }

    const copy = contentCandidateCopy(candidate);
    let html: string;
    try {
      html = sanitizeCreativeHtmlRevision({
        copy,
        revisedHtml: request.html,
        sourceHtml
      });
    } catch (error) {
      log.warn("content_candidate_html_revision_invalid", {
        err: error,
        inputHtmlBytes: Buffer.byteLength(request.html),
        revisionMode: "manual_html"
      });
      throw dashboardErrors.contentCandidateHtmlRevisionInvalid(error);
    }

    const revision = contentCandidateHtmlRevision(html);
    const htmlUrl = contentCandidateHtmlUrl({
      contentId,
      origin: publicOrigin,
      projectId,
      promotionId,
      revision,
      segmentId
    });
    const { metadataJson } = editedCreativeMetadata({
      candidate,
      creative,
      html,
      htmlUrl
    });
    const saved = await this.campaignReader.updateContentCandidateCopy(
      projectId,
      promotionId,
      segmentId,
      contentId,
      copy,
      metadataJson,
      htmlUrl,
      { copy, metadataJson: candidate.metadata_json }
    );
    if (!saved) {
      log.warn("content_candidate_html_revision_conflict", {
        baseRevision: request.base_revision,
        revisionMode: "manual_html"
      });
      throw dashboardErrors.contentCandidateHtmlRevisionConflict();
    }

    log.info("completed", {
      durationMs: durationMs(startedAt),
      outputHtmlBytes: Buffer.byteLength(html),
      revision,
      revisionMode: "manual_html"
    });
    return { ...saved, html, revision };
  }

  @LogContextScope()
  async contentCandidateHtml(
    projectId: string,
    promotionId: string,
    segmentId: string,
    contentId: string
  ): Promise<string> {
    const startedAt = Date.now();
    log.assignContext({ contentId, projectId, promotionId, segmentId });
    log.info("started");
    const candidate = await this.campaignReader.getContentCandidate(
      projectId,
      promotionId,
      segmentId,
      contentId
    );
    const creative = editableCreative(candidate);
    if (!creative?.editedHtml) {
      log.warn("content_candidate_html_not_found", { reason: "edited_html_missing" });
      throw dashboardErrors.contentCandidateHtmlUnavailable();
    }

    log.info("completed", {
      durationMs: durationMs(startedAt),
      response: { htmlBytes: Buffer.byteLength(creative.editedHtml) }
    });
    return creative.editedHtml;
  }

  @LogContextScope()
  async createPromotionRun(
    projectId: string,
    promotionId: string,
    request: DashboardCreatePromotionRunRequest
  ): Promise<DashboardCreatePromotionRunResult> {
    const startedAt = Date.now();
    log.assignContext({
      analysisId: request.analysis_id,
      generationId: request.generation_id,
      projectId,
      promotionId,
      segmentIds: request.segment_ids
    });
    log.info("started", { projectId, promotionId, request });
    const response = await this.decisionClient.createPromotionRun({
      promotionId,
      request
    });
    log.assignContext({
      campaignId: response.campaign_id,
      promotionRunId: response.promotion_run_id
    });

    log.info("completed", { response, durationMs: durationMs(startedAt) });
    return response;
  }

  @LogContextScope()
  async buildPromotionRunAssignments(
    projectId: string,
    promotionRunId: string
  ): Promise<DashboardBuildPromotionRunAssignmentsResult> {
    const startedAt = Date.now();
    log.assignContext({ projectId, promotionRunId });
    log.info("started", { projectId, promotionRunId });
    const response = await this.decisionClient.buildPromotionRunSegmentAssignments({
      projectId,
      promotionRunId
    });
    const activation = this.promotionAutomationRepository
      ? await this.promotionAutomationRepository.scheduleRunLaunch(projectId, promotionRunId)
      : { activationStatus: "manual_start_required" as const, scheduledStartAt: null };
    const result: DashboardBuildPromotionRunAssignmentsResult = {
      ...response,
      activation_status: activation.activationStatus,
      scheduled_start_at: activation.scheduledStartAt
    };

    log.info("completed", {
      activationStatus: result.activation_status,
      durationMs: durationMs(startedAt),
      response: result,
      scheduledStartAt: result.scheduled_start_at
    });
    return result;
  }

  @LogContextScope()
  async evaluateAdExperiment(
    projectId: string,
    promotionId: string,
    segmentId: string,
    adExperimentId: string
  ): Promise<DashboardEvaluateAdExperimentResult> {
    const startedAt = Date.now();
    log.assignContext({ adExperimentId, projectId, promotionId, segmentId });
    log.info("started", { adExperimentId, projectId, promotionId, segmentId });
    const experiment = await this.campaignReader.findAdExperiment(
      projectId,
      promotionId,
      segmentId,
      adExperimentId
    );
    if (!experiment || experiment.is_fallback) {
      log.warn("ad_experiment_not_found");
      throw dashboardErrors.adExperimentNotFound();
    }

    log.assignContext({ promotionRunId: experiment.promotion_run_id });
    await this.campaignReader.preparePromotionRunEvaluationCompatibility(
      projectId,
      experiment.promotion_run_id
    );
    const response = await this.decisionClient.evaluateAdExperiment({ adExperimentId });
    if (
      response.ad_experiment_id !== adExperimentId ||
      response.promotion_id !== promotionId ||
      response.promotion_run_id !== experiment.promotion_run_id ||
      response.segment_id !== segmentId
    ) {
      log.warn("ad_experiment_evaluation_scope_mismatch", { response });
      throw dashboardErrors.decisionRequestFailed();
    }

    log.info("completed", { response, durationMs: durationMs(startedAt) });
    return response;
  }

  @LogContextScope()
  async evaluatePromotionRun(
    projectId: string,
    promotionRunId: string
  ): Promise<DashboardEvaluatePromotionRunResult> {
    const startedAt = Date.now();
    log.assignContext({ projectId, promotionRunId });
    log.info("started", { projectId, promotionRunId });
    await this.promotionAutomationRepository?.cancelPendingRunEvaluation(promotionRunId);
    await this.campaignReader.preparePromotionRunEvaluationCompatibility(projectId, promotionRunId);
    const response = await this.decisionClient.evaluatePromotionRun({ promotionRunId });
    log.assignContext({ promotionId: response.promotion_id });
    await this.continueAutomaticPromotionLoop(projectId, promotionRunId, response);

    log.info("completed", { response, durationMs: durationMs(startedAt) });
    return response;
  }

  private async continueAutomaticPromotionLoop(
    projectId: string,
    promotionRunId: string,
    evaluation: DashboardEvaluatePromotionRunResult
  ) {
    if (!this.promotionAutomationRepository || !evaluation.next_loop_required) {
      return;
    }
    const config = await this.promotionAutomationRepository.getRunConfig(projectId, promotionRunId);
    if (config.executionMode !== "automatic") {
      return;
    }
    if (config.loopCount >= config.maxLoopCount) {
      log.info("automatic_next_loop_skipped", {
        loopCount: config.loopCount,
        maxLoopCount: config.maxLoopCount,
        reason: "max_loop_count_reached"
      });
      return;
    }
    if (config.scheduledEndAt && Date.parse(config.scheduledEndAt) <= Date.now()) {
      log.info("automatic_next_loop_skipped", { reason: "promotion_window_closed" });
      return;
    }

    const nextLoop = await this.decisionClient.createNextLoop({
      promotionRunId,
      request: {
        content_approval_mode: "automatic",
        failed_ad_experiment_ids: evaluation.failed_ad_experiment_ids,
        failed_segment_ids: evaluation.failed_segment_ids,
        operator_instruction: null
      }
    });
    if (nextLoop.status !== "activated" || !nextLoop.next_promotion_run_id) {
      throw new Error("Automatic next loop did not activate a promotion run.");
    }
    const assignment = await this.buildPromotionRunAssignments(
      projectId,
      nextLoop.next_promotion_run_id
    );
    log.info("automatic_next_loop_prepared", {
      activationStatus: assignment.activation_status,
      loopCount: nextLoop.loop_count,
      nextPromotionRunId: nextLoop.next_promotion_run_id
    });
  }

  @LogContextScope()
  async createNextLoop(
    projectId: string,
    promotionRunId: string,
    request: DashboardCreateNextLoopRequest
  ): Promise<DashboardCreateNextLoopResult> {
    const startedAt = Date.now();
    log.assignContext({ projectId, promotionRunId });
    log.info("started", { projectId, promotionRunId, request });
    const response = await this.decisionClient.createNextLoop({
      promotionRunId,
      request
    });
    log.assignContext({ nextPromotionRunId: response.next_promotion_run_id });

    log.info("completed", { response, durationMs: durationMs(startedAt) });
    return response;
  }

  @LogContextScope()
  @Transactional()
  async rejectContentCandidate(
    projectId: string,
    promotionId: string,
    segmentId: string,
    contentId: string,
    request: DashboardRejectContentCandidateRequest
  ): Promise<DashboardRejectContentCandidateResult> {
    const startedAt = Date.now();
    log.assignContext({ contentId, projectId, promotionId, segmentId });
    log.info("started", { projectId, promotionId, segmentId, contentId, request });
    const response = await this.campaignReader.rejectContentCandidate(
      projectId,
      promotionId,
      segmentId,
      contentId,
      request
    );

    log.info("completed", { response, durationMs: durationMs(startedAt) });
    return response;
  }

  @LogContextScope()
  @Transactional()
  async startAdExperiment(
    projectId: string,
    promotionId: string,
    adExperimentId: string
  ): Promise<DashboardStartAdExperimentResult> {
    const startedAt = Date.now();
    log.assignContext({ adExperimentId, projectId, promotionId });
    log.info("started", { projectId, promotionId, adExperimentId });
    const response = await this.campaignReader.startAdExperiment(
      projectId,
      promotionId,
      adExperimentId
    );

    log.info("completed", { response, durationMs: durationMs(startedAt) });
    return response;
  }

  @LogContextScope()
  async campaignDetail(projectId: string, campaignId: string): Promise<DashboardCampaignDetail> {
    const startedAt = Date.now();
    log.assignContext({ campaignId, projectId });
    log.info("started", { projectId, campaignId });
    const [detail, realtimeMetrics] = await Promise.all([
      this.campaignReader.getCampaignDetail(projectId, campaignId),
      this.funnelReader.getCampaignRealtimeMetrics(projectId, campaignId)
    ]);

    const response = {
      ...detail,
      realtime_metrics: realtimeMetrics
    };

    log.info("completed", { response, durationMs: durationMs(startedAt) });
    return response;
  }

  @LogContextScope()
  async promotionDetail(projectId: string, promotionId: string): Promise<DashboardPromotionDetail> {
    const startedAt = Date.now();
    log.assignContext({ projectId, promotionId });
    log.info("started", { projectId, promotionId });
    const detail = await this.campaignReader.getPromotionDetail(projectId, promotionId);
    const latestAnalysisId = detail.analyses[0]?.analysis_id;
    const [realtimeMetrics, segmentRealtimeSummaries, generation] = await Promise.all([
      this.funnelReader.getPromotionRealtimeMetrics(projectId, promotionId),
      this.funnelReader.getPromotionSegmentRealtimeSummaries(projectId, promotionId),
      latestAnalysisId
        ? this.campaignReader.getPromotionGenerationResult(projectId, promotionId, latestAnalysisId)
        : Promise.resolve(undefined)
    ]);

    const response = {
      ...detail,
      generation: generation ?? null,
      realtime_metrics: realtimeMetrics,
      segment_realtime_summaries: segmentRealtimeSummaries
    };

    log.info("completed", { response, durationMs: durationMs(startedAt) });
    return response;
  }

  @LogContextScope()
  async segmentDetail(
    projectId: string,
    promotionId: string,
    segmentId: string
  ): Promise<DashboardSegmentDetail> {
    const startedAt = Date.now();
    log.assignContext({ projectId, promotionId, segmentId });
    log.info("started", { projectId, promotionId, segmentId });
    const detailPromise = this.campaignReader.getSegmentDetail(projectId, promotionId, segmentId);
    const realtimeMetricsPromise = this.funnelReader.getSegmentRealtimeMetrics(
      projectId,
      promotionId,
      segmentId
    );
    const detail = await detailPromise;
    const [realtimeMetrics, generation] = await Promise.all([
      realtimeMetricsPromise,
      this.campaignReader.getPromotionGenerationResult(
        projectId,
        promotionId,
        detail.segment.analysis_id,
        segmentId
      )
    ]);

    const response = {
      ...detail,
      generation: generation ?? null,
      realtime_metrics: realtimeMetrics
    };

    log.info("completed", { response, durationMs: durationMs(startedAt) });
    return response;
  }

  @LogContextScope()
  async funnels(projectId: string): Promise<DashboardFunnelList> {
    const startedAt = Date.now();
    log.assignContext({ projectId });
    log.info("started", { projectId });
    const response = { funnels: await this.funnelReader.listFunnels(projectId) };

    log.info("completed", { response, durationMs: durationMs(startedAt) });
    return response;
  }

  @LogContextScope()
  async funnel(projectId: string, funnelId: string): Promise<DashboardFunnel> {
    const startedAt = Date.now();
    log.assignContext({ funnelId, projectId });
    log.info("started", { projectId, funnelId });
    const response = await this.funnelReader.getFunnel(projectId, funnelId);

    log.info("completed", { response, durationMs: durationMs(startedAt) });
    return response;
  }

  @LogContextScope()
  async eventCatalog(projectId: string): Promise<DashboardEventCatalog> {
    const startedAt = Date.now();
    log.assignContext({ projectId });
    log.info("started", { projectId });
    const response = { events: await this.funnelReader.listEventCatalog(projectId) };

    log.info("completed", { response, durationMs: durationMs(startedAt) });
    return response;
  }

  @LogContextScope()
  async funnelMetrics(
    projectId: string,
    funnelId: string,
    scope?: DashboardFunnelMetricsScope,
    dateRange: DashboardFunnelMetricsDateRange = "last-14-days"
  ): Promise<DashboardFunnelMetrics> {
    const startedAt = Date.now();
    log.assignContext({ funnelId, projectId });
    log.info("started", { projectId, funnelId, dateRange, scope });
    const response = await this.funnelReader.getFunnelMetrics(
      projectId,
      funnelId,
      scope,
      dateRange
    );

    log.info("completed", { response, durationMs: durationMs(startedAt) });
    return response;
  }

  @LogContextScope()
  async previewFunnelMetrics(
    projectId: string,
    request: DashboardFunnelPreviewRequest,
    dateRange: DashboardFunnelMetricsDateRange = "last-14-days"
  ): Promise<DashboardFunnelPreview> {
    const startedAt = Date.now();
    log.assignContext({ projectId });
    log.info("started", { projectId, request, dateRange });
    const response = await this.funnelReader.previewFunnelMetrics(projectId, request, dateRange);

    log.info("completed", { response, durationMs: durationMs(startedAt) });
    return response;
  }

  @LogContextScope()
  @Transactional()
  async createFunnel(
    projectId: string,
    request: DashboardCreateFunnelRequest
  ): Promise<DashboardFunnel> {
    const startedAt = Date.now();
    log.assignContext({ projectId });
    log.info("started", { projectId, request });
    const response = await this.funnelReader.createFunnel(projectId, request);
    log.assignContext({ funnelId: response.funnel_id });

    log.info("completed", { response, durationMs: durationMs(startedAt) });
    return response;
  }

  @LogContextScope()
  @Transactional()
  async updateFunnel(
    projectId: string,
    funnelId: string,
    request: DashboardUpdateFunnelRequest
  ): Promise<DashboardFunnel> {
    const startedAt = Date.now();
    log.assignContext({ funnelId, projectId });
    log.info("started", { projectId, funnelId, request });
    const response = await this.funnelReader.updateFunnel(projectId, funnelId, request);

    log.info("completed", { response, durationMs: durationMs(startedAt) });
    return response;
  }

  @LogContextScope()
  @Transactional()
  async deleteFunnel(projectId: string, funnelId: string): Promise<DashboardDeleteFunnelResult> {
    const startedAt = Date.now();
    log.assignContext({ funnelId, projectId });
    log.info("started", { projectId, funnelId });
    const response = await this.funnelReader.deleteFunnel(projectId, funnelId);

    log.info("completed", { response, durationMs: durationMs(startedAt) });
    return response;
  }

  @LogContextScope()
  @Transactional()
  async createSegmentQueryPreview(
    projectId: string,
    request: DashboardSegmentQueryPreviewRequest
  ): Promise<DashboardSegmentQueryPreview> {
    const startedAt = Date.now();
    log.assignContext({ projectId });
    log.info("started", { projectId, request });
    const response = await this.segmentQueryRepository.createQueryPreview(projectId, request);
    log.assignContext({ queryPreviewId: response.query_preview_id });

    log.info("completed", { response, durationMs: durationMs(startedAt) });
    return response;
  }

  @LogContextScope()
  @Transactional()
  async assistPromotionSegment(
    projectId: string,
    promotionId: string,
    request: DashboardSegmentAssistantRequest
  ): Promise<DashboardSegmentAssistantResponse> {
    const startedAt = Date.now();
    log.assignContext({ projectId, promotionId });
    log.info("started", {
      conversationCount: request.conversation.length,
      hasSourceSuggestion: Boolean(request.source_suggestion),
      messageLength: request.message.length
    });
    await this.campaignReader.getPromotionSummary(projectId, promotionId);

    const source = request.source_suggestion
      ? await this.resolveSegmentAssistantSource(
          projectId,
          promotionId,
          request.source_suggestion.suggestion_id
        )
      : undefined;
    if (source && source.segment_id !== request.source_suggestion?.segment_id) {
      throw dashboardErrors.segmentAssistantSourceInvalid();
    }

    let previousPlan: SegmentAssistantPlan | undefined;
    if (request.previous_query_preview_id) {
      let previousState;
      try {
        previousState = await this.segmentQueryRepository.readAssistantExecutionState(
          projectId,
          request.previous_query_preview_id
        );
      } catch (error) {
        log.warn("segment_assistant_previous_preview_invalid", { error });
        throw dashboardErrors.segmentAssistantSourceInvalid();
      }
      if (!assistantSourcesMatch(source, previousState.source_audience)) {
        throw dashboardErrors.segmentAssistantSourceInvalid();
      }
      previousPlan = previousState.assistant_plan;
    }

    const sourceBaseConditions = source?.base_conditions ?? [];
    const previousPlanEditsSource = previousPlan?.execution_scope === "all_eligible_users";
    const editingSourceBase = Boolean(
      source &&
      (previousPlanEditsSource ||
        isSourceBaseConditionEditRequest(request.message, sourceBaseConditions))
    );
    const sourceConditionsWithPreviousRefinements =
      source && previousPlan && !previousPlanEditsSource
        ? applySourceBaseConditionEdit(sourceBaseConditions, previousPlan.conditions, "")
        : sourceBaseConditions;
    const editableCurrentPlan =
      source && editingSourceBase
        ? previousPlanEditsSource && previousPlan
          ? previousPlan
          : sourceBasePlan(source, sourceConditionsWithPreviousRefinements)
        : previousPlan;
    const retainedSourceRefinements =
      source && previousPlan && !previousPlanEditsSource && !editingSourceBase
        ? removeRequestedSourceRefinements(previousPlan.conditions, request.message)
        : null;

    let plan: SegmentAssistantPlan;
    if (request.refinement_key) {
      if (!source) {
        throw dashboardErrors.segmentAssistantSourceInvalid();
      }
      const candidates = await this.segmentQueryRepository.analyzeSourceRefinements(
        projectId,
        source
      );
      const definition = candidates.find((candidate) => candidate.key === request.refinement_key);
      if (!definition) {
        throw dashboardErrors.segmentAssistantSourceInvalid();
      }
      plan = {
        action: "segment_preview",
        execution_scope: previousPlan?.execution_scope ?? "source_audience",
        segment_name: sourceRefinementSegmentName(source.title, definition.condition.label),
        lookback_days: 30,
        conditions: upsertRefinementCondition(previousPlan?.conditions ?? [], definition.condition),
        clarification_message: null
      };
    } else if (source && previousPlan && retainedSourceRefinements) {
      plan = {
        ...previousPlan,
        action: "segment_preview",
        segment_name:
          retainedSourceRefinements.length === 0 ? source.title : previousPlan.segment_name,
        conditions: retainedSourceRefinements,
        clarification_message: null
      };
    } else {
      if (!this.segmentAssistantAgent) {
        throw new Error("Dashboard segment assistant agent is not configured.");
      }
      plan = await this.segmentAssistantAgent.plan({
        conversation: request.conversation,
        currentPlan: editableCurrentPlan,
        editingSourceBase,
        message: request.message,
        sourceAudience: source
      });
      if (source && plan.action !== "clarification") {
        plan = bindImplicitSourceDestination(plan, request.message, source);
        plan = editingSourceBase
          ? sourceBaseEditPlan(plan, editableCurrentPlan?.conditions ?? [], source, request.message)
          : {
              ...plan,
              execution_scope: "source_audience",
              lookback_days: 30,
              conditions: removeUnchangedSourceConditions(plan.conditions, source.reference_labels)
            };
      }
    }
    if (plan.action === "clarification") {
      const response: DashboardSegmentAssistantResponse = {
        action: "clarification",
        assistant_message:
          plan.clarification_message ??
          "조회하거나 만들 고객군의 목적지, 기간, 행동 조건을 조금 더 구체적으로 알려주세요.",
        segment_name: null,
        lookback_days: plan.lookback_days,
        condition_labels: [],
        minimum_sample_size: MIN_SEGMENT_USER_COUNT,
        condition_diagnostics: [],
        suggested_adjustments: [],
        base_audience: source ? sourceAudienceResponse(source) : null,
        preview: null
      };
      log.info("completed", {
        action: response.action,
        durationMs: durationMs(startedAt)
      });
      return response;
    }

    const sourceMembership = usesSourceAudienceMembership(plan, source) ? source : undefined;
    const preview = await this.segmentQueryRepository.createAssistantQueryPreview(
      projectId,
      segmentAssistantNaturalLanguageQuery(request),
      plan,
      source
    );
    log.assignContext({ queryPreviewId: preview.query_preview_id });
    const diagnostics =
      preview.sample_size_status === "too_small"
        ? await this.segmentQueryRepository.diagnoseAssistantPlan(
            projectId,
            plan,
            preview.sample_size,
            source
          )
        : emptySegmentAssistantDiagnostics();
    const segmentName =
      plan.segment_name ??
      (source
        ? sourceRefinementSegmentName(source.title, plan.conditions.at(-1)?.label)
        : `${plan.conditions[0]?.label ?? "맞춤 행동"} 고객`);
    const response: DashboardSegmentAssistantResponse = {
      action: plan.action,
      assistant_message: segmentAssistantMessage(
        plan.action,
        plan.lookback_days,
        preview,
        diagnostics,
        sourceMembership,
        plan.conditions.length
      ),
      segment_name: segmentName,
      lookback_days: plan.lookback_days,
      condition_labels: effectiveSegmentConditionLabels(plan, source),
      minimum_sample_size: MIN_SEGMENT_USER_COUNT,
      condition_diagnostics: diagnostics.conditionDiagnostics,
      suggested_adjustments: diagnostics.suggestedAdjustments,
      base_audience: sourceMembership ? sourceAudienceResponse(sourceMembership) : null,
      preview
    };

    log.info("completed", {
      action: response.action,
      conditionCount: response.condition_labels.length,
      durationMs: durationMs(startedAt),
      sampleRatio: preview.sample_ratio,
      sampleSize: preview.sample_size,
      sampleSizeStatus: preview.sample_size_status,
      totalEligibleUserCount: preview.total_eligible_user_count
    });
    return response;
  }

  @LogContextScope()
  @Transactional()
  async saveSegment(
    projectId: string,
    request: DashboardSaveSegmentRequest
  ): Promise<DashboardSavedSegment> {
    const startedAt = Date.now();
    log.assignContext({ projectId, queryPreviewId: request.query_preview_id });
    log.info("started", { projectId, request });
    const response = await this.segmentQueryRepository.saveSegment(projectId, request);
    log.assignContext({ segmentId: response.segment_id });

    log.info("completed", { response, durationMs: durationMs(startedAt) });
    return response;
  }
}

function segmentAssistantMessage(
  action: "audience_query" | "segment_preview",
  lookbackDays: number,
  preview: DashboardSegmentQueryPreview,
  diagnostics: SegmentAssistantDiagnostics,
  source: ResolvedSegmentAssistantSource | undefined,
  refinementCount: number
) {
  if (preview.sample_size === 0) {
    return source
      ? `'${source.title}' ${source.base_user_ids.length.toLocaleString("ko-KR")}명 중 추가 조건에 맞는 고객을 찾지 못했습니다.`
      : `최근 ${lookbackDays}일 기준으로 조건에 맞는 고객을 찾지 못했습니다. 조건이나 조회 기간을 조정해 보세요.`;
  }
  const ratio = (preview.sample_ratio * 100).toLocaleString("ko-KR", {
    maximumFractionDigits: 2
  });
  const counts = source
    ? refinementCount === 0
      ? `'${source.title}' 추천 고객군 ${preview.sample_size.toLocaleString("ko-KR")}명을 그대로 사용합니다.`
      : `'${source.title}' 추천 고객군 ${source.base_user_ids.length.toLocaleString("ko-KR")}명 중 추가 조건에 맞는 고객은 ${preview.sample_size.toLocaleString("ko-KR")}명입니다.`
    : `최근 ${lookbackDays}일 기준 조건에 맞는 고객은 ${preview.sample_size.toLocaleString("ko-KR")}명이며, 분석 가능 사용자 ${preview.total_eligible_user_count.toLocaleString("ko-KR")}명의 ${ratio}%입니다.`;
  if (preview.sample_size_status === "too_small") {
    const bottleneck = diagnostics.conditionDiagnostics.find(
      (condition) => condition.is_bottleneck
    );
    const adjustment = diagnostics.suggestedAdjustments.find(
      (item) => item.kind === "remove_condition"
    );
    const reason = bottleneck
      ? ` '${bottleneck.condition_label}' 조건이 대상 범위를 가장 크게 제한하고 있습니다.`
      : " 현재 조건은 고객군 운영 기준을 충족하지 못했습니다.";
    const recovery = adjustment?.estimated_sample_size
      ? ` 이 조건을 제외하면 약 ${adjustment.estimated_sample_size.toLocaleString("ko-KR")}명으로 늘어납니다.`
      : " 아래 조정안을 선택해 다시 계산할 수 있습니다.";
    return `${counts}${reason}${recovery}`;
  }
  return action === "audience_query"
    ? counts
    : `${counts} 조건을 확인한 뒤 이 고객군을 후보로 추가할 수 있습니다.`;
}

function emptySegmentAssistantDiagnostics(): SegmentAssistantDiagnostics {
  return { conditionDiagnostics: [], suggestedAdjustments: [] };
}

function segmentAssistantNaturalLanguageQuery(request: DashboardSegmentAssistantRequest) {
  return request.source_suggestion
    ? `${request.source_suggestion.title} 수정: ${request.message}`
    : request.message;
}

type ResolvedSegmentAssistantSource = SegmentAssistantSourceAudience & {
  strategy_role: string | null;
};

function effectiveSegmentConditionLabels(
  plan: SegmentAssistantPlan,
  source: ResolvedSegmentAssistantSource | undefined
) {
  if (!source) {
    return groupedConditionLabels(plan.conditions);
  }
  if (plan.execution_scope === "all_eligible_users") {
    return editedSourceReferenceLabels(source.reference_labels, plan.conditions);
  }
  const baseConditions = source.base_conditions ?? [];
  const effectiveConditions = applySourceBaseConditionEdit(baseConditions, plan.conditions, "");
  return groupedConditionLabels(effectiveConditions, source.reference_labels);
}

function editedSourceReferenceLabels(
  referenceLabels: string[],
  conditions: SegmentAssistantPlan["conditions"]
) {
  const hasBookingStart = conditions.some(
    (condition) => condition.event_name === "booking_start" && condition.minimum_count >= 1
  );
  const hasBookingComplete = conditions.some(
    (condition) =>
      condition.event_name === "booking_complete" &&
      condition.minimum_count >= 1 &&
      condition.maximum_count === null
  );
  const hasNoBookingComplete = conditions.some(
    (condition) =>
      condition.event_name === "booking_complete" &&
      condition.minimum_count === 0 &&
      condition.maximum_count === 0
  );
  const representedEvents = new Set<string>();
  const labels = referenceLabels.flatMap((label) => {
    const events = sourceReferenceLabelEvents(label);
    const isBookingLabel = events.some(
      (eventName) => eventName === "booking_start" || eventName === "booking_complete"
    );
    if (!isBookingLabel) {
      if (events.length === 0) {
        return [label];
      }
      if (
        !events.some((eventName) =>
          conditions.some((condition) => condition.event_name === eventName)
        )
      ) {
        return [];
      }
      events.forEach((eventName) => representedEvents.add(eventName));
      return [label];
    }

    representedEvents.add("booking_start");
    representedEvents.add("booking_complete");
    if (hasBookingComplete) return ["예약 완료"];
    if (hasBookingStart && hasNoBookingComplete) return ["예약 시작 후 미완료"];
    if (hasNoBookingComplete) return ["예약 미완료"];
    if (hasBookingStart) return ["예약 시작"];
    return [];
  });

  for (const condition of conditions) {
    if (!representedEvents.has(condition.event_name)) {
      labels.push(condition.label);
      representedEvents.add(condition.event_name);
    }
  }
  return uniqueConditionLabels(labels);
}

function groupedConditionLabels(
  conditions: SegmentAssistantPlan["conditions"],
  fallbackLabels: string[] = []
) {
  const hasBookingStart = conditions.some(
    (condition) => condition.event_name === "booking_start" && condition.minimum_count >= 1
  );
  const hasNoBookingComplete = conditions.some(
    (condition) => condition.event_name === "booking_complete" && condition.maximum_count === 0
  );
  const labels =
    conditions.length > 0
      ? conditions
          .filter(
            (condition) =>
              !(
                hasBookingStart &&
                hasNoBookingComplete &&
                (condition.event_name === "booking_start" ||
                  condition.event_name === "booking_complete")
              )
          )
          .map((condition) => condition.label)
      : fallbackLabels;
  if (hasBookingStart && hasNoBookingComplete) {
    labels.push("예약 시작 후 미완료");
  }
  return uniqueConditionLabels(labels);
}

function uniqueConditionLabels(labels: string[]) {
  return [...new Set(labels.map((label) => label.trim()).filter(Boolean))];
}

function bindImplicitSourceDestination(
  plan: SegmentAssistantPlan,
  message: string,
  source: ResolvedSegmentAssistantSource
): SegmentAssistantPlan {
  const destinationIds = source.destination_ids ?? [];
  if (
    destinationIds.length === 0 ||
    !/(?:목적지|여행지)/.test(message) ||
    hasExplicitDestinationReference(message)
  ) {
    return plan;
  }
  const destination = destinationIds.join(", ");
  return {
    ...plan,
    conditions: plan.conditions.map((condition) =>
      condition.destination === null &&
      (condition.event_name === "hotel_search" || /(?:목적지|여행지)/.test(condition.label))
        ? { ...condition, destination }
        : condition
    )
  };
}

function hasExplicitDestinationReference(message: string) {
  const match = message.match(/([가-힣A-Za-z][가-힣A-Za-z0-9·-]{1,39})\s*(?:목적지|여행지)/);
  if (!match?.[1]) return false;
  return !/^(?:기존|추천|프로모션|해당|현재|그|이|새|다른)$/.test(match[1]);
}

function sourceBasePlan(
  source: ResolvedSegmentAssistantSource,
  conditions: SegmentAssistantAudienceCondition[]
): SegmentAssistantPlan {
  return {
    action: "segment_preview",
    execution_scope: "all_eligible_users",
    segment_name: source.title,
    lookback_days: 30,
    conditions,
    clarification_message: null
  };
}

function sourceBaseEditPlan(
  planned: SegmentAssistantPlan,
  currentConditions: SegmentAssistantAudienceCondition[],
  source: ResolvedSegmentAssistantSource,
  message: string
): SegmentAssistantPlan {
  const conditions = applySourceBaseConditionEdit(currentConditions, planned.conditions, message);
  const restoresOriginalSource = sourceConditionsEqual(conditions, source.base_conditions ?? []);
  return {
    ...planned,
    execution_scope: restoresOriginalSource ? "source_audience" : "all_eligible_users",
    lookback_days: 30,
    conditions: restoresOriginalSource ? [] : conditions
  };
}

function sourceAudienceResponse(source: ResolvedSegmentAssistantSource) {
  return {
    suggestion_id: source.suggestion_id,
    title: source.title,
    sample_size: source.base_user_ids.length
  };
}

function assistantSourcesMatch(
  current: ResolvedSegmentAssistantSource | undefined,
  previous: SegmentAssistantSourceAudience | undefined
) {
  if (!current || !previous) return current === undefined && previous === undefined;
  return (
    current.suggestion_id === previous.suggestion_id &&
    current.segment_id === previous.segment_id &&
    current.base_user_ids.length === previous.base_user_ids.length &&
    current.base_user_ids.every((userId, index) => userId === previous.base_user_ids[index])
  );
}

function sourceRefinementSegmentName(sourceTitle: string, refinementLabel?: string) {
  const name = refinementLabel ? `${sourceTitle} · ${refinementLabel}` : sourceTitle;
  return name.slice(0, 100);
}

function roundRate(value: number) {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function jsonObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function nonEmptyString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function canonicalStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return [
    ...new Set(value.map(nonEmptyString).filter((item): item is string => Boolean(item)))
  ].sort((left, right) => left.localeCompare(right));
}

function canonicalSourceUserIds(value: unknown) {
  if (!Array.isArray(value) || value.length === 0 || value.length > 5_000) return [];
  const userIds = value.map(nonEmptyString);
  if (userIds.some((userId) => !userId)) return [];
  const unique = new Set(userIds as string[]);
  if (unique.size !== userIds.length) return [];
  return [...unique].sort((left, right) => left.localeCompare(right));
}

async function readContentCandidateHtml(
  creative: NonNullable<ReturnType<typeof editableCreative>>
) {
  if (creative.editedHtml) {
    return creative.editedHtml;
  }

  const startedAt = Date.now();
  const providerContext = {
    endpoint: "public_url",
    provider: "creative_artifact_storage",
    storageKey: creative.artifact.storage_key
  };
  log.info("provider_request_prepared", providerContext);
  let response: Response;
  try {
    response = await fetch(creative.artifact.public_url as string, {
      headers: { Accept: "text/html" },
      signal: AbortSignal.timeout(10_000)
    });
  } catch (error) {
    log.warn("provider_request_failed", {
      ...providerContext,
      durationMs: durationMs(startedAt),
      err: error
    });
    throw dashboardErrors.contentCandidateHtmlUnavailable(error);
  }
  if (!response.ok) {
    const error = new Error(`HTML artifact read failed with ${response.status}.`);
    log.warn("provider_request_failed", {
      ...providerContext,
      durationMs: durationMs(startedAt),
      err: error,
      statusCode: response.status
    });
    throw dashboardErrors.contentCandidateHtmlUnavailable(error);
  }

  let html: string;
  try {
    html = await response.text();
  } catch (error) {
    log.warn("provider_response_invalid", {
      ...providerContext,
      durationMs: durationMs(startedAt),
      err: error,
      statusCode: response.status
    });
    throw dashboardErrors.contentCandidateHtmlUnavailable(error);
  }
  const responseBytes = Buffer.byteLength(html);
  if (responseBytes > 2_000_000) {
    const error = new Error("HTML artifact exceeds the 2 MB edit limit.");
    log.warn("provider_response_invalid", {
      ...providerContext,
      durationMs: durationMs(startedAt),
      err: error,
      responseBytes,
      statusCode: response.status
    });
    throw dashboardErrors.contentCandidateHtmlUnavailable(error);
  }
  log.info("provider_request_completed", {
    ...providerContext,
    durationMs: durationMs(startedAt),
    responseBytes,
    statusCode: response.status
  });
  return html;
}

function assertCampaignExecutionWindowOpen(campaign: DashboardCampaignSummary) {
  if (
    campaign.status === "completed" ||
    campaign.status === "stopped" ||
    isCampaignScheduleExpired(campaign)
  ) {
    log.warn("campaign_execution_window_closed", {
      campaignEndDate: campaign.end_date,
      campaignStartDate: campaign.start_date,
      campaignStatus: campaign.status
    });
    throw dashboardErrors.campaignExecutionWindowClosed();
  }
}

function assertPromotionScheduleWithinCampaign(
  promotion: {
    scheduled_end_at: string | null | undefined;
    scheduled_start_at: string | null | undefined;
  },
  campaign: DashboardCampaignSummary
) {
  if (!isPromotionScheduleWithinCampaign(promotion, campaign)) {
    log.warn("promotion_campaign_schedule_invalid", {
      campaignEndDate: campaign.end_date,
      campaignStartDate: campaign.start_date,
      promotionScheduledEndAt: promotion.scheduled_end_at,
      promotionScheduledStartAt: promotion.scheduled_start_at
    });
    throw dashboardErrors.promotionCampaignScheduleInvalid();
  }
}
