import type {
  TrackingPlan,
  TrackingPlanCreateRequest,
  TrackingPlanEvent,
  TrackingPlanEventInput,
  TrackingPlanEventUpdate,
  TrackingPlanJsonSchema,
  TrackingPlanPropertyType
} from "@loopad/shared";

type MarketingProperty = readonly [
  name: string,
  type: Exclude<TrackingPlanPropertyType, "array" | "object">,
  required?: boolean
];

const STUB_DELAY_MS = 180;
const DEFAULT_ORIGIN = "https://demo-shoppingmall.dev.loop-ad.org";

const MARKETING_EVENTS: readonly TrackingPlanEvent[] = [
  marketingEvent("page_view", "고객이 어떤 화면과 콘텐츠를 탐색했는지 확인해요.", [
    ["customer_name", "string"],
    ["gender", "string"],
    ["age_group", "string"],
    ["region", "string"],
    ["user_segment", "string"],
    ["preferred_category", "string"],
    ["page_name", "string", true],
    ["page_category", "string", true],
    ["device", "string"]
  ]),
  marketingEvent(
    "hotel_search",
    "고객이 원하는 여행지와 숙박 조건을 바탕으로 여행 수요를 파악해요.",
    [
      ["customer_name", "string"],
      ["gender", "string"],
      ["age_group", "string"],
      ["region", "string"],
      ["preferred_category", "string"],
      ["destination", "string", true],
      ["check_in", "string", true],
      ["check_out", "string", true],
      ["guest_count", "integer"],
      ["room_count", "integer"]
    ]
  ),
  marketingEvent("hotel_detail_view", "고객이 관심 있게 살펴본 숙소의 특징과 가격대를 확인해요.", [
    ["customer_name", "string"],
    ["user_segment", "string"],
    ["preferred_category", "string"],
    ["hotel_name", "string", true],
    ["destination", "string", true],
    ["neighborhood", "string"],
    ["star_rating", "number"],
    ["guest_rating", "number"],
    ["price_per_night", "number"],
    ["refundable", "boolean"]
  ]),
  marketingEvent("hotel_click", "검색 결과에서 고객의 선택을 받은 숙소와 선호 조건을 확인해요.", [
    ["customer_name", "string"],
    ["gender", "string"],
    ["age_group", "string"],
    ["user_segment", "string"],
    ["hotel_name", "string", true],
    ["destination", "string", true],
    ["property_type", "string"],
    ["price_range", "string"],
    ["refundable", "boolean"],
    ["breakfast_included", "boolean"]
  ]),
  marketingEvent("booking_start", "예약을 시작한 고객의 숙박 조건과 결제 의향을 확인해요.", [
    ["customer_name", "string"],
    ["gender", "string"],
    ["age_group", "string"],
    ["hotel_name", "string", true],
    ["room_name", "string", true],
    ["check_in", "string", true],
    ["check_out", "string", true],
    ["guest_count", "integer"],
    ["booking_value", "number"],
    ["payment_option", "string"]
  ]),
  marketingEvent("booking_complete", "예약을 완료한 고객의 구매 특성과 여행 선호를 확인해요.", [
    ["customer_name", "string"],
    ["gender", "string"],
    ["age_group", "string"],
    ["user_segment", "string"],
    ["hotel_name", "string", true],
    ["room_name", "string", true],
    ["destination", "string"],
    ["stay_length", "integer"],
    ["booking_value", "number", true],
    ["payment_option", "string"]
  ]),
  marketingEvent(
    "booking_cancel",
    "예약을 취소한 고객의 이탈 시점과 사유를 파악해 재방문 캠페인에 활용해요.",
    [
      ["customer_name", "string"],
      ["user_segment", "string"],
      ["hotel_name", "string", true],
      ["room_name", "string"],
      ["check_in", "string"],
      ["check_out", "string"],
      ["booking_value", "number"],
      ["cancellation_reason", "string", true],
      ["cancelled_at", "string"]
    ]
  ),
  marketingEvent(
    "promotion_impression",
    "프로모션이 어떤 고객에게 어떤 맥락으로 노출됐는지 확인해요.",
    [
      ["customer_name", "string"],
      ["gender", "string"],
      ["age_group", "string"],
      ["region", "string"],
      ["user_segment", "string"],
      ["promotion_name", "string", true],
      ["promotion_channel", "string", true],
      ["placement_page", "string"],
      ["creative_theme", "string"]
    ]
  ),
  marketingEvent("promotion_click", "프로모션에 반응한 고객 특성과 관심 메시지를 확인해요.", [
    ["customer_name", "string"],
    ["gender", "string"],
    ["age_group", "string"],
    ["preferred_category", "string"],
    ["user_segment", "string"],
    ["promotion_name", "string", true],
    ["promotion_channel", "string", true],
    ["creative_theme", "string"],
    ["landing_page", "string"]
  ]),
  marketingEvent(
    "campaign_redirect_click",
    "외부 캠페인에서 유입을 만든 메시지와 채널을 확인해요.",
    [
      ["customer_name", "string"],
      ["user_segment", "string"],
      ["preferred_category", "string"],
      ["campaign_name", "string", true],
      ["campaign_source", "string", true],
      ["campaign_medium", "string"],
      ["promotion_channel", "string"],
      ["landing_page", "string"]
    ]
  ),
  marketingEvent("campaign_landing", "캠페인 랜딩에 도착한 고객군과 관심 주제를 확인해요.", [
    ["customer_name", "string"],
    ["gender", "string"],
    ["age_group", "string"],
    ["region", "string"],
    ["user_segment", "string"],
    ["preferred_category", "string"],
    ["campaign_name", "string", true],
    ["landing_page", "string", true],
    ["deal_name", "string"]
  ])
];

const plans = new Map<string, TrackingPlan>();

export async function getTrackingPlan(projectId: string): Promise<TrackingPlan> {
  await simulateNetwork();
  return clonePlan(getOrCreatePlan(projectId));
}

export async function createTrackingPlan(
  projectId: string,
  request: TrackingPlanCreateRequest
): Promise<TrackingPlan> {
  await simulateNetwork();
  const plan = createPlan(projectId, request.name, request.allowedOrigins ?? [DEFAULT_ORIGIN]);
  plans.set(projectId, plan);
  return clonePlan(plan);
}

export async function createTrackingPlanFromObservedEvents(
  projectId: string
): Promise<TrackingPlan> {
  await simulateNetwork();
  const plan = createPlan(projectId, "Demo Marketing Events", [DEFAULT_ORIGIN]);
  plans.set(projectId, plan);
  return clonePlan(plan);
}

export async function addTrackingPlanEvent(
  projectId: string,
  event: TrackingPlanEventInput
): Promise<TrackingPlan> {
  await simulateNetwork();
  const plan = getOrCreatePlan(projectId);
  if (plan.events.some((candidate) => candidate.eventName === event.eventName)) {
    throw new Error("같은 이름의 이벤트가 이미 있어요.");
  }
  const nextPlan = markDraft(plan, [...plan.events, event]);
  plans.set(projectId, nextPlan);
  return clonePlan(nextPlan);
}

export async function updateTrackingPlanEvent(
  projectId: string,
  eventName: string,
  event: TrackingPlanEventUpdate
): Promise<TrackingPlan> {
  await simulateNetwork();
  const plan = getOrCreatePlan(projectId);
  const nextEvents = plan.events.map((candidate) =>
    candidate.eventName === eventName ? { eventName, ...event } : candidate
  );
  const nextPlan = markDraft(plan, nextEvents);
  plans.set(projectId, nextPlan);
  return clonePlan(nextPlan);
}

export async function deleteTrackingPlanEvent(
  projectId: string,
  eventName: string
): Promise<TrackingPlan> {
  await simulateNetwork();
  const plan = getOrCreatePlan(projectId);
  const nextPlan = markDraft(
    plan,
    plan.events.filter((event) => event.eventName !== eventName)
  );
  plans.set(projectId, nextPlan);
  return clonePlan(nextPlan);
}

function marketingEvent(
  eventName: string,
  description: string,
  properties: readonly MarketingProperty[]
): TrackingPlanEvent {
  const schemaProperties: Record<string, TrackingPlanJsonSchema> = {};
  const required: string[] = [];

  for (const [name, type, isRequired] of properties) {
    schemaProperties[name] = { type };
    if (isRequired) required.push(name);
  }

  return {
    eventName,
    description,
    propertiesSchema: {
      type: "object",
      properties: schemaProperties,
      required
    }
  };
}

function getOrCreatePlan(projectId: string): TrackingPlan {
  const existing = plans.get(projectId);
  if (existing) return existing;
  const plan = createPlan(projectId, "Demo Marketing Events", [DEFAULT_ORIGIN]);
  plans.set(projectId, plan);
  return plan;
}

function createPlan(projectId: string, name: string, allowedOrigins: string[]): TrackingPlan {
  return {
    trackingPlanId: `stub-tracking-plan-${projectId}`,
    projectId,
    name,
    status: "published",
    currentRevision: 1,
    publishedRevision: 1,
    sdkKey: "stub-write-key",
    allowedOrigins,
    events: structuredClone([...MARKETING_EVENTS])
  };
}

function markDraft(plan: TrackingPlan, events: TrackingPlanEvent[]): TrackingPlan {
  return { ...plan, events, status: "draft" };
}

function clonePlan(plan: TrackingPlan): TrackingPlan {
  return structuredClone(plan);
}

async function simulateNetwork() {
  await new Promise((resolve) => setTimeout(resolve, STUB_DELAY_MS));
}
