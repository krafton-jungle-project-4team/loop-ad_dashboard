import {
  DASHBOARD_FALLBACK_SEGMENT_ID,
  normalizePromotionSegmentAudience,
  normalizePromotionSegmentPerformanceEstimate,
  normalizePromotionSegmentRankComparison
} from "@loopad/shared";
import type {
  DashboardAdExperiment,
  DashboardCampaignExperimentMetric,
  DashboardCampaignPromotion,
  DashboardCampaignSegment,
  DashboardCampaignSummary,
  DashboardContentCandidate,
  DashboardProject,
  DashboardPromotionAnalysis,
  DashboardPromotionScopedSegmentDefinition,
  DashboardPromotionSegmentSuggestion,
  DashboardPromotionSummary,
  DashboardRejectContentCandidateResult,
  DashboardStartPromotionGenerationResult
} from "@loopad/shared";
import type {
  IGetDashboardCampaignSummaryResult,
  IGetDashboardPromotionGenerationResultResult,
  IGetDashboardPromotionSegmentResult,
  IGetDashboardPromotionSummaryResult,
  IDecideDashboardPromotionSegmentSuggestionResult,
  IInsertDashboardProjectResult,
  IInsertDashboardPromotionCustomSegmentDefinitionResult,
  IInsertDashboardPromotionManualSegmentDefinitionResult,
  IListDashboardCampaignAdExperimentsResult,
  IListDashboardCampaignContentCandidatesResult,
  IListDashboardCampaignExperimentMetricsResult,
  IListDashboardCampaignPromotionsResult,
  IListDashboardCampaignSegmentsResult,
  IListDashboardCampaignSummariesResult,
  IListDashboardProjectsResult,
  IListDashboardPromotionAnalysesResult,
  IListDashboardPromotionExperimentMetricsResult,
  IListDashboardPromotionScopedSegmentDefinitionsResult,
  IListDashboardPromotionSegmentSuggestionsResult,
  IListDashboardPromotionSegmentsResult,
  IListDashboardSegmentAdExperimentsResult,
  IListDashboardSegmentContentCandidatesResult,
  IListDashboardSegmentExperimentMetricsResult,
  IRejectDashboardContentCandidateResult,
  IStartDashboardAdExperimentResult
} from "../database/__generated__/dashboard.queries.js";

export function toProject(
  row: IInsertDashboardProjectResult | IListDashboardProjectsResult
): DashboardProject {
  return {
    created_at: row.createdAt.toISOString(),
    domain: row.domain,
    project_id: row.projectId,
    project_name: row.projectName,
    status: projectStatus(row.status),
    updated_at: row.updatedAt.toISOString(),
    write_key: row.writeKey
  };
}

export function toCampaignSummary(
  row: IGetDashboardCampaignSummaryResult | IListDashboardCampaignSummariesResult,
  runningAdExperimentCount = 0
): DashboardCampaignSummary {
  return {
    campaign_id: row.campaignId,
    campaign_name: row.campaignName,
    objective: row.objective,
    primary_metric: row.primaryMetric,
    status: row.status,
    start_date: formatDate(row.startDate),
    end_date: formatDate(row.endDate),
    max_loop_count: countValue(row.maxLoopCount),
    current_loop_count: countValue(row.currentLoopCount),
    promotion_count: countValue(row.promotionCount),
    segment_count: countValue(row.segmentCount),
    ad_experiment_count: countValue(row.adExperimentCount),
    running_ad_experiment_count: countValue(runningAdExperimentCount),
    latest_goal_achievement_rate: nullableRate(row.latestGoalAchievementRate),
    next_action: row.nextAction ?? "monitor",
    updated_at: row.updatedAt.toISOString()
  };
}

export function toCampaignPromotion(
  row: IListDashboardCampaignPromotionsResult
): DashboardCampaignPromotion {
  return {
    promotion_id: row.promotionId,
    channel: row.channel,
    marketing_theme: row.marketingTheme,
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

export function toPromotionSummary(
  row: IGetDashboardPromotionSummaryResult
): DashboardPromotionSummary {
  return {
    promotion_id: row.promotionId,
    campaign_id: row.campaignId,
    channel: row.channel,
    marketing_theme: row.marketingTheme,
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

export function toCampaignSegment(
  row:
    | IGetDashboardPromotionSegmentResult
    | IListDashboardCampaignSegmentsResult
    | IListDashboardPromotionSegmentsResult
): DashboardCampaignSegment {
  return {
    analysis_id: row.analysisId,
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

export function toPromotionSegmentSuggestion(
  row:
    | IDecideDashboardPromotionSegmentSuggestionResult
    | IListDashboardPromotionSegmentSuggestionsResult
): DashboardPromotionSegmentSuggestion {
  return {
    analysis_id: requiredText(row.analysisId, "analysisId"),
    campaign_id: requiredText(row.campaignId, "campaignId"),
    created_at: requiredDate(row.createdAt, "createdAt").toISOString(),
    decided_at: row.decidedAt ? row.decidedAt.toISOString() : null,
    profile_json: jsonObject(row.profileJson),
    promotion_id: requiredText(row.promotionId, "promotionId"),
    reason_json: jsonObject(row.reasonJson),
    display_copy: suggestionDisplayCopy(row.metadataJson),
    ai_report: suggestionAiReport(row.metadataJson),
    rule_json: jsonObject(row.ruleJson),
    sample_ratio: numberValue(row.sampleRatio),
    sample_size: countValue(row.sampleSize),
    score_json: jsonObject(row.scoreJson),
    segment_id: requiredText(row.segmentId, "segmentId"),
    segment_name: row.segmentName,
    segment_source: segmentSource(row.segmentSource),
    suggested_rank: countValue(row.suggestedRank),
    suggestion_id: requiredText(row.suggestionId, "suggestionId"),
    suggestion_source: suggestionSource(requiredText(row.suggestionSource, "suggestionSource")),
    suggestion_status: suggestionStatus(requiredText(row.suggestionStatus, "suggestionStatus")),
    updated_at: requiredDate(row.updatedAt, "updatedAt").toISOString()
  };
}

export function toPromotionScopedSegmentDefinition(
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

export function toCampaignExperimentMetric(
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

export function toCampaignAdExperiment(
  row: IListDashboardCampaignAdExperimentsResult
): DashboardAdExperiment {
  return toAdExperiment(row);
}

export function toSegmentAdExperiment(
  row: IListDashboardSegmentAdExperimentsResult
): DashboardAdExperiment {
  return toAdExperiment(row);
}

export function toAdExperiment(
  row:
    | IListDashboardCampaignAdExperimentsResult
    | IListDashboardSegmentAdExperimentsResult
    | IStartDashboardAdExperimentResult
): DashboardAdExperiment {
  return {
    ad_experiment_id: row.adExperimentId,
    channel: row.channel,
    content_id: row.contentId,
    content_option_id: row.contentOptionId,
    goal_basis: row.goalBasis,
    goal_metric: row.goalMetric,
    goal_target_value: row.goalTargetValue ?? 0,
    assignment_count: "assignmentCount" in row ? countValue(row.assignmentCount) : 0,
    is_fallback: row.segmentId === DASHBOARD_FALLBACK_SEGMENT_ID,
    loop_count: row.loopCount,
    promotion_id: row.promotionId,
    promotion_run_id: row.promotionRunId,
    segment_id: row.segmentId,
    status: row.status
  };
}

export function toCampaignContentCandidate(
  row: IListDashboardCampaignContentCandidatesResult
): DashboardContentCandidate {
  return toContentCandidate(row);
}

export function toContentCandidate(
  row: IListDashboardCampaignContentCandidatesResult | IListDashboardSegmentContentCandidatesResult
): DashboardContentCandidate {
  return {
    content_id: row.contentId,
    content_option_id: row.contentOptionId,
    generation_id: row.generationId,
    analysis_id: row.analysisId,
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
    image_url: row.imageUrl,
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

export function toRejectContentCandidateResult(
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

export function toPromotionAnalysis(
  row: IListDashboardPromotionAnalysesResult
): DashboardPromotionAnalysis {
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

export function toStartPromotionGenerationResult(
  row: IGetDashboardPromotionGenerationResultResult
): DashboardStartPromotionGenerationResult {
  return {
    content_candidate_count: countValue(row.contentCandidateCount),
    generation_id: row.generationId,
    promotion_id: row.promotionId,
    status: row.status
  };
}

export function jsonObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function jsonStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function suggestionAiReport(value: unknown): DashboardPromotionSegmentSuggestion["ai_report"] {
  const report = jsonObject(value).ai_report;
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    return null;
  }

  const raw = report as Record<string, unknown>;
  const title = nonEmptyString(raw.title);
  const summary = nonEmptyString(raw.summary);
  const actionHint = nonEmptyString(raw.action_hint);
  const caution = nonEmptyString(raw.caution);
  const whyRecommended = jsonStringArray(raw.why_recommended);
  const evidence = jsonStringArray(raw.evidence);
  const promotionInterpretation = jsonStringArray(raw.promotion_interpretation);
  const candidateStrengths = jsonStringArray(raw.candidate_strengths);
  const selectionConsiderations = jsonStringArray(raw.selection_considerations);
  const differenceFromOtherRanks = jsonStringArray(raw.difference_from_other_ranks);
  const confidenceLabel = nonEmptyString(raw.confidence_label);
  if (
    !title ||
    !summary ||
    !actionHint ||
    !caution ||
    whyRecommended.length === 0 ||
    evidence.length === 0
  ) {
    return null;
  }

  return {
    version: nonEmptyString(raw.version) ?? undefined,
    source: nonEmptyString(raw.source) ?? undefined,
    title,
    summary,
    promotion_interpretation: promotionInterpretation.length ? promotionInterpretation : undefined,
    why_recommended: whyRecommended,
    evidence,
    candidate_strengths: candidateStrengths.length ? candidateStrengths : undefined,
    selection_considerations: selectionConsiderations.length ? selectionConsiderations : undefined,
    difference_from_other_ranks: differenceFromOtherRanks.length
      ? differenceFromOtherRanks
      : undefined,
    action_hint: actionHint,
    caution,
    confidence_label:
      confidenceLabel === "high" || confidenceLabel === "medium" || confidenceLabel === "low"
        ? confidenceLabel
        : undefined
  };
}

function suggestionDisplayCopy(
  value: unknown
): DashboardPromotionSegmentSuggestion["display_copy"] {
  const displayCopy = jsonObject(value).display_copy;
  if (!displayCopy || typeof displayCopy !== "object" || Array.isArray(displayCopy)) {
    return null;
  }

  const raw = displayCopy as Record<string, unknown>;
  const title = nonEmptyString(raw.title);
  const audienceSummary = nonEmptyString(raw.audience_summary);
  const reason = nonEmptyString(raw.reason);
  const actionHint = nonEmptyString(raw.action_hint);
  if (!title || !audienceSummary || !reason || !actionHint) {
    return null;
  }

  const signalChips = Array.isArray(raw.signal_chips)
    ? raw.signal_chips.map(nonEmptyString).filter((chip): chip is string => chip !== null)
    : [];
  const performanceEstimate = normalizePromotionSegmentPerformanceEstimate(
    raw.performance_estimate
  );
  const audience = normalizePromotionSegmentAudience(raw.audience);
  const rankComparison = normalizePromotionSegmentRankComparison(raw.rank_comparison);
  const recommendationTier = nonEmptyString(raw.recommendation_tier);
  const recommendationRank = countValueOrNull(raw.recommendation_rank);
  const minimumPrimarySampleSize = countValueOrNull(raw.minimum_primary_sample_size);

  return {
    title,
    strategy_role: nonEmptyString(raw.strategy_role) ?? undefined,
    strength_summary: nonEmptyString(raw.strength_summary) ?? undefined,
    tradeoff_summary: nonEmptyString(raw.tradeoff_summary) ?? undefined,
    rank_role: nonEmptyString(raw.rank_role) ?? undefined,
    recommendation_tier:
      recommendationTier === "primary" || recommendationTier === "small_high_intent"
        ? recommendationTier
        : undefined,
    recommendation_tier_label: nonEmptyString(raw.recommendation_tier_label) ?? undefined,
    recommendation_tier_reason: nonEmptyString(raw.recommendation_tier_reason) ?? undefined,
    recommendation_rank: recommendationRank ?? undefined,
    rank_eligible: typeof raw.rank_eligible === "boolean" ? raw.rank_eligible : undefined,
    minimum_primary_sample_size: minimumPrimarySampleSize ?? undefined,
    audience_summary: audienceSummary,
    audience,
    performance_estimate: performanceEstimate,
    signal_chips: signalChips,
    reason,
    difference_summary: nonEmptyString(raw.difference_summary) ?? undefined,
    rank_comparison: rankComparison,
    action_hint: actionHint
  };
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function countValueOrNull(value: unknown): number | null {
  if (typeof value !== "number" && typeof value !== "string") {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.trunc(parsed) : null;
}

export function countValue(value: number | string | null): number {
  return Math.max(0, Math.trunc(numberValue(value)));
}

function nullableRate(value: number | string | null): number | null {
  return value === null ? null : Math.min(Math.max(numberValue(value), 0), 1);
}

function numberValue(value: number | string | null): number {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function requiredText(value: string | null, fieldName: string): string {
  if (value === null || value.trim().length === 0) {
    throw new Error(`Dashboard query returned empty required field '${fieldName}'.`);
  }
  return value;
}

function requiredDate(value: Date | null, fieldName: string): Date {
  if (!value) {
    throw new Error(`Dashboard query returned empty required field '${fieldName}'.`);
  }
  return value;
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

function projectStatus(value: string): DashboardProject["status"] {
  return value === "inactive" || value === "archived" ? value : "active";
}

function formatDate(value: Date | null): string | null {
  if (!value) {
    return null;
  }
  return value.toISOString().slice(0, 10);
}
