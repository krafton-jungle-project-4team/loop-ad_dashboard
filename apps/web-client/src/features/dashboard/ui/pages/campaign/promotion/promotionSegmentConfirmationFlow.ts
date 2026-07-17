import type {
  DashboardConfirmSegmentSuggestionsRequest,
  DashboardPromotionScopedSegmentDefinition,
  DashboardPromotionSegmentSuggestion
} from "@loopad/shared";

export function promotionSegmentConfirmationRequest(
  suggestions: DashboardPromotionSegmentSuggestion[],
  scopedSegments: DashboardPromotionScopedSegmentDefinition[],
  fallbackAnalysisId: string | null
): DashboardConfirmSegmentSuggestionsRequest {
  const acceptedSuggestions = suggestions.filter(
    (suggestion) => suggestion.suggestion_status === "accepted"
  );
  const acceptedAnalysisIds = [
    ...new Set(acceptedSuggestions.map((suggestion) => suggestion.analysis_id))
  ];
  const analysisId =
    acceptedSuggestions.length > 0
      ? (fallbackAnalysisId ??
        (acceptedAnalysisIds.length === 1 ? (acceptedAnalysisIds[0] ?? null) : null))
      : null;

  return {
    analysis_id: analysisId,
    segment_ids: scopedSegments.map((segment) => segment.segment_id),
    suggestion_ids: acceptedSuggestions
      .filter((suggestion) => suggestion.analysis_id === analysisId)
      .map((suggestion) => suggestion.suggestion_id)
  };
}
