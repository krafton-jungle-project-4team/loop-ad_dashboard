import { createHash } from "node:crypto";
import {
  SegmentAssistantExecutionStateSchema,
  SegmentAssistantPlanSchema,
  type SegmentAssistantExecutionState,
  type SegmentAssistantPlan,
  usesSourceAudienceMembership
} from "./segment-assistant.types.js";

const CUSTOM_STRUCTURED_MIN_WINDOW_DAYS = 1;
const CUSTOM_STRUCTURED_MAX_WINDOW_DAYS = 365;

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
  const sourceAudience = state.source_audience;
  const usesSourceMembership = usesSourceAudienceMembership(plan, sourceAudience);
  if (plan.action === "clarification" || (plan.conditions.length === 0 && !usesSourceMembership)) {
    throw new Error("Saved custom segments require executable structured conditions.");
  }
  const conditionKeys = usesSourceMembership
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
      template_version: usesSourceMembership ? 2 : 1,
      template_semantic_hash: customStructuredTemplateHash(
        usesSourceMembership ? 2 : 1,
        plan.lookback_days
      ),
      candidate_type: "custom_structured",
      condition_keys: conditionKeys,
      query_signal_keys: customQuerySignalKeys(plan),
      hard_predicate_keys: conditionKeys,
      parameters: {
        lookback_days: plan.lookback_days,
        conditions: plan.conditions,
        ...(usesSourceMembership ? { base_user_ids: sourceAudience?.base_user_ids } : {})
      },
      parameter_policy_id: usesSourceMembership
        ? "custom_structured_parameters.v2"
        : "custom_structured_parameters.v1",
      semantic_selection_policy_id: usesSourceMembership
        ? "source_refinement_exact_membership.v1"
        : "exact_predicate_membership.v1",
      semantic_anchor_policy_id: usesSourceMembership
        ? "source_membership_with_optional_structured_conditions.v1"
        : "structured_conditions_no_anchor.v1",
      observation_window_days: plan.lookback_days
    }
  };
}

function customStructuredTemplateHash(templateVersion: 1 | 2, windowDays: number) {
  if (
    !Number.isInteger(windowDays) ||
    windowDays < CUSTOM_STRUCTURED_MIN_WINDOW_DAYS ||
    windowDays > CUSTOM_STRUCTURED_MAX_WINDOW_DAYS
  ) {
    throw new Error("Custom structured window must be between 1 and 365 days.");
  }
  const semantics =
    templateVersion === 1
      ? {
          candidate_type: "custom_structured",
          conditions: "allowlisted_event_property_count_conjunction",
          schema_version: "hotel_behavior.v2",
          selection: "exact_predicate_membership_vector_tiebreak_only",
          template_id: "custom_structured_condition",
          template_version: 1,
          window_days: windowDays
        }
      : {
          base_membership: "canonical_source_suggestion_user_ids",
          candidate_type: "custom_structured",
          conditions: "optional_allowlisted_event_property_count_conjunction",
          schema_version: "hotel_behavior.v2",
          selection: "source_membership_with_optional_exact_predicate_membership",
          template_id: "custom_structured_condition",
          template_version: 2,
          window_days: windowDays
        };
  return createHash("sha256").update(JSON.stringify(semantics), "utf8").digest("hex");
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
