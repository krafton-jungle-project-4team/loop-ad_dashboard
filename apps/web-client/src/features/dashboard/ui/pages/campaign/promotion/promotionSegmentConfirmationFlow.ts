import type {
  DashboardConfirmSegmentSuggestionsResult,
  DashboardPromotionAnalysisResult
} from "@loopad/shared";

export type PromotionSegmentConfirmationOperations = {
  analyze: (segmentIds: string[]) => Promise<DashboardPromotionAnalysisResult>;
  confirm: () => Promise<DashboardConfirmSegmentSuggestionsResult>;
};

export async function confirmAndAnalyzePromotionSegments(
  segmentIds: string[],
  operations: PromotionSegmentConfirmationOperations
) {
  const uniqueSegmentIds = [...new Set(segmentIds.filter(Boolean))];
  if (uniqueSegmentIds.length === 0) {
    throw new Error("분석할 세그먼트 후보가 없습니다.");
  }

  const confirmation = await operations.confirm();
  const analysis = await operations.analyze(uniqueSegmentIds);

  return { analysis, confirmation };
}
