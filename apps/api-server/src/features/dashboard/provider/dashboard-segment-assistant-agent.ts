import { Injectable } from "@nestjs/common";
import { z } from "zod";
import { env } from "../../../infra/env/env.js";
import { durationMs, log } from "../../../infra/logger/index.js";
import {
  SEGMENT_ASSISTANT_EVENT_NAMES,
  SEGMENT_ASSISTANT_PROPERTY_KEYS,
  SegmentAssistantAudienceConditionSchema,
  SegmentAssistantPlanSchema,
  type SegmentAssistantAudienceCondition,
  type SegmentAssistantPlan,
  type SegmentAssistantPropertyFilter,
  type SegmentAssistantSourceAudience
} from "../segment-assistant.types.js";
import { upsertRefinementCondition } from "../segment-assistant-refinements.js";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const OPENAI_REQUEST_TIMEOUT_MS = 20_000;
export const SEGMENT_ASSISTANT_MODEL = "gpt-5.5";

const OpenAiFunctionCallSchema = z
  .object({
    type: z.literal("function_call"),
    name: z.string().min(1),
    arguments: z.string()
  })
  .passthrough();

const OpenAiResponsesResponseSchema = z.object({
  output: z.array(z.unknown())
});

const AudienceToolArgumentsSchema = z.object({
  lookback_days: z.number().int().min(1).max(365),
  conditions: z.array(SegmentAssistantAudienceConditionSchema).min(1).max(8)
});

const SegmentPreviewToolArgumentsSchema = AudienceToolArgumentsSchema.extend({
  segment_name: z.string().trim().min(1).max(100)
});

const ClarificationToolArgumentsSchema = z.object({
  clarification_message: z.string().trim().min(1).max(500)
});

type SegmentAssistantConversationMessage = {
  role: "assistant" | "user";
  content: string;
};

type SegmentAssistantPlanInput = {
  conversation: SegmentAssistantConversationMessage[];
  currentPlan?: SegmentAssistantPlan;
  editingSourceBase?: boolean;
  message: string;
  sourceAudience?: SegmentAssistantSourceAudience;
};

@Injectable()
export class DashboardSegmentAssistantAgent {
  async plan(input: SegmentAssistantPlanInput): Promise<SegmentAssistantPlan> {
    const startedAt = Date.now();
    log.assignContext({ model: SEGMENT_ASSISTANT_MODEL, provider: "openai" });
    log.info("segment_assistant_planning_started", {
      conversationCount: input.conversation.length,
      messageLength: input.message.length
    });

    try {
      const response = await requestOpenAiPlan(input);
      const plan = parseOpenAiPlan(response);
      log.info("segment_assistant_planning_completed", {
        action: plan.action,
        conditionCount: plan.conditions.length,
        durationMs: durationMs(startedAt),
        lookbackDays: plan.lookback_days
      });
      return plan;
    } catch (error) {
      const fallback = fallbackSegmentAssistantPlan(
        input.message,
        input.conversation,
        input.currentPlan,
        input.sourceAudience
      );
      log.warn("segment_assistant_planning_fallback_used", {
        action: fallback.action,
        conditionCount: fallback.conditions.length,
        durationMs: durationMs(startedAt),
        err: error,
        lookbackDays: fallback.lookback_days
      });
      return fallback;
    }
  }
}

async function requestOpenAiPlan(input: SegmentAssistantPlanInput) {
  const startedAt = Date.now();
  log.info("provider_request_prepared", {
    conversationCount: input.conversation.length,
    endpoint: OPENAI_RESPONSES_URL,
    model: SEGMENT_ASSISTANT_MODEL,
    provider: "openai"
  });

  let response: Response;
  try {
    response = await fetch(OPENAI_RESPONSES_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.openai.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: SEGMENT_ASSISTANT_MODEL,
        instructions: segmentAssistantInstructions(input),
        input: [
          ...input.conversation.map((message) => ({
            role: message.role,
            content: message.content
          })),
          { role: "user", content: input.message }
        ],
        tools: SEGMENT_ASSISTANT_TOOLS,
        tool_choice: "required",
        parallel_tool_calls: false
      }),
      signal: AbortSignal.timeout(OPENAI_REQUEST_TIMEOUT_MS)
    });
  } catch (error) {
    log.warn("provider_request_failed", {
      durationMs: durationMs(startedAt),
      endpoint: OPENAI_RESPONSES_URL,
      err: error,
      provider: "openai"
    });
    throw error;
  }

  if (!response.ok) {
    log.warn("provider_request_failed", {
      durationMs: durationMs(startedAt),
      endpoint: OPENAI_RESPONSES_URL,
      provider: "openai",
      statusCode: response.status
    });
    throw new Error(`OpenAI segment assistant request failed with ${response.status}.`);
  }

  const payload = await response.json();
  log.info("provider_request_completed", {
    durationMs: durationMs(startedAt),
    endpoint: OPENAI_RESPONSES_URL,
    provider: "openai",
    statusCode: response.status
  });
  return payload;
}

function parseOpenAiPlan(payload: unknown): SegmentAssistantPlan {
  const response = OpenAiResponsesResponseSchema.parse(payload);
  const call = response.output
    .map((item) => OpenAiFunctionCallSchema.safeParse(item))
    .find((result) => result.success)?.data;

  if (!call) {
    throw new Error("Segment assistant did not select a tool.");
  }

  let rawArguments: unknown;
  try {
    rawArguments = JSON.parse(call.arguments || "{}");
  } catch (error) {
    throw new Error("Segment assistant returned invalid tool arguments.", { cause: error });
  }

  if (call.name === "query_audience") {
    const args = AudienceToolArgumentsSchema.parse(rawArguments);
    return SegmentAssistantPlanSchema.parse({
      action: "audience_query",
      segment_name: null,
      lookback_days: args.lookback_days,
      conditions: args.conditions,
      clarification_message: null
    });
  }
  if (call.name === "preview_segment") {
    const args = SegmentPreviewToolArgumentsSchema.parse(rawArguments);
    return SegmentAssistantPlanSchema.parse({
      action: "segment_preview",
      segment_name: args.segment_name,
      lookback_days: args.lookback_days,
      conditions: args.conditions,
      clarification_message: null
    });
  }
  if (call.name === "clarify_segment_request") {
    const args = ClarificationToolArgumentsSchema.parse(rawArguments);
    return SegmentAssistantPlanSchema.parse({
      action: "clarification",
      segment_name: null,
      lookback_days: 30,
      conditions: [],
      clarification_message: args.clarification_message
    });
  }

  throw new Error(`Unsupported segment assistant tool: ${call.name}`);
}

export function fallbackSegmentAssistantPlan(
  message: string,
  conversation: SegmentAssistantConversationMessage[] = [],
  currentPlan?: SegmentAssistantPlan,
  sourceAudience?: SegmentAssistantSourceAudience
): SegmentAssistantPlan {
  const latestMessage = message.replace(/\s+/g, " ").trim();
  const priorUserMessages = conversation
    .filter((item) => item.role === "user")
    .slice(-5)
    .map((item) => item.content.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const text = isFollowUpRequest(latestMessage)
    ? [...priorUserMessages, latestMessage].join(" ")
    : latestMessage;
  const lookbackDays = inferLookbackDays(text);
  const destination =
    inferDestination(text) ?? inferImplicitSourceDestination(text, sourceAudience?.destination_ids);
  const propertyFilters = inferPropertyFilters(text);
  let conditions: SegmentAssistantAudienceCondition[] = [];
  const repeated = /반복|여러\s*번|두\s*번|2\s*(회|번)/.test(text);
  const minimumCount = repeated ? 2 : inferExplicitMinimumCount(text);

  addConditionForKeywords(conditions, text, ["검색", "탐색"], {
    label: destination ? `${destination} 숙소 검색` : "숙소 검색",
    event_name: "hotel_search",
    minimum_count: minimumCount,
    maximum_count: null,
    destination,
    checkin_months: inferCheckinMonths(text),
    property_filters: propertyFilters
  });
  addConditionForKeywords(conditions, text, ["상세", "조회"], {
    label: destination ? `${destination} 숙소 상세 조회` : "숙소 상세 조회",
    event_name: "hotel_detail_view",
    minimum_count: minimumCount,
    maximum_count: null,
    destination,
    checkin_months: inferCheckinMonths(text),
    property_filters: propertyFilters
  });
  addConditionForKeywords(conditions, text, ["예약 시작", "예약 이탈"], {
    label: "예약 시작",
    event_name: "booking_start",
    minimum_count: 1,
    maximum_count: null,
    destination,
    checkin_months: [],
    property_filters: []
  });
  addConditionForKeywords(conditions, text, ["프로모션 클릭", "캠페인 클릭", "혜택 클릭"], {
    label: "프로모션 클릭",
    event_name: "promotion_click",
    minimum_count: minimumCount,
    maximum_count: null,
    destination: null,
    checkin_months: [],
    property_filters: propertyFilters
  });

  const replacesIncompleteWithComplete =
    /예약\s*미완료.*(?:대신|바꿔|변경|교체).*예약\s*완료/.test(latestMessage) ||
    /예약\s*완료(?:로|를)\s*(?:바꿔|변경|교체)/.test(latestMessage);
  if (replacesIncompleteWithComplete) {
    conditions.push({
      label: destination ? `${destination} 예약 완료` : "예약 완료",
      event_name: "booking_complete",
      minimum_count: 1,
      maximum_count: null,
      destination,
      checkin_months: [],
      property_filters: []
    });
  } else if (
    /예약(을|은)?\s*(하지|안\s*한|않은)|미예약|예약\s*미완료|예약\s*완료.*(?:빼|제외)/.test(text)
  ) {
    conditions.push({
      label: destination ? `${destination} 예약 완료 없음` : "예약 완료 없음",
      event_name: "booking_complete",
      minimum_count: 0,
      maximum_count: 0,
      destination,
      checkin_months: [],
      property_filters: []
    });
  } else if (/예약\s*(완료|한\s*고객|고객)/.test(text)) {
    conditions.push({
      label: destination ? `${destination} 예약 완료` : "예약 완료",
      event_name: "booking_complete",
      minimum_count: 1,
      maximum_count: null,
      destination,
      checkin_months: [],
      property_filters: []
    });
  }

  if (conditions.length === 0 && propertyFilters.length > 0) {
    conditions.push({
      label: propertyFilters.map((filter) => `${filter.key} ${filter.value}`).join(", "),
      event_name: "page_view",
      minimum_count: 1,
      maximum_count: null,
      destination,
      checkin_months: inferCheckinMonths(text),
      property_filters: propertyFilters
    });
  }

  if (currentPlan && currentPlan.action !== "clarification") {
    conditions = conditions.reduce(
      (merged, condition) => upsertRefinementCondition(merged, condition),
      currentPlan.conditions
    );
  }

  if (conditions.length === 0) {
    return SegmentAssistantPlanSchema.parse({
      action: "clarification",
      segment_name: null,
      lookback_days: lookbackDays,
      conditions: [],
      clarification_message:
        "조회하거나 만들 고객군의 목적지, 기간, 검색·상세 조회·예약 같은 행동 조건을 알려주세요."
    });
  }

  const action = isAudienceQuestion(text) ? "audience_query" : "segment_preview";
  return SegmentAssistantPlanSchema.parse({
    action,
    segment_name: action === "segment_preview" ? inferSegmentName(text) : null,
    lookback_days: lookbackDays,
    conditions,
    clarification_message: null
  });
}

function segmentAssistantInstructions(input: SegmentAssistantPlanInput) {
  const instructions = [
    "You are the LoopAd segment assistant for a hotel booking service.",
    "Choose exactly one tool. Never write SQL.",
    "Use query_audience when the user asks how many users, what percentage, the size, status, or a numeric data question.",
    "Use preview_segment when the user asks to create, add, define, target, or provides a bare audience condition in this segment-builder context.",
    "Use clarify_segment_request only when the request cannot be represented with the supported catalog.",
    "Use the conversation to reconstruct the complete current request. A follow-up must preserve prior conditions unless the user explicitly removes or replaces them.",
    "Convert the request into structured event conditions. Every condition is combined with AND.",
    "For 'recent' without a number, use 30 lookback days. For repeated behavior without a count, use minimum_count 2.",
    "For users who did not book, add booking_complete with minimum_count 0 and maximum_count 0.",
    "Apply a named destination to the relevant search/detail/booking conditions.",
    "When multiple destinations are alternatives, put them in one destination string separated by commas. Do not create duplicate event conditions for each destination.",
    `Allowed events: ${SEGMENT_ASSISTANT_EVENT_NAMES.join(", ")}.`,
    `Allowed property filters: ${SEGMENT_ASSISTANT_PROPERTY_KEYS.join(", ")}.`,
    "Do not invent events, properties, user attributes, or observed counts.",
    "Create concise Korean condition labels and a concise Korean segment name."
  ];
  if (input.currentPlan && input.currentPlan.action !== "clarification") {
    instructions.push(
      `Current executable plan: ${JSON.stringify(input.currentPlan)}. Return the complete updated condition list, preserving every unchanged condition and replacing only the condition the user changes.`
    );
  }
  if (input.sourceAudience) {
    instructions.push(
      `The authoritative base audience is the AI recommendation '${input.sourceAudience.title}' (${input.sourceAudience.base_user_ids.length} users).`,
      `Its base predicates are ${JSON.stringify(input.sourceAudience.base_condition_labels)} and its descriptive reference signals are ${JSON.stringify(input.sourceAudience.reference_labels)}.`
    );
    if (input.sourceAudience.destination_ids?.length) {
      instructions.push(
        `Its authoritative promotion destination ids are ${JSON.stringify(input.sourceAudience.destination_ids)}.`,
        `When the user requests a destination search or destination behavior without naming a different destination, set destination to ${JSON.stringify(input.sourceAudience.destination_ids.join(", "))}.`
      );
    }
    if (input.editingSourceBase) {
      instructions.push(
        `The user is editing the recommendation's base conditions. The complete editable base is ${JSON.stringify(input.sourceAudience.base_conditions ?? [])}.`,
        "Apply replacement, removal, threshold, and relaxation requests to that complete base. Return every unchanged condition together with the changed conditions."
      );
    } else {
      instructions.push(
        "The server already applies that base audience. Conditions returned by tools are refinements inside it, never a reconstruction of the base audience.",
        "Do not emit an unchanged base predicate or descriptive reference signal as a new condition. Emit it only when the user adds a stricter threshold, destination, month, or property filter."
      );
    }
  }
  return instructions.join("\n");
}

function addConditionForKeywords(
  conditions: SegmentAssistantAudienceCondition[],
  text: string,
  keywords: string[],
  condition: SegmentAssistantAudienceCondition
) {
  if (keywords.some((keyword) => text.includes(keyword))) {
    conditions.push(condition);
  }
}

function inferLookbackDays(text: string) {
  const match = text.match(/(?:최근|지난)\s*(\d{1,3})\s*일/);
  if (!match?.[1]) {
    return 30;
  }
  return Math.min(365, Math.max(1, Number.parseInt(match[1], 10)));
}

function inferExplicitMinimumCount(text: string) {
  const match = text.match(/(\d{1,4})\s*(?:회|번)/);
  return match?.[1] ? Math.max(1, Number.parseInt(match[1], 10)) : 1;
}

function inferDestination(text: string): string | null {
  const knownDestinations = [
    "제주",
    "오키나와",
    "삿포로",
    "도쿄",
    "오사카",
    "부산",
    "서울",
    "다낭"
  ];
  const known = knownDestinations.filter((destination) => text.includes(destination));
  if (known.length > 0) {
    return known.join(", ");
  }
  const match =
    text.match(/([가-힣A-Za-z][가-힣A-Za-z0-9·-]{1,19})\s*(?:목적지|여행지)/) ??
    text.match(/(?:최근\s+)?([가-힣A-Za-z][가-힣A-Za-z0-9·-]{1,19})\s+(?:숙소|호텔)/);
  const inferred = match?.[1] ?? null;
  return inferred && !/^(기존|조건에서|추천|프로모션|해당|현재|그|이|새|다른)$/.test(inferred)
    ? inferred
    : null;
}

function inferImplicitSourceDestination(text: string, destinationIds?: string[]) {
  if (!destinationIds?.length || !/(?:목적지|여행지)/.test(text)) {
    return null;
  }
  return destinationIds.join(", ");
}

function inferCheckinMonths(text: string) {
  if (/여름|하계/.test(text)) {
    return [6, 7, 8];
  }
  if (/겨울|동계/.test(text)) {
    return [12, 1, 2];
  }
  const match = text.match(/(1[0-2]|[1-9])\s*월/);
  return match?.[1] ? [Number.parseInt(match[1], 10)] : [];
}

function inferPropertyFilters(text: string): SegmentAssistantPropertyFilter[] {
  const filters: SegmentAssistantPropertyFilter[] = [];
  if (/할인|특가|deal/.test(text)) {
    filters.push({ key: "deal", operator: "exists", value: "true" });
  }
  if (/무료\s*취소/.test(text)) {
    filters.push({ key: "free_cancellation", operator: "equals", value: "true" });
  }
  if (/조식/.test(text)) {
    filters.push({ key: "breakfast_included", operator: "equals", value: "true" });
  }
  const ageGroup = text.match(/(10대|20대|30대|40대|50대|60대(?:\s*이상)?)/)?.[1];
  if (ageGroup) {
    filters.push({ key: "age_group", operator: "equals", value: ageGroup });
  }
  if (/여성/.test(text)) {
    filters.push({ key: "gender", operator: "equals", value: "female" });
  } else if (/남성/.test(text)) {
    filters.push({ key: "gender", operator: "equals", value: "male" });
  }
  return filters;
}

function isAudienceQuestion(text: string) {
  return /(얼마나|몇\s*명|몇명|비율|퍼센트|규모|수치|현황|존재해|있어\s*\?)/.test(text);
}

function isFollowUpRequest(text: string) {
  return /^(그중|그 중|그리고|여기서|그 고객)|(?:빼|제외|추가|포함|만\s*(?:보여|남겨|조회))/.test(
    text
  );
}

function inferSegmentName(text: string) {
  const normalized = text
    .replace(
      /(?:세그먼트|고객군)(?:을|를)?\s*(?:만들어|생성해|추가해|설정해)?\s*(?:줘|주세요)?/g,
      ""
    )
    .replace(/[?.!]+$/g, "")
    .trim();
  const base = normalized || "맞춤 행동 고객";
  return `${base.slice(0, 90)}${base.endsWith("고객") ? "" : " 고객"}`;
}

const conditionParameters = {
  type: "object",
  properties: {
    label: { type: "string" },
    event_name: { type: "string", enum: SEGMENT_ASSISTANT_EVENT_NAMES },
    minimum_count: { type: "integer", minimum: 0, maximum: 10_000 },
    maximum_count: { type: ["integer", "null"], minimum: 0, maximum: 10_000 },
    destination: { type: ["string", "null"] },
    checkin_months: {
      type: "array",
      items: { type: "integer", minimum: 1, maximum: 12 },
      maxItems: 12
    },
    property_filters: {
      type: "array",
      maxItems: 8,
      items: {
        type: "object",
        properties: {
          key: { type: "string", enum: SEGMENT_ASSISTANT_PROPERTY_KEYS },
          operator: {
            type: "string",
            enum: ["equals", "contains", "exists", "gte", "lte"]
          },
          value: { type: "string" }
        },
        required: ["key", "operator", "value"],
        additionalProperties: false
      }
    }
  },
  required: [
    "label",
    "event_name",
    "minimum_count",
    "maximum_count",
    "destination",
    "checkin_months",
    "property_filters"
  ],
  additionalProperties: false
} as const;

const audienceParameters = {
  type: "object",
  properties: {
    lookback_days: { type: "integer", minimum: 1, maximum: 365 },
    conditions: { type: "array", minItems: 1, maxItems: 8, items: conditionParameters }
  },
  required: ["lookback_days", "conditions"],
  additionalProperties: false
} as const;

const SEGMENT_ASSISTANT_TOOLS = [
  {
    type: "function",
    name: "query_audience",
    description: "조건에 맞는 사용자 수와 전체 대비 비율을 조회한다.",
    parameters: audienceParameters,
    strict: true
  },
  {
    type: "function",
    name: "preview_segment",
    description: "자연어 조건을 구조화해 저장 전 세그먼트 대상 규모를 미리 본다.",
    parameters: {
      ...audienceParameters,
      properties: {
        segment_name: { type: "string" },
        ...audienceParameters.properties
      },
      required: ["segment_name", ...audienceParameters.required]
    },
    strict: true
  },
  {
    type: "function",
    name: "clarify_segment_request",
    description: "요청을 안전한 데이터 조건으로 만들 수 없을 때 필요한 조건을 질문한다.",
    parameters: {
      type: "object",
      properties: { clarification_message: { type: "string" } },
      required: ["clarification_message"],
      additionalProperties: false
    },
    strict: true
  }
] as const;
