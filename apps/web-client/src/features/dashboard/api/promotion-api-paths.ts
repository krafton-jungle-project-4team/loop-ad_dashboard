const PROMOTIONS_PATH = "/dashboard/v1/promotions";

export function promotionSegmentRecommendationPath(promotionId: string) {
  return `${PROMOTIONS_PATH}/${encodeURIComponent(promotionId)}` + "/segment-suggestions/recommend";
}

export function promotionAnalysisPath(promotionId: string) {
  return `${PROMOTIONS_PATH}/${encodeURIComponent(promotionId)}/analyses`;
}
