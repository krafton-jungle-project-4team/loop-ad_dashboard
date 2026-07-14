import type { ClickHouseClient } from "@clickhouse/client";
import { Inject, Injectable } from "@nestjs/common";
import type {
  TrackingPlanEventInput,
  TrackingPlanJsonSchema,
  TrackingPlanPropertyType
} from "@loopad/shared";
import {
  TRACKING_PLAN_MAX_SCHEMA_DEPTH,
  TRACKING_PLAN_MAX_SCHEMA_NODES,
  TRACKING_PLAN_RESERVED_ROOT_PROPERTIES,
  TRACKING_PLAN_UNSAFE_PROPERTIES,
  TrackingPlanEventInputSchema
} from "@loopad/shared";
import { CLICKHOUSE_CLIENT } from "../../infra/database/index.js";

const LOOKBACK_DAYS = 30;
const MAX_EVENT_SAMPLES = 50;
const MAX_OBSERVED_ROWS = 5000;

export type ObservedEventRow = {
  event_name: string;
  properties_json: string;
};

type SchemaBudget = {
  remainingNodes: number;
};

@Injectable()
export class TrackingPlanObservedEventReader {
  constructor(
    @Inject(CLICKHOUSE_CLIENT)
    private readonly clickhouse: ClickHouseClient
  ) {}

  async inferEvents(projectId: string): Promise<TrackingPlanEventInput[]> {
    const result = await this.clickhouse.query({
      query: `
        SELECT event_name, properties_json
        FROM raw_events
        WHERE project_id = {projectId:String}
          AND event_time >= now() - toIntervalDay({lookbackDays:UInt32})
          AND event_name != ''
        ORDER BY event_name ASC, event_time DESC
        LIMIT {sampleLimit:UInt32} BY event_name
        LIMIT {rowLimit:UInt32}
      `,
      format: "JSONEachRow",
      query_params: {
        lookbackDays: LOOKBACK_DAYS,
        projectId,
        rowLimit: MAX_OBSERVED_ROWS,
        sampleLimit: MAX_EVENT_SAMPLES
      },
      clickhouse_settings: {
        max_execution_time: 5,
        readonly: "1"
      }
    });

    return inferTrackingPlanEvents(await result.json<ObservedEventRow>());
  }
}

export function inferTrackingPlanEvents(
  rows: ReadonlyArray<ObservedEventRow>
): TrackingPlanEventInput[] {
  const samplesByEvent = new Map<string, Record<string, unknown>[]>();

  for (const row of rows) {
    const properties = parseProperties(row.properties_json);
    if (!properties) continue;
    const samples = samplesByEvent.get(row.event_name) ?? [];
    samples.push(properties);
    samplesByEvent.set(row.event_name, samples);
  }

  return [...samplesByEvent.entries()]
    .map(([eventName, samples]) => {
      const propertiesSchema = inferSchema(samples, 0, {
        remainingNodes: TRACKING_PLAN_MAX_SCHEMA_NODES
      });
      if (!propertiesSchema || propertiesSchema.type !== "object") return null;

      const parsed = TrackingPlanEventInputSchema.safeParse({
        eventName,
        description: `최근 수집 데이터에서 자동 생성한 ${eventName} 이벤트`,
        propertiesSchema
      });
      return parsed.success ? parsed.data : null;
    })
    .filter((event): event is TrackingPlanEventInput => event !== null)
    .sort((left, right) => {
      if (left.eventName === "page_view") return -1;
      if (right.eventName === "page_view") return 1;
      return left.eventName.localeCompare(right.eventName);
    });
}

function inferSchema(
  values: ReadonlyArray<unknown>,
  depth: number,
  budget: SchemaBudget
): TrackingPlanJsonSchema | undefined {
  if (depth > TRACKING_PLAN_MAX_SCHEMA_DEPTH || budget.remainingNodes <= 0) return undefined;

  const nonNullValues = values.filter((value) => value !== null && value !== undefined);
  const type = commonType(nonNullValues);
  if (!type) return undefined;

  budget.remainingNodes -= 1;

  if (type === "object") {
    const objects = nonNullValues.filter(isRecord);
    const properties: Record<string, TrackingPlanJsonSchema> = {};
    const required: string[] = [];
    const propertyNames = [...new Set(objects.flatMap((value) => Object.keys(value)))].sort();

    for (const name of propertyNames) {
      if (!isSafePropertyName(name, depth) || budget.remainingNodes <= 0) continue;
      const propertyValues = objects
        .filter((value) => Object.hasOwn(value, name))
        .map((value) => value[name]);
      const propertySchema = inferSchema(propertyValues, depth + 1, budget);
      if (!propertySchema) continue;
      properties[name] = propertySchema;
      if (
        objects.every(
          (value) => Object.hasOwn(value, name) && value[name] !== null && value[name] !== undefined
        )
      ) {
        required.push(name);
      }
    }

    return { type, properties, required };
  }

  if (type === "array") {
    const items = nonNullValues.filter(Array.isArray).flat();
    if (items.length === 0) {
      if (budget.remainingNodes <= 0) return undefined;
      budget.remainingNodes -= 1;
      return { type, items: { type: "string" } };
    }
    const itemSchema = inferSchema(items, depth + 1, budget);
    return itemSchema ? { type, items: itemSchema } : undefined;
  }

  return { type };
}

function commonType(values: ReadonlyArray<unknown>): TrackingPlanPropertyType | undefined {
  const types = new Set(values.map(valueType).filter((type) => type !== undefined));
  if (types.size === 0) return undefined;
  if (types.size === 1) return [...types][0];
  if (types.size === 2 && types.has("integer") && types.has("number")) return "number";
  return undefined;
}

function valueType(value: unknown): TrackingPlanPropertyType | undefined {
  if (Array.isArray(value)) return "array";
  if (isRecord(value)) return "object";
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "number" && Number.isFinite(value)) {
    return Number.isInteger(value) ? "integer" : "number";
  }
  if (typeof value === "string") return "string";
  return undefined;
}

function parseProperties(value: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(value);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function isSafePropertyName(name: string, depth: number): boolean {
  if (!name || name !== name.trim()) return false;
  if ((TRACKING_PLAN_UNSAFE_PROPERTIES as ReadonlyArray<string>).includes(name)) return false;
  return !(
    depth === 0 && (TRACKING_PLAN_RESERVED_ROOT_PROPERTIES as ReadonlyArray<string>).includes(name)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
