import type {
  DashboardPromotionScopedSegmentDefinition,
  DashboardPromotionSegmentSuggestion
} from "@loopad/shared";

export type SelectedSegmentSummary = {
  detail: string;
  id: string;
  name: string;
};

export function selectedSegmentSummaries(
  suggestions: DashboardPromotionSegmentSuggestion[],
  scopedSegments: DashboardPromotionScopedSegmentDefinition[]
): SelectedSegmentSummary[] {
  const acceptedSuggestions = suggestions
    .filter((suggestion) => suggestion.suggestion_status === "accepted")
    .map((suggestion) => {
      const displayCopy = suggestion.display_copy;
      const strategyRole = displayCopy?.strategy_role ?? displayCopy?.rank_role ?? "AI 추천";
      const estimate = displayCopy?.performance_estimate;
      const performance =
        estimate?.availability !== "unavailable" && estimate?.formatted
          ? `${estimate.label} ${estimate.formatted}`
          : `대표 표본 ${suggestion.sample_size.toLocaleString("ko-KR")}명`;

      return {
        detail: `${strategyRole} · ${performance}`,
        id: `suggestion:${suggestion.suggestion_id}`,
        name: displayCopy?.title ?? suggestion.segment_name
      };
    });

  const directlyAddedSegments = scopedSegments.map((segment) => ({
    detail: `직접 추가 · 조건 부합 ${segment.sample_size.toLocaleString("ko-KR")}명`,
    id: `scoped:${segment.segment_id}`,
    name: segment.segment_name
  }));

  return [...acceptedSuggestions, ...directlyAddedSegments];
}
