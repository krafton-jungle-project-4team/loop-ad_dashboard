import assert from "node:assert/strict";
import { test } from "node:test";

test("segment assistant routes numeric audience questions to a data query", async () => {
  setRequiredEnv();
  const { fallbackSegmentAssistantPlan } =
    await import("../src/features/dashboard/provider/dashboard-segment-assistant-agent.js");

  const plan = fallbackSegmentAssistantPlan(
    "최근 제주 숙소를 검색했지만 예약을 하지 않은 고객은 얼마나 있어?"
  );

  assert.equal(plan.action, "audience_query");
  assert.equal(plan.lookback_days, 30);
  assert.equal(plan.segment_name, null);
  assert.deepEqual(
    plan.conditions.map((condition) => ({
      destination: condition.destination,
      eventName: condition.event_name,
      maximumCount: condition.maximum_count,
      minimumCount: condition.minimum_count
    })),
    [
      {
        destination: "제주",
        eventName: "hotel_search",
        maximumCount: null,
        minimumCount: 1
      },
      {
        destination: "제주",
        eventName: "booking_complete",
        maximumCount: 0,
        minimumCount: 0
      }
    ]
  );
});

test("segment assistant turns a bare repeated-behavior condition into a free segment preview", async () => {
  setRequiredEnv();
  const { fallbackSegmentAssistantPlan } =
    await import("../src/features/dashboard/provider/dashboard-segment-assistant-agent.js");

  const plan = fallbackSegmentAssistantPlan(
    "최근 제주 숙소를 반복 검색했지만 예약을 하지 않은 고객"
  );

  assert.equal(plan.action, "segment_preview");
  assert.ok(plan.segment_name?.includes("제주"));
  assert.equal(plan.conditions[0]?.event_name, "hotel_search");
  assert.equal(plan.conditions[0]?.minimum_count, 2);
  assert.equal(plan.conditions[1]?.event_name, "booking_complete");
  assert.equal(plan.conditions[1]?.maximum_count, 0);
});

test("segment assistant keeps age, repeated destination detail, and booking abandonment executable", async () => {
  setRequiredEnv();
  const { fallbackSegmentAssistantPlan } =
    await import("../src/features/dashboard/provider/dashboard-segment-assistant-agent.js");

  const plan = fallbackSegmentAssistantPlan(
    "20대와 30대 중 제주 또는 오키나와 숙소 상세를 2회 이상 보고 예약을 시작했지만 미완료한 고객은 몇 명이야?"
  );

  assert.equal(plan.action, "audience_query");
  assert.deepEqual(
    plan.conditions.map((condition) => ({
      destination: condition.destination,
      eventName: condition.event_name,
      label: condition.label,
      maximumCount: condition.maximum_count,
      minimumCount: condition.minimum_count,
      propertyFilters: condition.property_filters
    })),
    [
      {
        destination: "제주, 오키나와",
        eventName: "hotel_detail_view",
        label: "제주, 오키나와 숙소 상세 조회",
        maximumCount: null,
        minimumCount: 2,
        propertyFilters: []
      },
      {
        destination: "제주, 오키나와",
        eventName: "booking_start",
        label: "예약 시작",
        maximumCount: null,
        minimumCount: 1,
        propertyFilters: []
      },
      {
        destination: "제주, 오키나와",
        eventName: "booking_complete",
        label: "제주, 오키나와 예약 완료 없음",
        maximumCount: 0,
        minimumCount: 0,
        propertyFilters: []
      },
      {
        destination: null,
        eventName: "page_view",
        label: "20~30대",
        maximumCount: null,
        minimumCount: 1,
        propertyFilters: [{ key: "age_group", operator: "in", value: "20대, 30대" }]
      }
    ]
  );
});

test("segment assistant asks for clarification when no supported condition can be inferred", async () => {
  setRequiredEnv();
  const { fallbackSegmentAssistantPlan } =
    await import("../src/features/dashboard/provider/dashboard-segment-assistant-agent.js");

  const plan = fallbackSegmentAssistantPlan("좋은 고객을 찾아줘");

  assert.equal(plan.action, "clarification");
  assert.equal(plan.conditions.length, 0);
  assert.ok(plan.clarification_message);
});

test("segment assistant fallback preserves prior conditions for a follow-up", async () => {
  setRequiredEnv();
  const { fallbackSegmentAssistantPlan } =
    await import("../src/features/dashboard/provider/dashboard-segment-assistant-agent.js");

  const plan = fallbackSegmentAssistantPlan("그중 예약 완료 고객은 빼줘", [
    { role: "user", content: "최근 제주 숙소를 반복 검색한 고객은 몇 명이야?" },
    { role: "assistant", content: "조건에 맞는 고객은 100명입니다." }
  ]);

  assert.equal(plan.action, "audience_query");
  assert.equal(plan.conditions[0]?.event_name, "hotel_search");
  assert.equal(plan.conditions[0]?.minimum_count, 2);
  assert.equal(plan.conditions[0]?.destination, "제주");
  assert.equal(plan.conditions[1]?.event_name, "booking_complete");
  assert.equal(plan.conditions[1]?.maximum_count, 0);
});

test("structured segment conditions compile to whitelisted read-only ClickHouse predicates", async () => {
  const { planStructuredSegmentQuery } =
    await import("../src/features/dashboard/repository/dashboard-segment-query-repository.js");
  const query = planStructuredSegmentQuery(
    "demo_project",
    {
      action: "segment_preview",
      segment_name: "최근 제주 미예약 고객",
      lookback_days: 30,
      conditions: [
        {
          label: "제주 숙소 반복 검색",
          event_name: "hotel_search",
          minimum_count: 2,
          maximum_count: null,
          destination: "제주' OR 1 = 1",
          checkin_months: [7, 8],
          property_filters: [{ key: "free_cancellation", operator: "equals", value: "true" }]
        },
        {
          label: "예약 완료 없음",
          event_name: "booking_complete",
          minimum_count: 0,
          maximum_count: 0,
          destination: "제주",
          checkin_months: [],
          property_filters: []
        }
      ],
      clarification_message: null
    },
    {
      from: "2026-06-01T00:00:00.000Z",
      to: "2026-07-01T00:00:00.000Z"
    }
  );

  assert.match(query.generatedSql, /event_name = 'hotel_search'/);
  assert.match(query.generatedSql, /condition_1_count >= 2/);
  assert.match(query.generatedSql, /condition_2_count <= 0/);
  assert.match(query.generatedSql, /IN \(7, 8\)/);
  assert.match(query.generatedSql, /toUInt8OrZero/);
  assert.match(query.generatedSql, /제주'' OR 1 = 1/);
  assert.doesNotMatch(query.generatedSql, /\b(INSERT|UPDATE|DELETE|ALTER|DROP|TRUNCATE)\b/i);
  assert.doesNotMatch(query.generatedSql, /LIMIT 500/);
  assert.match(query.previewSql, /LIMIT 500$/);
});

test("structured segment query compiles multi-value age groups without free-form SQL", async () => {
  const { planStructuredSegmentQuery } =
    await import("../src/features/dashboard/repository/dashboard-segment-query-repository.js");
  const query = planStructuredSegmentQuery(
    "demo_project",
    {
      action: "segment_preview",
      segment_name: "20~30대 고객",
      lookback_days: 30,
      conditions: [
        {
          label: "20~30대",
          event_name: "page_view",
          minimum_count: 1,
          maximum_count: null,
          destination: null,
          checkin_months: [],
          property_filters: [{ key: "age_group", operator: "in", value: "30대, 20대" }]
        }
      ],
      clarification_message: null
    },
    {
      from: "2026-06-01T00:00:00.000Z",
      to: "2026-07-01T00:00:00.000Z"
    }
  );

  assert.match(query.generatedSql, /lowerUTF8\(.+age_group.+\) IN \(/s);
  assert.match(query.generatedSql, /lowerUTF8\('30대'\)/);
  assert.match(query.generatedSql, /lowerUTF8\('20대'\)/);
});

test("structured segment destination conditions match Korean and source-data aliases", async () => {
  const { planStructuredSegmentQuery } =
    await import("../src/features/dashboard/repository/dashboard-segment-query-repository.js");
  const query = planStructuredSegmentQuery(
    "demo_project",
    {
      action: "audience_query",
      segment_name: null,
      lookback_days: 30,
      conditions: [
        {
          label: "제주 또는 오키나와 숙소 검색",
          event_name: "hotel_search",
          minimum_count: 1,
          maximum_count: null,
          destination: "제주, 오키나와",
          checkin_months: [],
          property_filters: []
        }
      ],
      clarification_message: null
    },
    {
      from: "2026-06-01T00:00:00.000Z",
      to: "2026-07-01T00:00:00.000Z"
    }
  );

  assert.match(query.generatedSql, /'제주'/);
  assert.match(query.generatedSql, /'jeju'/);
  assert.match(query.generatedSql, /'오키나와'/);
  assert.match(query.generatedSql, /'okinawa'/);
  assert.match(query.generatedSql, / OR /);
});

test("segment assistant keeps alternative destinations in one event condition", async () => {
  setRequiredEnv();
  const { fallbackSegmentAssistantPlan } =
    await import("../src/features/dashboard/provider/dashboard-segment-assistant-agent.js");

  const plan = fallbackSegmentAssistantPlan(
    "최근 제주, 오키나와 숙소를 검색했지만 예약하지 않은 고객은 몇 명이야?"
  );

  assert.equal(plan.action, "audience_query");
  assert.equal(plan.conditions[0]?.destination, "제주, 오키나와");
  assert.equal(
    plan.conditions.filter((condition) => condition.event_name === "hotel_search").length,
    1
  );
});

test("segment assistant fallback binds an unnamed destination refinement to its source promotion", async () => {
  setRequiredEnv();
  const { fallbackSegmentAssistantPlan } =
    await import("../src/features/dashboard/provider/dashboard-segment-assistant-agent.js");

  const plan = fallbackSegmentAssistantPlan("목적지 검색을 추가해줘", [], undefined, {
    suggestion_id: "suggestion-1",
    segment_id: "segment-1",
    candidate_type: "funnel_recovery",
    title: "예약 직전 이탈 고객",
    base_condition_labels: ["예약 시작 후 미완료", "프로모션 목적지 탐색"],
    hard_predicate_keys: ["booking_start_without_complete", "recent_destination_search"],
    destination_ids: ["jeju", "okinawa"],
    reference_labels: ["예약 시작", "예약 미완료", "호텔 상세 조회"],
    base_user_ids: ["source-user-001", "source-user-002"]
  });

  assert.equal(plan.conditions.length, 1);
  assert.equal(plan.conditions[0]?.event_name, "hotel_search");
  assert.equal(plan.conditions[0]?.destination, "jeju, okinawa");

  const explicitPlan = fallbackSegmentAssistantPlan("강릉 목적지 검색을 추가해줘", [], undefined, {
    suggestion_id: "suggestion-1",
    segment_id: "segment-1",
    candidate_type: "funnel_recovery",
    title: "예약 직전 이탈 고객",
    base_condition_labels: ["예약 시작 후 미완료", "프로모션 목적지 탐색"],
    hard_predicate_keys: ["booking_start_without_complete", "recent_destination_search"],
    destination_ids: ["jeju", "okinawa"],
    reference_labels: ["예약 시작", "예약 미완료", "호텔 상세 조회"],
    base_user_ids: ["source-user-001", "source-user-002"]
  });
  assert.equal(explicitPlan.conditions[0]?.destination, "강릉");
});

test("source audience membership compiles without rebuilding recommendation signals", async () => {
  const { planStructuredSegmentQuery } =
    await import("../src/features/dashboard/repository/dashboard-segment-query-repository.js");
  const query = planStructuredSegmentQuery(
    "demo_project",
    {
      action: "segment_preview",
      segment_name: "예약 직전 이탈 고객",
      lookback_days: 30,
      conditions: [],
      clarification_message: null
    },
    {
      from: "2026-06-01T00:00:00.000Z",
      to: "2026-07-01T00:00:00.000Z"
    },
    ["user-001", "user-002"]
  );

  assert.match(query.generatedSql, /arrayJoin\(\{baseUserIds:Array\(String\)\}\)/);
  assert.equal(query.countSql, "SELECT length({baseUserIds:Array(String)}) AS sample_size");
  assert.deepEqual(query.queryParams, { baseUserIds: ["user-001", "user-002"] });
  assert.doesNotMatch(query.generatedSql, /booking_start|booking_complete|hotel_detail_view/);
});

test("edited source conditions ignore stale recommendation membership when querying all eligible users", async () => {
  const { planStructuredSegmentQuery } =
    await import("../src/features/dashboard/repository/dashboard-segment-query-repository.js");
  const { usesSourceAudienceMembership } =
    await import("../src/features/dashboard/segment-assistant.types.js");
  const plan = {
    action: "segment_preview" as const,
    execution_scope: "all_eligible_users" as const,
    segment_name: "예약 완료 고객",
    lookback_days: 30,
    conditions: [
      audienceCondition("예약 시작", "booking_start", 1, null),
      audienceCondition("예약 완료", "booking_complete", 1, null),
      audienceCondition("호텔 상세 조회", "hotel_detail_view", 1, null)
    ],
    clarification_message: null
  };
  const sourceAudience = {
    suggestion_id: "suggestion-1",
    segment_id: "segment-1",
    candidate_type: "funnel_recovery",
    title: "예약 직전 이탈 고객",
    base_condition_labels: ["예약 시작 후 미완료"],
    hard_predicate_keys: ["booking_start_without_complete"],
    reference_labels: ["예약 시작", "예약 미완료", "호텔 상세 조회"],
    base_user_ids: ["source-user-001", "source-user-002"]
  };
  const baseUserIds = usesSourceAudienceMembership(plan, sourceAudience)
    ? sourceAudience.base_user_ids
    : [];
  const query = planStructuredSegmentQuery(
    "demo_project",
    plan,
    {
      from: "2026-06-01T00:00:00.000Z",
      to: "2026-07-01T00:00:00.000Z"
    },
    baseUserIds
  );

  assert.deepEqual(baseUserIds, []);
  assert.deepEqual(query.queryParams, {});
  assert.doesNotMatch(query.generatedSql, /baseUserIds|user_id IN/);
  assert.match(query.generatedSql, /event_name = 'booking_start'/);
  assert.match(query.generatedSql, /event_name = 'booking_complete'/);
  assert.match(query.generatedSql, /event_name = 'hotel_detail_view'/);
});

test("source refinement contract stores exact recommendation membership with no duplicate predicates", async () => {
  const { buildCustomStructuredAudienceRule } =
    await import("../src/features/dashboard/segment-audience-v2-contract.js");
  const rule = buildCustomStructuredAudienceRule({
    assistant_plan: {
      action: "segment_preview",
      segment_name: "예약 직전 이탈 고객",
      lookback_days: 30,
      conditions: [],
      clarification_message: null
    },
    source_audience: {
      suggestion_id: "suggestion-1",
      segment_id: "segment-1",
      candidate_type: "funnel_recovery",
      title: "예약 직전 이탈 고객",
      base_condition_labels: ["예약 시작 후 미완료"],
      hard_predicate_keys: ["booking_start_without_complete"],
      reference_labels: ["예약 시작", "예약 미완료", "호텔 상세 조회"],
      base_user_ids: ["user-001", "user-002"]
    }
  });

  assert.equal(rule.segment_audience_spec.template_version, 2);
  assert.deepEqual(rule.segment_audience_spec.hard_predicate_keys, ["source_audience_membership"]);
  assert.deepEqual(rule.segment_audience_spec.parameters.conditions, []);
  assert.deepEqual(rule.segment_audience_spec.parameters.base_user_ids, ["user-001", "user-002"]);
});

test("source destination refinement saves exact membership and the structured destination condition", async () => {
  const { buildCustomStructuredAudienceRule } =
    await import("../src/features/dashboard/segment-audience-v2-contract.js");
  const destinationCondition = {
    label: "목적지 검색",
    event_name: "hotel_search" as const,
    minimum_count: 1,
    maximum_count: null,
    destination: "jeju, okinawa",
    checkin_months: [],
    property_filters: []
  };
  const rule = buildCustomStructuredAudienceRule({
    assistant_plan: {
      action: "segment_preview",
      execution_scope: "source_audience",
      segment_name: "목적지 검색 추가 고객",
      lookback_days: 30,
      conditions: [destinationCondition],
      clarification_message: null
    },
    source_audience: {
      suggestion_id: "suggestion-1",
      segment_id: "segment-1",
      candidate_type: "funnel_recovery",
      title: "예약 직전 이탈 고객",
      base_condition_labels: ["예약 시작 후 미완료", "프로모션 목적지 탐색"],
      hard_predicate_keys: ["booking_start_without_complete", "recent_destination_search"],
      destination_ids: ["jeju", "okinawa"],
      reference_labels: ["예약 시작", "예약 미완료", "호텔 상세 조회"],
      base_user_ids: ["user-001", "user-002"]
    }
  });

  assert.deepEqual(rule.segment_audience_spec.hard_predicate_keys, [
    "source_audience_membership",
    "structured_conditions"
  ]);
  assert.deepEqual(rule.segment_audience_spec.parameters.conditions, [destinationCondition]);
  assert.deepEqual(rule.segment_audience_spec.parameters.base_user_ids, ["user-001", "user-002"]);
});

test("edited source conditions save as executable global predicates instead of stale source membership", async () => {
  const { buildCustomStructuredAudienceRule } =
    await import("../src/features/dashboard/segment-audience-v2-contract.js");
  const conditions = [
    audienceCondition("예약 시작", "booking_start", 1, null),
    audienceCondition("예약 완료", "booking_complete", 1, null),
    audienceCondition("호텔 상세 조회", "hotel_detail_view", 1, null)
  ];
  const rule = buildCustomStructuredAudienceRule({
    assistant_plan: {
      action: "segment_preview",
      execution_scope: "all_eligible_users",
      segment_name: "예약 완료 고객",
      lookback_days: 30,
      conditions,
      clarification_message: null
    },
    source_audience: {
      suggestion_id: "suggestion-1",
      segment_id: "segment-1",
      candidate_type: "funnel_recovery",
      title: "예약 직전 이탈 고객",
      base_condition_labels: ["예약 시작 후 미완료"],
      hard_predicate_keys: ["booking_start_without_complete"],
      reference_labels: ["예약 시작", "예약 미완료", "호텔 상세 조회"],
      base_conditions: [
        audienceCondition("예약 시작", "booking_start", 1, null),
        audienceCondition("예약 미완료", "booking_complete", 0, 0),
        audienceCondition("호텔 상세 조회", "hotel_detail_view", 1, null)
      ],
      base_user_ids: ["user-001", "user-002"]
    }
  });

  assert.equal(rule.segment_audience_spec.template_version, 1);
  assert.deepEqual(rule.segment_audience_spec.hard_predicate_keys, ["structured_conditions"]);
  assert.deepEqual(rule.segment_audience_spec.parameters.conditions, conditions);
  assert.equal("base_user_ids" in rule.segment_audience_spec.parameters, false);
});

test("a stricter detail-view follow-up replaces the existing refinement threshold", async () => {
  setRequiredEnv();
  const { fallbackSegmentAssistantPlan } =
    await import("../src/features/dashboard/provider/dashboard-segment-assistant-agent.js");
  const plan = fallbackSegmentAssistantPlan(
    "기존 조건에서 호텔 상세 조회를 2회 이상으로 바꿔줘",
    [],
    {
      action: "segment_preview",
      segment_name: "상세 조회 고객",
      lookback_days: 30,
      conditions: [
        {
          label: "호텔 상세 조회",
          event_name: "hotel_detail_view",
          minimum_count: 1,
          maximum_count: null,
          destination: null,
          checkin_months: [],
          property_filters: []
        }
      ],
      clarification_message: null
    }
  );

  assert.equal(plan.conditions.length, 1);
  assert.equal(plan.conditions[0]?.event_name, "hotel_detail_view");
  assert.equal(plan.conditions[0]?.minimum_count, 2);
});

test("booking completion replacement preserves unchanged source conditions in fallback planning", async () => {
  setRequiredEnv();
  const { fallbackSegmentAssistantPlan } =
    await import("../src/features/dashboard/provider/dashboard-segment-assistant-agent.js");
  const plan = fallbackSegmentAssistantPlan("기존 조건에서 예약 미완료 대신 예약 완료를 해봐", [], {
    action: "segment_preview",
    execution_scope: "all_eligible_users",
    segment_name: "예약 직전 이탈 고객",
    lookback_days: 30,
    conditions: [
      audienceCondition("예약 시작", "booking_start", 1, null),
      audienceCondition("예약 미완료", "booking_complete", 0, 0),
      audienceCondition("호텔 상세 조회", "hotel_detail_view", 1, null)
    ],
    clarification_message: null
  });

  assert.deepEqual(
    plan.conditions.map((condition) => [
      condition.event_name,
      condition.minimum_count,
      condition.maximum_count
    ]),
    [
      ["booking_start", 1, null],
      ["hotel_detail_view", 1, null],
      ["booking_complete", 1, null]
    ]
  );
});

test("source base edits retain refinements from the previous assistant turn", async () => {
  const { applySourceBaseConditionEdit } =
    await import("../src/features/dashboard/segment-assistant-refinements.js");
  const baseConditions = [
    audienceCondition("예약 시작", "booking_start", 1, null),
    audienceCondition("예약 미완료", "booking_complete", 0, 0),
    audienceCondition("호텔 상세 조회", "hotel_detail_view", 1, null)
  ];
  const refinedConditions = applySourceBaseConditionEdit(
    baseConditions,
    [audienceCondition("호텔 상세 조회 2회 이상", "hotel_detail_view", 2, null)],
    ""
  );
  const editedConditions = applySourceBaseConditionEdit(
    refinedConditions,
    [audienceCondition("예약 완료", "booking_complete", 1, null)],
    "기존 조건에서 예약 미완료 대신 예약 완료를 해봐"
  );

  assert.deepEqual(
    editedConditions.map((condition) => [condition.label, condition.minimum_count]),
    [
      ["예약 시작", 1],
      ["예약 완료", 1],
      ["호텔 상세 조회 2회 이상", 2]
    ]
  );
});

test("refinement analysis omits conditions already guaranteed by the AI audience", async () => {
  const { buildSourceRefinementCandidates, removeUnchangedSourceConditions } =
    await import("../src/features/dashboard/segment-assistant-refinements.js");
  const candidates = buildSourceRefinementCandidates(
    [
      {
        eventName: "booking_start",
        usersAtLeastOnce: 200,
        usersAtLeastTwice: 85,
        usersAtLeastThreeTimes: 30,
        freeCancellationUsers: 0,
        breakfastIncludedUsers: 0
      },
      {
        eventName: "booking_complete",
        usersAtLeastOnce: 0,
        usersAtLeastTwice: 0,
        usersAtLeastThreeTimes: 0,
        freeCancellationUsers: 0,
        breakfastIncludedUsers: 0
      },
      {
        eventName: "hotel_detail_view",
        usersAtLeastOnce: 180,
        usersAtLeastTwice: 120,
        usersAtLeastThreeTimes: 40,
        freeCancellationUsers: 70,
        breakfastIncludedUsers: 55
      }
    ],
    {
      suggestion_id: "suggestion-1",
      segment_id: "segment-1",
      candidate_type: "funnel_recovery",
      title: "예약 직전 이탈 고객",
      base_condition_labels: ["예약 시작 후 미완료"],
      hard_predicate_keys: ["booking_start_without_complete"],
      reference_labels: ["예약 시작", "예약 미완료", "호텔 상세 조회"],
      base_user_ids: Array.from({ length: 200 }, (_, index) => `user-${index}`)
    }
  );

  assert.equal(
    candidates.some(
      (item) => item.condition.event_name === "booking_start" && item.condition.minimum_count === 1
    ),
    false
  );
  assert.equal(
    candidates.some(
      (item) =>
        item.condition.event_name === "booking_complete" && item.condition.maximum_count === 0
    ),
    false
  );
  assert.equal(
    candidates.some(
      (item) =>
        item.condition.event_name === "hotel_detail_view" && item.condition.minimum_count === 2
    ),
    true
  );
  assert.ok(candidates.every((item) => /^ref_[a-f0-9]{16}$/.test(item.key)));
  assert.deepEqual(
    removeUnchangedSourceConditions(
      [
        {
          label: "예약 시작",
          event_name: "booking_start",
          minimum_count: 1,
          maximum_count: null,
          destination: null,
          checkin_months: [],
          property_filters: []
        },
        {
          label: "예약 미완료",
          event_name: "booking_complete",
          minimum_count: 0,
          maximum_count: 0,
          destination: null,
          checkin_months: [],
          property_filters: []
        },
        {
          label: "호텔 상세 조회 2회 이상",
          event_name: "hotel_detail_view",
          minimum_count: 2,
          maximum_count: null,
          destination: null,
          checkin_months: [],
          property_filters: []
        }
      ],
      ["예약 시작", "예약 미완료", "호텔 상세 조회"]
    ).map((condition) => [condition.event_name, condition.minimum_count]),
    [["hotel_detail_view", 2]]
  );
});

function audienceCondition(
  label: string,
  eventName: "booking_start" | "booking_complete" | "hotel_detail_view",
  minimumCount: number,
  maximumCount: number | null
) {
  return {
    label,
    event_name: eventName,
    minimum_count: minimumCount,
    maximum_count: maximumCount,
    destination: null,
    checkin_months: [],
    property_filters: []
  };
}

function setRequiredEnv() {
  process.env.LOOPAD_ENV ??= "test";
  process.env.LOOPAD_SERVICE_ID ??= "dashboard-api";
  process.env.PORT ??= "8080";
  process.env.LOOPAD_AURORA_HOST ??= "localhost";
  process.env.LOOPAD_AURORA_PORT ??= "5432";
  process.env.LOOPAD_AURORA_DATABASE ??= "loopad";
  process.env.LOOPAD_AURORA_USERNAME ??= "loopad";
  process.env.LOOPAD_AURORA_PASSWORD ??= "loopad";
  process.env.LOOPAD_CLICKHOUSE_URL ??= "http://localhost:8123";
  process.env.LOOPAD_CLICKHOUSE_DATABASE ??= "loopad";
  process.env.LOOPAD_CLICKHOUSE_USERNAME ??= "default";
  process.env.LOOPAD_CLICKHOUSE_PASSWORD ??= "loopad";
  process.env.LOOPAD_DECISION_API_BASE_URL ??= "http://localhost:8000";
  process.env.LOOPAD_INTERNAL_API_KEY ??= "test-key";
  process.env.LOOPAD_OPENAI_API_KEY ??= "test-openai-key";
  process.env.LOOPAD_DEMO_DISPATCH_RECIPIENTS ??= "[]";
}
