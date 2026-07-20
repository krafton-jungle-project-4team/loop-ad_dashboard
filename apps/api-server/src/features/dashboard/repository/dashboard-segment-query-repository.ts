import { randomUUID } from "node:crypto";
import { type ClickHouseClient } from "@clickhouse/client";
import { InjectTransaction, type Transaction } from "@nestjs-cls/transactional";
import { Inject, Injectable } from "@nestjs/common";
import type {
  DashboardSavedSegment,
  DashboardSegmentConditionDiagnostic,
  DashboardSegmentQueryPreview,
  DashboardSegmentQueryPreviewRequest,
  DashboardSaveSegmentRequest,
  DashboardSegmentSampleSizeStatus,
  DashboardSegmentSuggestedAdjustment
} from "@loopad/shared";
import { CLICKHOUSE_CLIENT } from "../../../infra/database/index.js";
import { PgTypedTransactionalAdapter } from "../../../infra/database/pgtyped-transactional.adapter.js";
import { dashboardErrors } from "../dashboard-errors.js";
import { buildCustomStructuredAudienceRule } from "../segment-audience-v2-contract.js";
import {
  getDashboardSegmentQueryPreviewForSave,
  insertDashboardCustomSegmentDefinition,
  insertDashboardSegmentQueryPreview,
  markDashboardSegmentQueryPreviewSaved,
  type IInsertDashboardCustomSegmentDefinitionResult,
  type IInsertDashboardSegmentQueryPreviewResult
} from "../database/__generated__/dashboard.queries.js";
import { durationMs, log } from "../../../infra/logger/index.js";
import type {
  SegmentAssistantExecutionState,
  SegmentAssistantEventName,
  SegmentAssistantPlan,
  SegmentAssistantPropertyFilter,
  SegmentAssistantSourceAudience
} from "../segment-assistant.types.js";
import {
  SEGMENT_ASSISTANT_EVENT_NAMES,
  SegmentAssistantExecutionStateSchema
} from "../segment-assistant.types.js";
import {
  buildSourceRefinementCandidates,
  type SegmentAssistantSourceEventProfile,
  type SegmentAssistantSourceRefinementCandidate
} from "../segment-assistant-refinements.js";
import { serializeJsonDatabaseParameter } from "./dashboard-json-parameter.js";

const PREVIEW_ROW_LIMIT = 500;
const PREVIEW_TIMEOUT_SECONDS = 10;
export const MIN_SEGMENT_USER_COUNT = 100;
const MIN_SEGMENT_RATIO = 0.005;

type PreviewRow = Record<string, unknown>;

type ClickHouseJsonResponse = {
  meta?: Array<{ name: string; type: string }>;
  data?: PreviewRow[];
};

type CountRow = {
  sample_size: number | string;
};

type SourceEventProfileRow = {
  event_name: string;
  users_at_least_once: number | string;
  users_at_least_twice: number | string;
  users_at_least_three_times: number | string;
  free_cancellation_users: number | string;
  breakfast_included_users: number | string;
};

export type SegmentAssistantDiagnostics = {
  conditionDiagnostics: DashboardSegmentConditionDiagnostic[];
  suggestedAdjustments: DashboardSegmentSuggestedAdjustment[];
};

@Injectable()
export class DashboardSegmentQueryRepository {
  constructor(
    @InjectTransaction()
    private readonly db: Transaction<PgTypedTransactionalAdapter>,
    @Inject(CLICKHOUSE_CLIENT)
    private readonly clickhouse: ClickHouseClient
  ) {}

  async createQueryPreview(
    projectId: string,
    request: DashboardSegmentQueryPreviewRequest
  ): Promise<DashboardSegmentQueryPreview> {
    const timeRange = normalizeTimeRange(request.base_time_range);
    const query = planSegmentQuery(projectId, request.natural_language_query, timeRange);
    log.info("segment_query_planned", {
      projectId,
      queryType: "legacy_natural_language",
      timeRange
    });
    return this.persistQueryPreview({
      naturalLanguageQuery: request.natural_language_query,
      projectId,
      query,
      queryParamsJson: {},
      timeRange
    });
  }

  async createAssistantQueryPreview(
    projectId: string,
    naturalLanguageQuery: string,
    plan: SegmentAssistantPlan,
    sourceAudience?: SegmentAssistantSourceAudience
  ): Promise<DashboardSegmentQueryPreview> {
    if (plan.action === "clarification") {
      throw new Error("A clarification plan cannot be executed.");
    }
    const timeRange = timeRangeForLookbackDays(plan.lookback_days);
    const query = planStructuredSegmentQuery(
      projectId,
      plan,
      timeRange,
      sourceAudience?.base_user_ids
    );
    log.info("segment_query_planned", {
      action: plan.action,
      conditionCount: plan.conditions.length,
      projectId,
      queryType: "structured_segment_assistant",
      timeRange
    });
    return this.persistQueryPreview({
      naturalLanguageQuery,
      projectId,
      query,
      queryParamsJson: {
        assistant_plan: plan,
        ...(sourceAudience ? { source_audience: sourceAudience } : {})
      },
      timeRange
    });
  }

  async diagnoseAssistantPlan(
    projectId: string,
    plan: SegmentAssistantPlan,
    currentSampleSize: number,
    sourceAudience?: SegmentAssistantSourceAudience
  ): Promise<SegmentAssistantDiagnostics> {
    if (plan.action === "clarification" || plan.conditions.length === 0) {
      return { conditionDiagnostics: [], suggestedAdjustments: [] };
    }

    const timeRange = timeRangeForLookbackDays(plan.lookback_days);
    const countsWithoutCondition = await Promise.all(
      plan.conditions.map(async (_condition, index) => {
        const conditions = plan.conditions.filter((_item, itemIndex) => itemIndex !== index);
        if (conditions.length === 0) {
          return sourceAudience
            ? sourceAudience.base_user_ids.length
            : this.countEligibleUsers(projectId, timeRange);
        }
        const query = planStructuredSegmentQuery(
          projectId,
          { ...plan, conditions },
          timeRange,
          sourceAudience?.base_user_ids
        );
        return this.executeCountQuery(query.countSql, query.queryParams);
      })
    );
    const recoveredCounts = countsWithoutCondition.map((count) =>
      Math.max(0, count - currentSampleSize)
    );
    const bottleneckIndex = recoveredCounts.reduce(
      (bestIndex, recoveredCount, index) =>
        recoveredCount > (recoveredCounts[bestIndex] ?? -1) ? index : bestIndex,
      0
    );
    const conditionDiagnostics = plan.conditions.map((condition, index) => ({
      condition_label: condition.label,
      sample_size_without_condition: countsWithoutCondition[index] ?? currentSampleSize,
      recovered_user_count: recoveredCounts[index] ?? 0,
      is_bottleneck: index === bottleneckIndex && (recoveredCounts[index] ?? 0) > 0
    }));
    const suggestedAdjustments: DashboardSegmentSuggestedAdjustment[] = [];
    const bottleneck = plan.conditions[bottleneckIndex];
    const withoutBottleneckCount = countsWithoutCondition[bottleneckIndex] ?? currentSampleSize;
    if (bottleneck && withoutBottleneckCount > currentSampleSize) {
      suggestedAdjustments.push({
        kind: "remove_condition",
        label: `'${bottleneck.label}' 조건 제외`,
        prompt: `${bottleneck.label} 조건을 빼고 다시 계산해줘`,
        estimated_sample_size: withoutBottleneckCount
      });
    }

    if (bottleneck && bottleneck.minimum_count > 1) {
      const relaxedMinimum = bottleneck.minimum_count - 1;
      const relaxedPlan = {
        ...plan,
        conditions: plan.conditions.map((condition, index) =>
          index === bottleneckIndex ? { ...condition, minimum_count: relaxedMinimum } : condition
        )
      };
      const relaxedQuery = planStructuredSegmentQuery(
        projectId,
        relaxedPlan,
        timeRange,
        sourceAudience?.base_user_ids
      );
      const relaxedSampleSize = await this.executeCountQuery(
        relaxedQuery.countSql,
        relaxedQuery.queryParams
      );
      suggestedAdjustments.push({
        kind: "relax_condition",
        label: `'${bottleneck.label}' ${relaxedMinimum}회 이상으로 완화`,
        prompt: `${bottleneck.label} 조건을 ${relaxedMinimum}회 이상으로 완화해줘`,
        estimated_sample_size: relaxedSampleSize
      });
    }

    if (!sourceAudience && plan.lookback_days < 365) {
      const expandedLookbackDays = Math.min(
        365,
        Math.max(plan.lookback_days * 2, plan.lookback_days + 30)
      );
      const expandedTimeRange = timeRangeForLookbackDays(expandedLookbackDays);
      const expandedQuery = planStructuredSegmentQuery(
        projectId,
        { ...plan, lookback_days: expandedLookbackDays },
        expandedTimeRange
      );
      const expandedSampleSize = await this.executeCountQuery(
        expandedQuery.countSql,
        expandedQuery.queryParams
      );
      suggestedAdjustments.push({
        kind: "expand_window",
        label: `조회 기간을 ${expandedLookbackDays}일로 확대`,
        prompt: `조회 기간을 최근 ${expandedLookbackDays}일로 늘려서 다시 계산해줘`,
        estimated_sample_size: expandedSampleSize
      });
    }

    log.info("segment_condition_diagnostics_completed", {
      bottleneckCondition: bottleneck?.label ?? null,
      conditionCount: conditionDiagnostics.length,
      currentSampleSize,
      suggestedAdjustmentCount: suggestedAdjustments.length
    });
    return { conditionDiagnostics, suggestedAdjustments };
  }

  async analyzeSourceRefinements(
    projectId: string,
    sourceAudience: SegmentAssistantSourceAudience
  ): Promise<SegmentAssistantSourceRefinementCandidate[]> {
    const startedAt = Date.now();
    const timeRange = timeRangeForLookbackDays(30);
    log.info("source_refinement_profile_started", {
      baseAudienceSize: sourceAudience.base_user_ids.length,
      projectId,
      suggestionId: sourceAudience.suggestion_id
    });
    const result = await this.clickhouse.query({
      query: `
        SELECT
          event_name,
          count() AS users_at_least_once,
          countIf(event_count >= 2) AS users_at_least_twice,
          countIf(event_count >= 3) AS users_at_least_three_times,
          countIf(free_cancellation_count > 0) AS free_cancellation_users,
          countIf(breakfast_included_count > 0) AS breakfast_included_users
        FROM (
          SELECT
            user_id,
            event_name,
            count() AS event_count,
            countIf(
              toUInt8OrZero(
                ifNull(JSONExtractString(properties_json, 'free_cancellation'), '')
              ) = 1
            ) AS free_cancellation_count,
            countIf(
              toUInt8OrZero(
                ifNull(JSONExtractString(properties_json, 'breakfast_included'), '')
              ) = 1
            ) AS breakfast_included_count
          FROM funnel_step_events
          WHERE project_id = {projectId:String}
            AND event_time >= parseDateTimeBestEffort({from:String})
            AND event_time < parseDateTimeBestEffort({to:String})
            AND user_id IN {baseUserIds:Array(String)}
            AND event_name IN {eventNames:Array(String)}
          GROUP BY user_id, event_name
        )
        GROUP BY event_name
        ORDER BY event_name ASC
      `,
      format: "JSONEachRow",
      query_params: {
        projectId,
        from: timeRange.from,
        to: timeRange.to,
        baseUserIds: sourceAudience.base_user_ids,
        eventNames: [...SEGMENT_ASSISTANT_EVENT_NAMES]
      },
      clickhouse_settings: {
        max_execution_time: PREVIEW_TIMEOUT_SECONDS,
        readonly: "1"
      }
    });
    const rows = await result.json<SourceEventProfileRow>();
    const profiles = rows.flatMap((row): SegmentAssistantSourceEventProfile[] => {
      if (!isSegmentAssistantEventName(row.event_name)) return [];
      return [
        {
          eventName: row.event_name,
          usersAtLeastOnce: countValue(row.users_at_least_once),
          usersAtLeastTwice: countValue(row.users_at_least_twice),
          usersAtLeastThreeTimes: countValue(row.users_at_least_three_times),
          freeCancellationUsers: countValue(row.free_cancellation_users),
          breakfastIncludedUsers: countValue(row.breakfast_included_users)
        }
      ];
    });
    const candidates = buildSourceRefinementCandidates(profiles, sourceAudience);
    log.info("source_refinement_profile_completed", {
      candidateCount: candidates.length,
      durationMs: durationMs(startedAt),
      eventCount: profiles.length,
      projectId,
      suggestionId: sourceAudience.suggestion_id
    });
    return candidates;
  }

  async readAssistantExecutionState(
    projectId: string,
    queryPreviewId: string
  ): Promise<SegmentAssistantExecutionState> {
    const preview = await this.db
      .query(getDashboardSegmentQueryPreviewForSave, { projectId, queryPreviewId })
      .single();
    return SegmentAssistantExecutionStateSchema.parse(preview.queryParamsJson);
  }

  private async persistQueryPreview(input: {
    naturalLanguageQuery: string;
    projectId: string;
    query: PlannedSegmentQuery;
    queryParamsJson: unknown;
    timeRange: SegmentPreviewTimeRange;
  }): Promise<DashboardSegmentQueryPreview> {
    const startedAt = Date.now();
    const [preview, sampleSize, totalEligibleUserCount] = await Promise.all([
      this.executePreviewQuery(input.query.previewSql, input.query.queryParams),
      this.executeCountQuery(input.query.countSql, input.query.queryParams),
      this.countEligibleUsers(input.projectId, input.timeRange)
    ]);
    const sampleRatio =
      totalEligibleUserCount > 0 ? roundRatio(sampleSize / totalEligibleUserCount) : 0;
    const sampleSizeStatus = getSampleSizeStatus(sampleSize, sampleRatio);
    log.info("segment_query_preview_counts_loaded", {
      sampleRatio,
      sampleSize,
      sampleSizeStatus,
      totalEligibleUserCount
    });
    const row = await this.db
      .query(insertDashboardSegmentQueryPreview, {
        baseTimeFrom: input.timeRange.from,
        baseTimeTo: input.timeRange.to,
        generatedSql: input.query.generatedSql,
        naturalLanguageQuery: input.naturalLanguageQuery,
        projectId: input.projectId,
        queryParamsJson: serializeJsonDatabaseParameter(input.queryParamsJson),
        queryPreviewId: `seg_query_preview_${randomUUID()}`,
        resultColumnsJson: serializeJsonDatabaseParameter(preview.columns),
        resultPreviewJson: serializeJsonDatabaseParameter(preview.rows),
        sampleRatio,
        sampleSize,
        sampleSizeStatus,
        totalEligibleUserCount
      })
      .single();

    const response = toSegmentQueryPreview(row);
    log.assignContext({ queryPreviewId: response.query_preview_id });
    log.info("segment_query_preview_created", {
      durationMs: durationMs(startedAt),
      sampleRatio: response.sample_ratio,
      sampleSize: response.sample_size,
      sampleSizeStatus: response.sample_size_status,
      totalEligibleUserCount: response.total_eligible_user_count
    });
    return response;
  }

  async saveSegment(
    projectId: string,
    request: DashboardSaveSegmentRequest
  ): Promise<DashboardSavedSegment> {
    const startedAt = Date.now();
    const preview = await this.db
      .query(getDashboardSegmentQueryPreviewForSave, {
        projectId,
        queryPreviewId: request.query_preview_id
      })
      .single();

    if (preview.sampleSizeStatus !== "valid" || preview.status !== "previewed") {
      log.warn("segment_preview_not_saveable", {
        previewStatus: preview.status,
        sampleSizeStatus: preview.sampleSizeStatus
      });
      throw dashboardErrors.segmentPreviewNotSaveable();
    }
    let ruleJson: ReturnType<typeof buildCustomStructuredAudienceRule>;
    try {
      ruleJson = buildCustomStructuredAudienceRule(preview.queryParamsJson);
    } catch (err) {
      log.warn("segment_audience_contract_invalid", { err });
      throw dashboardErrors.segmentPreviewNotSaveable();
    }

    const segment = await this.db
      .query(insertDashboardCustomSegmentDefinition, {
        generatedSql: preview.generatedSql,
        naturalLanguageQuery: preview.naturalLanguageQuery,
        projectId,
        queryPreviewId: preview.queryPreviewId,
        ruleJson: serializeJsonDatabaseParameter(ruleJson),
        sampleRatio: numberValue(preview.sampleRatio),
        sampleSize: countValue(preview.sampleSize),
        segmentId: `seg_custom_${randomUUID()}`,
        segmentName: request.segment_name,
        totalEligibleUserCount: countValue(preview.totalEligibleUserCount)
      })
      .single();
    await this.db
      .query(markDashboardSegmentQueryPreviewSaved, {
        projectId,
        queryPreviewId: request.query_preview_id
      })
      .single();

    const response = toSavedSegment(segment);
    log.assignContext({ segmentId: response.segment_id });
    log.info("segment_saved", {
      durationMs: durationMs(startedAt),
      sampleRatio: response.sample_ratio,
      sampleSize: response.sample_size,
      totalEligibleUserCount: response.total_eligible_user_count
    });
    return response;
  }

  private async executePreviewQuery(
    sql: string,
    queryParams: Record<string, unknown> = {}
  ): Promise<{ columns: string[]; rows: PreviewRow[] }> {
    const startedAt = Date.now();
    log.info("clickhouse_preview_query_started", { queryLength: sql.length });
    const result = await this.clickhouse.query({
      query: sql,
      format: "JSON",
      query_params: queryParams,
      clickhouse_settings: {
        max_execution_time: PREVIEW_TIMEOUT_SECONDS,
        max_result_rows: String(PREVIEW_ROW_LIMIT),
        readonly: "1",
        result_overflow_mode: "break"
      }
    });
    const body = await result.json<ClickHouseJsonResponse>();
    const response = {
      columns: (body.meta ?? []).map((column) => column.name),
      rows: (body.data ?? []).slice(0, PREVIEW_ROW_LIMIT)
    };

    log.info("clickhouse_preview_query_completed", { durationMs: durationMs(startedAt) });
    return response;
  }

  private async executeCountQuery(
    sql: string,
    queryParams: Record<string, unknown> = {}
  ): Promise<number> {
    const startedAt = Date.now();
    log.info("clickhouse_count_query_started", { queryLength: sql.length });
    const result = await this.clickhouse.query({
      query: sql,
      format: "JSONEachRow",
      query_params: queryParams,
      clickhouse_settings: {
        max_execution_time: PREVIEW_TIMEOUT_SECONDS,
        readonly: "1"
      }
    });
    const rows = await result.json<CountRow>();

    const count = countValue(rows[0]?.sample_size ?? 0);
    log.info("clickhouse_count_query_completed", { count, durationMs: durationMs(startedAt) });
    return count;
  }

  private async countEligibleUsers(projectId: string, timeRange: SegmentPreviewTimeRange) {
    const startedAt = Date.now();
    const result = await this.clickhouse.query({
      query: `
        SELECT countDistinct(user_id) AS sample_size
        FROM funnel_step_events
        WHERE project_id = ${sqlString(projectId)}
          AND event_time >= parseDateTimeBestEffort(${sqlString(timeRange.from)})
          AND event_time < parseDateTimeBestEffort(${sqlString(timeRange.to)})
      `,
      format: "JSONEachRow",
      clickhouse_settings: {
        max_execution_time: PREVIEW_TIMEOUT_SECONDS,
        readonly: "1"
      }
    });
    const rows = await result.json<CountRow>();

    const count = countValue(rows[0]?.sample_size ?? 0);
    log.info("eligible_users_counted", { count, durationMs: durationMs(startedAt), timeRange });
    return count;
  }
}

type SegmentPreviewTimeRange = {
  from: string;
  to: string;
};

type PlannedSegmentQuery = {
  generatedSql: string;
  previewSql: string;
  countSql: string;
  queryParams: Record<string, unknown>;
};

function planSegmentQuery(
  projectId: string,
  naturalLanguageQuery: string,
  timeRange: SegmentPreviewTimeRange
): PlannedSegmentQuery {
  const condition = inferSegmentCondition(naturalLanguageQuery);
  const baseWhere = [
    `project_id = ${sqlString(projectId)}`,
    `event_time >= parseDateTimeBestEffort(${sqlString(timeRange.from)})`,
    `event_time < parseDateTimeBestEffort(${sqlString(timeRange.to)})`
  ].join("\n    AND ");
  const having = condition.having.join("\n    AND ");
  const selectCounters = condition.eventNames
    .map((eventName) => `countIf(event_name = ${sqlString(eventName)}) AS ${eventName}_count`)
    .join(",\n    ");
  const generatedSql = `
SELECT
  user_id,
  ${selectCounters},
  max(event_time) AS last_event_at
FROM funnel_step_events
WHERE ${baseWhere}
GROUP BY user_id
HAVING ${having}
ORDER BY last_event_at DESC
`.trim();
  const previewSql = `${generatedSql}\nLIMIT ${PREVIEW_ROW_LIMIT}`;
  const countSql = `
SELECT count() AS sample_size
FROM (
  SELECT user_id
  FROM funnel_step_events
  WHERE ${baseWhere}
  GROUP BY user_id
  HAVING ${having}
)
`.trim();

  return {
    countSql,
    generatedSql,
    previewSql,
    queryParams: {}
  };
}

export function planStructuredSegmentQuery(
  projectId: string,
  plan: SegmentAssistantPlan,
  timeRange: SegmentPreviewTimeRange,
  baseUserIds: string[] = []
): PlannedSegmentQuery {
  if (
    plan.action === "clarification" ||
    (plan.conditions.length === 0 && baseUserIds.length === 0)
  ) {
    throw new Error("Structured segment queries require executable conditions.");
  }

  if (plan.conditions.length === 0) {
    const generatedSql = `
SELECT
  user_id,
  now() AS last_event_at
FROM (
  SELECT arrayJoin({baseUserIds:Array(String)}) AS user_id
)
ORDER BY user_id ASC
`.trim();
    return {
      countSql: "SELECT length({baseUserIds:Array(String)}) AS sample_size",
      generatedSql,
      previewSql: `${generatedSql}\nLIMIT ${PREVIEW_ROW_LIMIT}`,
      queryParams: { baseUserIds }
    };
  }

  const baseWhere = [
    `project_id = ${sqlString(projectId)}`,
    `event_time >= parseDateTimeBestEffort(${sqlString(timeRange.from)})`,
    `event_time < parseDateTimeBestEffort(${sqlString(timeRange.to)})`,
    ...(baseUserIds.length > 0 ? ["user_id IN {baseUserIds:Array(String)}"] : [])
  ].join("\n    AND ");
  const counters = plan.conditions.map((condition, index) => {
    const alias = `condition_${index + 1}_count`;
    return {
      alias,
      select: `countIf(${structuredConditionPredicate(condition)}) AS ${alias}`,
      having: [
        `${alias} >= ${condition.minimum_count}`,
        condition.maximum_count === null ? null : `${alias} <= ${condition.maximum_count}`
      ].filter((item): item is string => Boolean(item))
    };
  });
  const selectCounters = counters.map((counter) => counter.select).join(",\n    ");
  const having = counters.flatMap((counter) => counter.having).join("\n    AND ");
  const generatedSql = `
SELECT
  user_id,
  ${selectCounters},
  max(event_time) AS last_event_at
FROM funnel_step_events
WHERE ${baseWhere}
GROUP BY user_id
HAVING ${having}
ORDER BY last_event_at DESC
`.trim();
  const previewSql = `${generatedSql}\nLIMIT ${PREVIEW_ROW_LIMIT}`;
  const countSql = `
SELECT count() AS sample_size
FROM (
  SELECT
    user_id,
    ${selectCounters}
  FROM funnel_step_events
  WHERE ${baseWhere}
  GROUP BY user_id
  HAVING ${having}
)
`.trim();

  return {
    countSql,
    generatedSql,
    previewSql,
    queryParams: baseUserIds.length > 0 ? { baseUserIds } : {}
  };
}

function structuredConditionPredicate(
  condition: SegmentAssistantPlan["conditions"][number]
): string {
  const predicates = [`event_name = ${sqlString(condition.event_name)}`];
  if (condition.destination) {
    predicates.push(destinationPredicate(condition.destination));
  }
  if (condition.checkin_months.length > 0) {
    predicates.push(
      `toMonth(parseDateTimeBestEffortOrNull(nullIf(JSONExtractString(properties_json, 'checkin_date'), ''))) IN (${condition.checkin_months.join(", ")})`
    );
  }
  predicates.push(...condition.property_filters.map(propertyFilterPredicate));
  return predicates.map((predicate) => `(${predicate})`).join(" AND ");
}

function destinationPredicate(destination: string) {
  const destinationText = [
    "ifNull(JSONExtractString(properties_json, 'destination_id'), '')",
    "ifNull(JSONExtractString(properties_json, 'destination_name'), '')",
    "ifNull(JSONExtractString(properties_json, 'hotel_city'), '')",
    "ifNull(JSONExtractString(properties_json, 'hotel_country'), '')"
  ].join(", ' ', ");
  const predicates = destinationSearchTerms(destination).map(
    (term) => `positionCaseInsensitiveUTF8(concat(${destinationText}), ${sqlString(term)}) > 0`
  );
  return predicates.length === 1 ? predicates[0]! : `(${predicates.join(" OR ")})`;
}

const DESTINATION_ALIAS_GROUPS = [
  ["제주", "jeju"],
  ["오키나와", "okinawa"],
  ["삿포로", "sapporo"],
  ["도쿄", "tokyo"],
  ["오사카", "osaka"],
  ["부산", "busan"],
  ["서울", "seoul"],
  ["다낭", "da nang", "danang"]
] as const;

function destinationSearchTerms(destination: string) {
  const requestedDestinations = destination
    .split(/\s*(?:,|，|\/|·|또는|혹은)\s*/u)
    .map((value) => value.trim())
    .filter(Boolean);
  const terms = requestedDestinations.flatMap((requestedDestination) => {
    const normalized = requestedDestination.toLocaleLowerCase("en-US");
    const aliases = DESTINATION_ALIAS_GROUPS.find((group) =>
      group.some((alias) => alias.toLocaleLowerCase("en-US") === normalized)
    );
    return aliases ? [...aliases] : [requestedDestination];
  });
  return [...new Set(terms)];
}

function propertyFilterPredicate(filter: SegmentAssistantPropertyFilter) {
  const extracted = `ifNull(JSONExtractString(properties_json, ${sqlString(filter.key)}), '')`;
  const normalizedValue = filter.value.trim();
  if (!normalizedValue) {
    throw new Error(`Structured segment property filter '${filter.key}' has an empty value.`);
  }

  if (filter.operator === "exists") {
    return `nullIf(${extracted}, '') IS NOT NULL`;
  }
  if (filter.operator === "contains") {
    return `positionCaseInsensitiveUTF8(${extracted}, ${sqlString(normalizedValue)}) > 0`;
  }
  if (filter.operator === "gte" || filter.operator === "lte") {
    const numericValue = Number(normalizedValue);
    if (!Number.isFinite(numericValue)) {
      throw new Error(`Structured segment property filter '${filter.key}' must be numeric.`);
    }
    const operator = filter.operator === "gte" ? ">=" : "<=";
    return `toFloat64OrNull(nullIf(${extracted}, '')) ${operator} ${numericValue}`;
  }
  if (
    (filter.key === "free_cancellation" || filter.key === "breakfast_included") &&
    /^(true|false|1|0)$/i.test(normalizedValue)
  ) {
    const expected = /^(true|1)$/i.test(normalizedValue) ? 1 : 0;
    return `toUInt8OrZero(${extracted}) = ${expected}`;
  }
  return `lowerUTF8(${extracted}) = lowerUTF8(${sqlString(normalizedValue)})`;
}

function isSegmentAssistantEventName(value: string): value is SegmentAssistantEventName {
  return (SEGMENT_ASSISTANT_EVENT_NAMES as readonly string[]).includes(value);
}

function inferSegmentCondition(naturalLanguageQuery: string) {
  const text = naturalLanguageQuery.toLowerCase();
  const eventNames = [
    matchEvent(text, ["상세", "detail"], "hotel_detail_view"),
    matchEvent(text, ["숙소 클릭", "hotel_click"], "hotel_click"),
    matchEvent(text, ["검색", "search"], "hotel_search"),
    matchEvent(text, ["프로모션 클릭", "promotion_click"], "promotion_click"),
    matchEvent(text, ["노출", "impression"], "promotion_impression"),
    matchEvent(text, ["예약 시작", "booking_start"], "booking_start"),
    matchEvent(text, ["예약 완료", "booking_complete"], "booking_complete")
  ].filter((eventName): eventName is string => Boolean(eventName));
  const selectedEventNames = [
    ...new Set(eventNames.length > 0 ? eventNames : ["hotel_detail_view"])
  ];
  const positiveEventName =
    selectedEventNames.find((eventName) => eventName !== "booking_complete") ??
    selectedEventNames[0];
  const minimumCount = inferMinimumCount(text);
  const having = [`${positiveEventName}_count >= ${minimumCount}`];

  if (
    text.includes("미예약") ||
    text.includes("예약하지") ||
    text.includes("booking_complete가 없는")
  ) {
    if (!selectedEventNames.includes("booking_complete")) {
      selectedEventNames.push("booking_complete");
    }
    having.push("booking_complete_count = 0");
  }

  return {
    eventNames: selectedEventNames,
    having
  };
}

function matchEvent(text: string, keywords: string[], eventName: string) {
  return keywords.some((keyword) => text.includes(keyword)) ? eventName : null;
}

function inferMinimumCount(text: string) {
  const digitMatch = text.match(/(\d+)\s*(회|번|times?)/);
  if (digitMatch?.[1]) {
    return Math.max(1, Number.parseInt(digitMatch[1], 10));
  }
  if (text.includes("2회") || text.includes("두 번")) {
    return 2;
  }
  if (text.includes("3회") || text.includes("세 번")) {
    return 3;
  }
  return 1;
}

function normalizeTimeRange(
  timeRange: DashboardSegmentQueryPreviewRequest["base_time_range"]
): SegmentPreviewTimeRange {
  if (timeRange) {
    return timeRange;
  }
  const to = new Date();
  const from = new Date(to.getTime() - 7 * 24 * 60 * 60 * 1000);

  return {
    from: from.toISOString(),
    to: to.toISOString()
  };
}

function timeRangeForLookbackDays(lookbackDays: number): SegmentPreviewTimeRange {
  const to = new Date();
  const from = new Date(to.getTime() - lookbackDays * 24 * 60 * 60 * 1000);
  return { from: from.toISOString(), to: to.toISOString() };
}

function getSampleSizeStatus(
  sampleSize: number,
  sampleRatio: number
): DashboardSegmentSampleSizeStatus {
  return sampleSize >= MIN_SEGMENT_USER_COUNT && sampleRatio >= MIN_SEGMENT_RATIO
    ? "valid"
    : "too_small";
}

function toSegmentQueryPreview(
  row: IInsertDashboardSegmentQueryPreviewResult
): DashboardSegmentQueryPreview {
  return {
    query_preview_id: row.queryPreviewId,
    generated_sql: row.generatedSql,
    sample_size: countValue(row.sampleSize),
    total_eligible_user_count: countValue(row.totalEligibleUserCount),
    sample_ratio: numberValue(row.sampleRatio),
    sample_size_status: row.sampleSizeStatus as DashboardSegmentSampleSizeStatus,
    columns: stringArray(row.resultColumnsJson),
    rows: previewRows(row.resultPreviewJson)
  };
}

function toSavedSegment(row: IInsertDashboardCustomSegmentDefinitionResult): DashboardSavedSegment {
  return {
    segment_id: row.segmentId,
    project_id: row.projectId ?? "",
    segment_name: row.segmentName,
    source: "custom_chatkit",
    query_preview_id: row.queryPreviewId ?? "",
    natural_language_query: row.naturalLanguageQuery ?? "",
    generated_sql: row.generatedSql ?? "",
    sample_size: countValue(row.sampleSize),
    total_eligible_user_count: countValue(row.totalEligibleUserCount),
    sample_ratio: numberValue(row.sampleRatio),
    status: savedSegmentStatus(row.status)
  };
}

function previewRows(value: unknown): PreviewRow[] {
  return Array.isArray(value)
    ? value.filter(
        (row): row is PreviewRow => row !== null && typeof row === "object" && !Array.isArray(row)
      )
    : [];
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function roundRatio(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function countValue(value: number | string | null): number {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? Math.max(0, Math.trunc(number)) : 0;
}

function savedSegmentStatus(value: string): DashboardSavedSegment["status"] {
  return value === "archived" ? "archived" : "active";
}

function numberValue(value: number | string | null): number {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function sqlString(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}
