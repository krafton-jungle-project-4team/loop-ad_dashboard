import {
  SegmentAssistantExecutionStateSchema,
  SegmentAssistantPlanSchema,
  type SegmentAssistantExecutionState,
  type SegmentAssistantPlan
} from "./segment-assistant.types.js";

const CUSTOM_STRUCTURED_TEMPLATE_HASH =
  "165d6dbaf584f1042941cce1ad218f216d8d086f8a8990ab918a2a4feb024d39";
const CUSTOM_SOURCE_REFINEMENT_TEMPLATE_HASH =
  "f7268670dd9a6446f1250860cb535d3ce4da06b0759575361344db3fa459bad5";
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
  const state = parseSavedAssistantState(queryParamsJson);
  const plan = state.assistant_plan;
  if (plan.action === "clarification" || (plan.conditions.length === 0 && !state.source_audience)) {
    throw new Error("Saved custom segments require executable structured conditions.");
  }
  if (plan.lookback_days !== CUSTOM_STRUCTURED_WINDOW_DAYS) {
    throw new Error("Saved custom segments require the active 30-day behavior window.");
  }

  const sourceAudience = state.source_audience;
  const conditionKeys = sourceAudience
    ? [
        "source_audience_membership",
        ...(plan.conditions.length > 0 ? ["structured_conditions"] : [])
      ]
    : ["structured_conditions"];
  return {
    audience_resolution_contract: "segment_audience.v1",
    segment_audience_spec: {
      schema_version: "hotel_behavior.v2",
      template_id: "custom_structured_condition",
      template_version: sourceAudience ? 2 : 1,
      template_semantic_hash: sourceAudience
        ? CUSTOM_SOURCE_REFINEMENT_TEMPLATE_HASH
        : CUSTOM_STRUCTURED_TEMPLATE_HASH,
      candidate_type: "custom_structured",
      condition_keys: conditionKeys,
      query_signal_keys: customQuerySignalKeys(plan),
      hard_predicate_keys: conditionKeys,
      parameters: {
        lookback_days: plan.lookback_days,
        conditions: plan.conditions,
        ...(sourceAudience ? { base_user_ids: sourceAudience.base_user_ids } : {})
      },
      parameter_policy_id: sourceAudience
        ? "custom_structured_parameters.v2"
        : "custom_structured_parameters.v1",
      semantic_selection_policy_id: sourceAudience
        ? "source_refinement_exact_membership.v1"
        : "exact_predicate_membership.v1",
      semantic_anchor_policy_id: sourceAudience
        ? "source_membership_with_optional_structured_conditions.v1"
        : "structured_conditions_no_anchor.v1",
      observation_window_days: CUSTOM_STRUCTURED_WINDOW_DAYS
    }
  };
}

function parseSavedAssistantState(queryParamsJson: unknown): SegmentAssistantExecutionState {
  if (!queryParamsJson || typeof queryParamsJson !== "object" || Array.isArray(queryParamsJson)) {
    throw new Error("Saved custom segment preview is missing structured conditions.");
  }
  const raw = queryParamsJson as Record<string, unknown>;
  return SegmentAssistantExecutionStateSchema.parse({
    assistant_plan: SegmentAssistantPlanSchema.parse(raw.assistant_plan),
    ...(raw.source_audience ? { source_audience: raw.source_audience } : {})
  });
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
