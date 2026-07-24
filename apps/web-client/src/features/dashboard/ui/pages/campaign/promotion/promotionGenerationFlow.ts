import { OFFER_SETS, type DashboardStartPromotionGenerationRequest } from "@loopad/shared";

export function offerSetGenerationChannelIsUnsupported(
  isOfferSetGenerationTarget: boolean,
  promotionChannel: string
) {
  return isOfferSetGenerationTarget && promotionChannel !== "email";
}

export function buildPromotionGenerationRequest({
  analysisId,
  confirmedCreatedSegmentAnalysisId,
  createdSegmentId,
  segmentId
}: {
  analysisId: string;
  confirmedCreatedSegmentAnalysisId: string | null;
  createdSegmentId: string | null;
  segmentId: string;
}): DashboardStartPromotionGenerationRequest {
  const isConfirmedCreatedSegment =
    createdSegmentId === segmentId && confirmedCreatedSegmentAnalysisId === analysisId;

  return {
    analysis_id: analysisId,
    segment_id: segmentId,
    content_option_count: 3,
    operator_instruction: null,
    ...(isConfirmedCreatedSegment ? OFFER_SETS.lastcall : {})
  };
}

export function createPromotionGenerationAttemptTracker(
  createKey: () => string = createPromotionGenerationIdempotencyKey
) {
  let activeAttempt: { key: string; signature: string } | null = null;

  return {
    complete() {
      activeAttempt = null;
    },
    idempotencyKey(promotionId: string, request: DashboardStartPromotionGenerationRequest): string {
      const signature = promotionGenerationRequestSignature(promotionId, request);
      if (activeAttempt?.signature !== signature) {
        activeAttempt = { key: createKey(), signature };
      }
      return activeAttempt.key;
    }
  };
}

function createPromotionGenerationIdempotencyKey() {
  return `dashboard-generation:${globalThis.crypto.randomUUID()}`;
}

function promotionGenerationRequestSignature(
  promotionId: string,
  request: DashboardStartPromotionGenerationRequest
) {
  return JSON.stringify([
    promotionId,
    request.analysis_id,
    request.segment_id ?? null,
    request.content_option_count ?? null,
    request.operator_instruction ?? null,
    request.offer_set_id ?? null,
    request.expected_catalog_id ?? null,
    request.expected_catalog_version ?? null
  ]);
}
