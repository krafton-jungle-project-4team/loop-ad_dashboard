import { createHash } from "node:crypto";
import type {
  SegmentAssistantAudienceCondition,
  SegmentAssistantEventName,
  SegmentAssistantPlan,
  SegmentAssistantSourceAudience
} from "./segment-assistant.types.js";

export type SegmentAssistantSourceEventProfile = {
  eventName: SegmentAssistantEventName;
  usersAtLeastOnce: number;
  usersAtLeastTwice: number;
  usersAtLeastThreeTimes: number;
  freeCancellationUsers: number;
  breakfastIncludedUsers: number;
};

export type SegmentAssistantSourceRefinementCandidate = {
  condition: SegmentAssistantAudienceCondition;
  dimensionKey: string;
  key: string;
  priority: number;
  prompt: string;
  sampleSize: number;
};

type EventPresentation = {
  label: string;
  priority: number;
  supportsBenefitProperties?: boolean;
  supportsPositiveCondition?: boolean;
};

const EVENT_PRESENTATION: Record<SegmentAssistantEventName, EventPresentation> = {
  page_view: { label: "페이지 조회", priority: 0 },
  hotel_search: {
    label: "숙소 검색",
    priority: 8,
    supportsBenefitProperties: true,
    supportsPositiveCondition: true
  },
  hotel_click: {
    label: "숙소 클릭",
    priority: 7,
    supportsBenefitProperties: true,
    supportsPositiveCondition: true
  },
  hotel_detail_view: {
    label: "호텔 상세 조회",
    priority: 10,
    supportsBenefitProperties: true,
    supportsPositiveCondition: true
  },
  promotion_impression: { label: "프로모션 노출", priority: 1 },
  promotion_click: {
    label: "프로모션 클릭",
    priority: 6,
    supportsPositiveCondition: true
  },
  campaign_redirect_click: {
    label: "캠페인 이동 클릭",
    priority: 5,
    supportsPositiveCondition: true
  },
  campaign_landing: {
    label: "캠페인 랜딩 방문",
    priority: 4,
    supportsPositiveCondition: true
  },
  booking_start: {
    label: "예약 시작",
    priority: 9,
    supportsBenefitProperties: true,
    supportsPositiveCondition: true
  },
  booking_complete: { label: "예약 완료", priority: 8 },
  booking_cancel: {
    label: "예약 취소",
    priority: 3,
    supportsPositiveCondition: true
  }
};

const IMPLIED_EVENT_MINIMUMS: Record<string, Partial<Record<SegmentAssistantEventName, number>>> = {
  booking_start_without_complete: { booking_start: 1 },
  promotion_response: { promotion_click: 1 }
};

const IMPLIED_ABSENT_EVENTS: Record<string, SegmentAssistantEventName[]> = {
  booking_start_without_complete: ["booking_complete"]
};

const HARD_PREDICATE_LABELS: Record<string, string> = {
  hotel_product_interest: "숙소 관심 행동",
  target_destination_affinity: "프로모션 목적지 반복 탐색",
  booking_start_without_complete: "예약 시작 후 미완료",
  benefit_interest: "혜택 관심 행동",
  promotion_response: "프로모션 반응",
  general_destination_exploration: "여러 목적지 비교 탐색",
  recent_destination_search: "프로모션 목적지 탐색",
  season_match: "프로모션 시즌 일치"
};

export function buildSourceRefinementCandidates(
  profiles: SegmentAssistantSourceEventProfile[],
  source: SegmentAssistantSourceAudience
): SegmentAssistantSourceRefinementCandidate[] {
  const candidates: SegmentAssistantSourceRefinementCandidate[] = [];
  const baseSize = source.base_user_ids.length;
  const impliedMinimums = source.hard_predicate_keys.reduce<
    Partial<Record<SegmentAssistantEventName, number>>
  >((result, key) => {
    for (const [eventName, minimum] of Object.entries(IMPLIED_EVENT_MINIMUMS[key] ?? {})) {
      const typedEventName = eventName as SegmentAssistantEventName;
      result[typedEventName] = Math.max(result[typedEventName] ?? 0, minimum ?? 0);
    }
    return result;
  }, {});
  const impliedAbsentEvents = new Set(
    source.hard_predicate_keys.flatMap((key) => IMPLIED_ABSENT_EVENTS[key] ?? [])
  );
  const profileByEvent = new Map(profiles.map((profile) => [profile.eventName, profile]));

  for (const profile of profiles) {
    const presentation = EVENT_PRESENTATION[profile.eventName];
    if (presentation.supportsPositiveCondition) {
      const thresholdSamples = [
        [1, profile.usersAtLeastOnce],
        [2, profile.usersAtLeastTwice],
        [3, profile.usersAtLeastThreeTimes]
      ] as const;
      for (const [minimumCount, sampleSize] of thresholdSamples) {
        if ((impliedMinimums[profile.eventName] ?? 0) >= minimumCount) continue;
        addCandidate(candidates, {
          condition: eventCountCondition(profile.eventName, presentation.label, minimumCount),
          dimensionKey: `event:${profile.eventName}`,
          priority: presentation.priority,
          sampleSize
        });
      }
    }

    if (presentation.supportsBenefitProperties) {
      addCandidate(candidates, {
        condition: benefitCondition(
          profile.eventName,
          presentation.label,
          "free_cancellation",
          "무료 취소 가능 숙소"
        ),
        dimensionKey: "property:free_cancellation",
        priority: presentation.priority + 1,
        sampleSize: profile.freeCancellationUsers
      });
      addCandidate(candidates, {
        condition: benefitCondition(
          profile.eventName,
          presentation.label,
          "breakfast_included",
          "조식 포함 숙소"
        ),
        dimensionKey: "property:breakfast_included",
        priority: presentation.priority + 1,
        sampleSize: profile.breakfastIncludedUsers
      });
    }
  }

  const bookingCompleteUsers = profileByEvent.get("booking_complete")?.usersAtLeastOnce ?? 0;
  if (!impliedAbsentEvents.has("booking_complete")) {
    addCandidate(candidates, {
      condition: {
        label: "예약 완료 이력 없음",
        event_name: "booking_complete",
        minimum_count: 0,
        maximum_count: 0,
        destination: null,
        checkin_months: [],
        property_filters: []
      },
      dimensionKey: "absence:booking_complete",
      priority: 9,
      sampleSize: baseSize - bookingCompleteUsers
    });
  }

  return candidates.filter(
    (candidate) => candidate.sampleSize > 0 && candidate.sampleSize < baseSize
  );
}

export function selectSourceRefinementCandidates(
  candidates: SegmentAssistantSourceRefinementCandidate[],
  baseSize: number,
  minimumSampleSize: number,
  limit = 3
): SegmentAssistantSourceRefinementCandidate[] {
  const bestByDimension = new Map<string, SegmentAssistantSourceRefinementCandidate>();
  for (const candidate of candidates) {
    const current = bestByDimension.get(candidate.dimensionKey);
    if (
      !current ||
      refinementUtility(candidate, baseSize, minimumSampleSize) >
        refinementUtility(current, baseSize, minimumSampleSize)
    ) {
      bestByDimension.set(candidate.dimensionKey, candidate);
    }
  }
  return [...bestByDimension.values()]
    .sort(
      (left, right) =>
        refinementUtility(right, baseSize, minimumSampleSize) -
          refinementUtility(left, baseSize, minimumSampleSize) ||
        right.sampleSize - left.sampleSize ||
        left.key.localeCompare(right.key)
    )
    .slice(0, limit);
}

export function sourceBaseConditionLabels(hardPredicateKeys: string[]): string[] {
  return hardPredicateKeys.map((key) => HARD_PREDICATE_LABELS[key] ?? key);
}

export function buildSourceEditableConditions(
  hardPredicateKeys: string[],
  referenceLabels: string[]
): SegmentAssistantAudienceCondition[] {
  let conditions: SegmentAssistantAudienceCondition[] = [];
  if (hardPredicateKeys.includes("booking_start_without_complete")) {
    conditions = upsertRefinementCondition(conditions, {
      ...eventCountCondition("booking_start", "예약 시작", 1),
      label: "예약 시작"
    });
    conditions = upsertRefinementCondition(conditions, {
      label: "예약 미완료",
      event_name: "booking_complete",
      minimum_count: 0,
      maximum_count: 0,
      destination: null,
      checkin_months: [],
      property_filters: []
    });
  }
  if (hardPredicateKeys.includes("promotion_response")) {
    conditions = upsertRefinementCondition(conditions, {
      ...eventCountCondition("promotion_click", "프로모션 클릭", 1),
      label: "프로모션 클릭"
    });
  }

  for (const label of referenceLabels) {
    for (const condition of editableConditionsForReferenceLabel(label)) {
      conditions = upsertConditionPreservingOrder(conditions, condition);
    }
  }
  return conditions;
}

export function isSourceBaseConditionEditRequest(
  message: string,
  baseConditions: SegmentAssistantAudienceCondition[]
) {
  if (!/(?:대신|바꿔|변경|교체|수정|완화|강화|빼|제외|삭제|없애)/.test(message)) {
    return false;
  }
  const mentionedEvents = new Set(referenceLabelEvents(message));
  return baseConditions.some((condition) => mentionedEvents.has(condition.event_name));
}

export function applySourceBaseConditionEdit(
  currentConditions: SegmentAssistantAudienceCondition[],
  plannedConditions: SegmentAssistantAudienceCondition[],
  message: string
) {
  const removedEvents = sourceConditionRemovalEvents(message);
  let conditions = currentConditions.filter(
    (condition) => !removedEvents.has(condition.event_name)
  );
  for (const condition of plannedConditions) {
    if (removedEvents.has(condition.event_name)) continue;
    conditions = upsertConditionPreservingOrder(conditions, condition);
  }
  return conditions;
}

export function sourceConditionsEqual(
  left: SegmentAssistantAudienceCondition[],
  right: SegmentAssistantAudienceCondition[]
) {
  const normalized = (conditions: SegmentAssistantAudienceCondition[]) =>
    conditions
      .map((condition) =>
        JSON.stringify({
          checkin_months: [...condition.checkin_months].sort((a, b) => a - b),
          destination: condition.destination,
          event_name: condition.event_name,
          maximum_count: condition.maximum_count,
          minimum_count: condition.minimum_count,
          property_filters: condition.property_filters
            .map((filter) => ({
              key: filter.key,
              operator: filter.operator,
              value: filter.value
            }))
            .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))
        })
      )
      .sort();
  return JSON.stringify(normalized(left)) === JSON.stringify(normalized(right));
}

export function upsertRefinementCondition(
  conditions: SegmentAssistantPlan["conditions"],
  nextCondition: SegmentAssistantAudienceCondition
): SegmentAssistantPlan["conditions"] {
  const nextIdentity = conditionIdentity(nextCondition);
  const retained = conditions.filter((condition) => conditionIdentity(condition) !== nextIdentity);
  return [...retained, nextCondition];
}

export function removeUnchangedSourceConditions(
  conditions: SegmentAssistantPlan["conditions"],
  referenceLabels: string[]
): SegmentAssistantPlan["conditions"] {
  const referencedEvents = new Set(referenceLabels.flatMap((label) => referenceLabelEvents(label)));
  return conditions.filter((condition) => {
    if (!referencedEvents.has(condition.event_name)) {
      return true;
    }
    return !isDefaultReferenceCondition(condition);
  });
}

function addCandidate(
  candidates: SegmentAssistantSourceRefinementCandidate[],
  input: {
    condition: SegmentAssistantAudienceCondition;
    dimensionKey: string;
    priority: number;
    sampleSize: number;
  }
) {
  const key = sourceRefinementKey(input.condition);
  candidates.push({
    condition: input.condition,
    dimensionKey: input.dimensionKey,
    key,
    priority: input.priority,
    prompt: `추천 고객군 안에서 '${input.condition.label}' 조건으로 좁혀줘`,
    sampleSize: input.sampleSize
  });
}

function sourceRefinementKey(condition: SegmentAssistantAudienceCondition) {
  return `ref_${createHash("sha256").update(JSON.stringify(condition)).digest("hex").slice(0, 16)}`;
}

function eventCountCondition(
  eventName: SegmentAssistantEventName,
  eventLabel: string,
  minimumCount: number
): SegmentAssistantAudienceCondition {
  return {
    label: `${eventLabel} ${minimumCount}회 이상`,
    event_name: eventName,
    minimum_count: minimumCount,
    maximum_count: null,
    destination: null,
    checkin_months: [],
    property_filters: []
  };
}

function benefitCondition(
  eventName: SegmentAssistantEventName,
  eventLabel: string,
  propertyKey: "free_cancellation" | "breakfast_included",
  benefitLabel: string
): SegmentAssistantAudienceCondition {
  return {
    label: `${benefitLabel} ${eventLabel}`,
    event_name: eventName,
    minimum_count: 1,
    maximum_count: null,
    destination: null,
    checkin_months: [],
    property_filters: [{ key: propertyKey, operator: "equals", value: "true" }]
  };
}

function conditionIdentity(condition: SegmentAssistantAudienceCondition) {
  return JSON.stringify({
    checkin_months: condition.checkin_months,
    destination: condition.destination,
    event_name: condition.event_name,
    property_filters: condition.property_filters.map((filter) => ({
      key: filter.key,
      operator: filter.operator
    }))
  });
}

function upsertConditionPreservingOrder(
  conditions: SegmentAssistantAudienceCondition[],
  nextCondition: SegmentAssistantAudienceCondition
) {
  const nextIdentity = conditionIdentity(nextCondition);
  const existingIndex = conditions.findIndex(
    (condition) => conditionIdentity(condition) === nextIdentity
  );
  return existingIndex >= 0
    ? conditions.map((condition, index) => (index === existingIndex ? nextCondition : condition))
    : [...conditions, nextCondition];
}

function referenceLabelEvents(label: string): SegmentAssistantEventName[] {
  const normalized = label.replace(/\s+/g, "");
  const events: SegmentAssistantEventName[] = [];
  if (
    /숙소(?:검색|탐색)|호텔(?:검색|탐색)|목적지(?:검색|탐색)|여행지탐색|반복탐색/.test(normalized)
  ) {
    events.push("hotel_search");
  }
  if (/상세조회|숙소조회|호텔조회/.test(normalized)) events.push("hotel_detail_view");
  if (/예약시작|예약이탈/.test(normalized)) events.push("booking_start");
  if (/예약미완료|예약완료없음|미예약/.test(normalized)) {
    events.push("booking_complete");
  } else if (/예약완료/.test(normalized)) {
    events.push("booking_complete");
  }
  if (/프로모션반응|프로모션클릭|캠페인반응/.test(normalized)) {
    events.push("promotion_click");
  }
  return events;
}

function editableConditionsForReferenceLabel(label: string): SegmentAssistantAudienceCondition[] {
  const conditions: SegmentAssistantAudienceCondition[] = [];
  const minimumCount = /(?:반복|2\s*(?:회|번)|두\s*번)/.test(label) ? 2 : 1;
  for (const eventName of referenceLabelEvents(label)) {
    if (eventName === "booking_complete" && /미완료|완료\s*(?:없음|제외)|미예약/.test(label)) {
      conditions.push({
        label: "예약 미완료",
        event_name: eventName,
        minimum_count: 0,
        maximum_count: 0,
        destination: null,
        checkin_months: [],
        property_filters: []
      });
      continue;
    }
    const eventLabel = EVENT_PRESENTATION[eventName].label;
    conditions.push({
      ...eventCountCondition(eventName, eventLabel, minimumCount),
      label: label.trim()
    });
  }
  return conditions;
}

function sourceConditionRemovalEvents(message: string) {
  if (!/(?:빼|제외|삭제|없애)/.test(message)) {
    return new Set<SegmentAssistantEventName>();
  }
  if (/예약\s*완료\s*고객(?:을|를)?\s*제외/.test(message)) {
    return new Set<SegmentAssistantEventName>();
  }
  return new Set(referenceLabelEvents(message));
}

function isDefaultReferenceCondition(condition: SegmentAssistantAudienceCondition) {
  const isUnscoped =
    condition.destination === null &&
    condition.checkin_months.length === 0 &&
    condition.property_filters.length === 0;
  if (!isUnscoped) return false;
  if (condition.event_name === "booking_complete") {
    return condition.minimum_count === 0 && condition.maximum_count === 0;
  }
  return condition.minimum_count === 1 && condition.maximum_count === null;
}

function refinementUtility(
  candidate: SegmentAssistantSourceRefinementCandidate,
  baseSize: number,
  minimumSampleSize: number
) {
  const retention = baseSize > 0 ? candidate.sampleSize / baseSize : 0;
  const operationalBonus = candidate.sampleSize >= minimumSampleSize ? 4 : 0;
  return operationalBonus + 1 - Math.abs(retention - 0.6) + candidate.priority / 100;
}
