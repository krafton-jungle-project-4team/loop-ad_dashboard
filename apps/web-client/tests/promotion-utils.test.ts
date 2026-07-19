import assert from "node:assert/strict";
import test from "node:test";
import {
  DashboardCreatePromotionRequestSchema,
  type DashboardCampaignPromotion,
  type DashboardSegmentDetail
} from "@loopad/shared";
import {
  activeContentCandidates,
  canStartAdExperiment,
  contentCandidateHtmlArtifact,
  contentCandidateIsReadyForSelection,
  contentCandidateTitle,
  createEmptyPromotionFormState,
  nextExperimentLoopCount,
  normalizeSegmentDisplayCopy,
  promotionOfferLinksAreValid,
  promotionFormToUpdateRequest,
  promotionToFormState
} from "../src/features/dashboard/ui/pages/campaign/promotion/promotionUtils.js";

test("ad experiments can start from the statuses accepted by the dashboard API", () => {
  assert.equal(canStartAdExperiment("planned"), true);
  assert.equal(canStartAdExperiment("approved"), true);
  assert.equal(canStartAdExperiment("created"), false);
  assert.equal(canStartAdExperiment("ready"), false);
  assert.equal(canStartAdExperiment("running"), false);
});

test("promotion edit maps every field exposed by the create form", () => {
  const promotion = {
    channel: "sms",
    goal_basis: "all_segments",
    goal_metric: "booking_conversion_rate",
    goal_target_value: 0.25,
    landing_url: "https://example.com/promotion",
    marketing_theme: "여름 프로모션",
    max_loop_count: 5,
    message_brief: "예약 전환 프로모션",
    min_sample_size: 250,
    status: "approved"
  } as DashboardCampaignPromotion;

  const request = promotionFormToUpdateRequest(promotionToFormState(promotion));

  assert.deepEqual(request, {
    channel: "sms",
    goal_basis: "all_segments",
    goal_metric: "booking_conversion_rate",
    goal_target_value: 0.25,
    landing_url: "https://example.com/promotion",
    marketing_theme: "여름 프로모션",
    max_loop_count: 5,
    message_brief: "예약 전환 프로모션",
    min_sample_size: 250,
    offer_links: []
  });
});

test("promotion form preserves offer links for Decision generation metadata", () => {
  const promotion = {
    channel: "email",
    goal_basis: "all_segments",
    goal_metric: "booking_conversion_rate",
    goal_target_value: 0.25,
    landing_url: "https://example.com/promotion",
    marketing_theme: "여름 프로모션",
    max_loop_count: 5,
    message_brief: "예약 전환 프로모션",
    min_sample_size: 250,
    offer_links: [
      {
        offer_id: "jeju-ocean-breeze-006",
        destination_url: "https://example.com/hotel/jeju-ocean-breeze-006"
      }
    ],
    status: "approved"
  } as DashboardCampaignPromotion;

  const form = promotionToFormState(promotion);
  const request = promotionFormToUpdateRequest(form);

  assert.equal(promotionOfferLinksAreValid(form), true);
  assert.deepEqual(request.offer_links, promotion.offer_links);
});

test("new email promotions require at least one complete offer link", () => {
  const form = createEmptyPromotionFormState();

  assert.deepEqual(form.offerLinks, [{ destinationUrl: "", offerId: "" }]);
  assert.equal(promotionOfferLinksAreValid(form), false);
  assert.equal(promotionOfferLinksAreValid({ ...form, offerLinks: [] }), false);
  assert.equal(
    promotionOfferLinksAreValid({
      ...form,
      offerLinks: [
        {
          destinationUrl: "https://demo-shoppingmall.dev.loop-ad.org/hotel/jeju-ocean-breeze-006",
          offerId: "jeju-ocean-breeze-006"
        }
      ]
    }),
    true
  );
  assert.equal(promotionOfferLinksAreValid({ ...form, channel: "sms", offerLinks: [] }), true);
});

test("promotion offer link contract remains optional and rejects invalid entries", () => {
  const legacyRequest = {
    channel: "email",
    marketing_theme: "legacy",
    goal_metric: "inflow_rate",
    goal_target_value: 0.1,
    goal_basis: "promotion_average",
    landing_url: "https://example.com/promotion"
  };

  assert.equal(DashboardCreatePromotionRequestSchema.safeParse(legacyRequest).success, true);
  assert.equal(
    DashboardCreatePromotionRequestSchema.safeParse({
      ...legacyRequest,
      offer_links: [{ offer_id: "hotel-1", destination_url: "ftp://example.com/hotel/1" }]
    }).success,
    false
  );
  assert.equal(
    DashboardCreatePromotionRequestSchema.safeParse({
      ...legacyRequest,
      offer_links: [
        { offer_id: "hotel-1", destination_url: "https://example.com/hotel/1" },
        { offer_id: "hotel-1", destination_url: "https://example.com/hotel/2" }
      ]
    }).success,
    false
  );
});

test("creative selection only uses candidates from the segment's active analysis", () => {
  const detail = {
    content_candidates: [
      { analysis_id: "analysis_old", content_id: "content_old" },
      { analysis_id: "analysis_repeat", content_id: "content_repeat", status: "draft" },
      { analysis_id: "analysis_repeat", content_id: "content_archived", status: "archived" }
    ],
    segment: { analysis_id: "analysis_repeat" }
  } as DashboardSegmentDetail;

  assert.deepEqual(
    activeContentCandidates(detail).map((candidate) => candidate.content_id),
    ["content_repeat"]
  );
});

test("creative title never exposes an internal content id", () => {
  const candidate = {
    body: null,
    content_id: "email_ai_raw_internal_id",
    message: null,
    subject: null,
    title: null
  } as DashboardSegmentDetail["content_candidates"][number];

  assert.equal(contentCandidateTitle(candidate), "광고 소재 후보");
});

test("HTML creative artifact is exposed only for valid HTML metadata", () => {
  const candidate = {
    metadata_json: {
      creative: {
        artifact: {
          artifact_status: "published",
          creative_format: "email_html",
          public_url: "https://assets.example.com/creative.html"
        }
      }
    }
  } as DashboardSegmentDetail["content_candidates"][number];

  assert.deepEqual(contentCandidateHtmlArtifact(candidate), {
    artifact_status: "published",
    creative_format: "email_html",
    public_url: "https://assets.example.com/creative.html"
  });
});

test("HTML creative artifact ignores malformed metadata and text-only creatives", () => {
  const malformedCandidate = {
    metadata_json: { creative: { artifact: { artifact_status: "published" } } }
  } as DashboardSegmentDetail["content_candidates"][number];
  const smsCandidate = {
    metadata_json: {
      creative: {
        artifact: {
          artifact_status: "not_required",
          creative_format: "sms_text"
        }
      }
    }
  } as DashboardSegmentDetail["content_candidates"][number];

  assert.equal(contentCandidateHtmlArtifact(malformedCandidate), null);
  assert.equal(contentCandidateHtmlArtifact(smsCandidate), null);
});

test("creative selection waits for every required image and HTML artifact", () => {
  const readyEmailCandidate = {
    channel: "email",
    image_prompt: "호텔 이미지",
    image_url: "https://assets.example.com/creative.png",
    metadata_json: {
      creative: {
        artifact: {
          artifact_status: "published",
          creative_format: "email_html",
          public_url: "https://assets.example.com/creative.html"
        }
      }
    }
  } as DashboardSegmentDetail["content_candidates"][number];
  const pendingHtmlCandidate = {
    ...readyEmailCandidate,
    metadata_json: {
      creative: {
        artifact: {
          artifact_status: "pending",
          creative_format: "email_html"
        }
      }
    }
  } as DashboardSegmentDetail["content_candidates"][number];
  const pendingImageCandidate = {
    ...readyEmailCandidate,
    image_url: null
  } as DashboardSegmentDetail["content_candidates"][number];
  const readySmsCandidate = {
    channel: "sms",
    image_prompt: null,
    image_url: null,
    metadata_json: {}
  } as DashboardSegmentDetail["content_candidates"][number];

  assert.equal(contentCandidateIsReadyForSelection(readyEmailCandidate), true);
  assert.equal(contentCandidateIsReadyForSelection(pendingHtmlCandidate), false);
  assert.equal(contentCandidateIsReadyForSelection(pendingImageCandidate), false);
  assert.equal(contentCandidateIsReadyForSelection(readySmsCandidate), true);
});

test("the next experiment increments the highest loop for its segment", () => {
  const detail = {
    ad_experiments: [
      { loop_count: 1, promotion_run_id: "run-1" },
      { loop_count: 2, promotion_run_id: "run-2" }
    ]
  } as DashboardSegmentDetail;

  assert.equal(nextExperimentLoopCount(detail), 3);
  assert.equal(nextExperimentLoopCount(detail, "run-2"), 2);
  assert.equal(nextExperimentLoopCount(detail, "run-1"), 3);
  assert.equal(nextExperimentLoopCount({ ad_experiments: [] } as DashboardSegmentDetail), 1);
});

test("segment display copy preserves strategy metadata and legacy candidate context", () => {
  const displayCopy = normalizeSegmentDisplayCopy({
    title: "이번 여행지를 반복 탐색한 고객",
    strategy_role: "이번 목적지 반복 관심형",
    strength_summary: "이번 여행지를 반복 탐색한 행동이 확인됐습니다.",
    tradeoff_summary: "대표 표본이 작아 도달 규모는 제한적입니다.",
    audience_summary: "조건 일치 4명",
    signal_chips: ["목적지 반복"],
    reason: "반복 탐색 행동이 확인됐습니다.",
    action_hint: "별도 개인화 실험으로 검토하세요.",
    recommendation_tier: "small_high_intent",
    recommendation_tier_label: "소규모 고의도 후보",
    recommendation_tier_reason: "예측 기준 표본보다 적습니다.",
    recommendation_rank: null,
    rank_eligible: false,
    minimum_primary_sample_size: "30"
  });

  assert.equal(displayCopy?.strategy_role, "이번 목적지 반복 관심형");
  assert.equal(displayCopy?.strength_summary, "이번 여행지를 반복 탐색한 행동이 확인됐습니다.");
  assert.equal(displayCopy?.tradeoff_summary, "대표 표본이 작아 도달 규모는 제한적입니다.");
  assert.equal(displayCopy?.recommendation_tier, "small_high_intent");
  assert.equal(displayCopy?.recommendation_rank, undefined);
  assert.equal(displayCopy?.rank_eligible, false);
  assert.equal(displayCopy?.minimum_primary_sample_size, 30);
});
