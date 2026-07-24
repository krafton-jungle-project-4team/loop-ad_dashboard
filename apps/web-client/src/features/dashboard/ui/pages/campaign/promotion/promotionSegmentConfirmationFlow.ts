import type {
  DashboardConfirmSegmentSuggestionsResult,
  DashboardConfirmSegmentSuggestionsRequest,
  DashboardPromotionSegmentSuggestion
} from "@loopad/shared";

export function promotionSegmentConfirmationRequest(
  suggestions: DashboardPromotionSegmentSuggestion[],
  fallbackAnalysisId: string | null,
  directSegmentIds: string[] = []
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
    segment_ids: [...new Set(directSegmentIds)],
    suggestion_ids: acceptedSuggestions
      .filter((suggestion) => suggestion.analysis_id === analysisId)
      .map((suggestion) => suggestion.suggestion_id)
  };
}

export function confirmedCreatedSegmentTarget(
  result: DashboardConfirmSegmentSuggestionsResult,
  manualSegmentIds: string[],
  createdSegmentId: string | null
) {
  if (!createdSegmentId || !manualSegmentIds.includes(createdSegmentId)) {
    return null;
  }
  return result.target_segments.find((segment) => segment.segment_id === createdSegmentId) ?? null;
}
