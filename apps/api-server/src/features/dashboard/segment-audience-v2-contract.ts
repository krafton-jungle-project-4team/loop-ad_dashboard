import {
  SegmentAssistantPlanSchema,
  type SegmentAssistantPlan
} from "./segment-assistant.types.js";

const CUSTOM_STRUCTURED_TEMPLATE_HASH =
  "165d6dbaf584f1042941cce1ad218f216d8d086f8a8990ab918a2a4feb024d39";
const CUSTOM_STRUCTURED_WINDOW_DAYS = 30;

const EVENT_QUERY_SIGNALS: Partial<
  Record<SegmentAssistantPlan["conditions"][number]["event_name"], string>
> = {
  hotel_search: "hotel_search_intensity",
  hotel_click: "hotel_click_intensity",
  hotel_detail_view: "hotel_detail_view_intensity",
  promotion_impression: "promotion_impression_intensity",
  promotion_click: "promotion_click_intensity",
  campaign_redirect_click: "campaign_redirect_intensity",
  campaign_landing: "campaign_landing_intensity",
  booking_start: "booking_start_intensity"
};

export function buildCustomStructuredAudienceRule(queryParamsJson: unknown) {
  const plan = parseSavedAssistantPlan(queryParamsJson);
  if (plan.action === "clarification" || plan.conditions.length === 0) {
    throw new Error("Saved custom segments require executable structured conditions.");
  }
  if (plan.lookback_days !== CUSTOM_STRUCTURED_WINDOW_DAYS) {
    throw new Error("Saved custom segments require the active 30-day behavior window.");
  }

  return {
    audience_resolution_contract: "segment_audience.v1",
    segment_audience_spec: {
      schema_version: "hotel_behavior.v2",
      template_id: "custom_structured_condition",
      template_version: 1,
      template_semantic_hash: CUSTOM_STRUCTURED_TEMPLATE_HASH,
      candidate_type: "custom_structured",
      condition_keys: ["structured_conditions"],
      query_signal_keys: customQuerySignalKeys(plan),
      hard_predicate_keys: ["structured_conditions"],
      parameters: {
        lookback_days: plan.lookback_days,
        conditions: plan.conditions
      },
      parameter_policy_id: "custom_structured_parameters.v1",
      semantic_selection_policy_id: "exact_predicate_membership.v1",
      semantic_anchor_policy_id: "structured_conditions_no_anchor.v1",
      observation_window_days: CUSTOM_STRUCTURED_WINDOW_DAYS
    }
  };
}

function parseSavedAssistantPlan(queryParamsJson: unknown): SegmentAssistantPlan {
  if (!queryParamsJson || typeof queryParamsJson !== "object" || Array.isArray(queryParamsJson)) {
    throw new Error("Saved custom segment preview is missing structured conditions.");
  }
  return SegmentAssistantPlanSchema.parse(
    (queryParamsJson as Record<string, unknown>).assistant_plan
  );
}

function customQuerySignalKeys(plan: SegmentAssistantPlan): string[] {
  const signals = new Set<string>();
  for (const condition of plan.conditions) {
    if (condition.minimum_count <= 0) continue;
    const signal = EVENT_QUERY_SIGNALS[condition.event_name];
    if (signal) signals.add(signal);
  }
  const hasBookingStart = plan.conditions.some(
    (condition) => condition.event_name === "booking_start" && condition.minimum_count > 0
  );
  const hasNoBookingComplete = plan.conditions.some(
    (condition) => condition.event_name === "booking_complete" && condition.maximum_count === 0
  );
  if (hasBookingStart && hasNoBookingComplete) {
    signals.add("booking_start_without_complete");
  }
  if (signals.size === 0) {
    signals.add("hotel_consideration_intensity");
  }
  return [...signals].sort();
}
