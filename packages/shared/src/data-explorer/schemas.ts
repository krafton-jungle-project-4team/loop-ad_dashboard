import { z } from "zod";

export const DataExplorerObjectTypeSchema = z.enum(["table", "view", "materialized_view"]);
export type DataExplorerObjectType = z.infer<typeof DataExplorerObjectTypeSchema>;

export const DataExplorerDdlSourceSchema = z.enum(["live", "cache"]);
export type DataExplorerDdlSource = z.infer<typeof DataExplorerDdlSourceSchema>;

export const DataExplorerObjectRefSchema = z.object({
  database_name: z.string().nullable(),
  schema_name: z.string().nullable(),
  object_type: DataExplorerObjectTypeSchema,
  object_name: z.string().min(1)
});
export type DataExplorerObjectRef = z.infer<typeof DataExplorerObjectRefSchema>;

const OptionalQueryStringSchema = z.preprocess(
  (value) => (typeof value === "string" && !value.trim() ? undefined : value),
  z.string().trim().min(1).optional()
);

export const DataExplorerObjectsQuerySchema = z
  .object({
    database: OptionalQueryStringSchema,
    schema: OptionalQueryStringSchema,
    type: DataExplorerObjectTypeSchema.optional(),
    q: OptionalQueryStringSchema
  })
  .transform((query) => ({
    databaseName: query.database,
    schemaName: query.schema,
    objectType: query.type,
    q: query.q
  }));
export type DataExplorerObjectsQuery = z.infer<typeof DataExplorerObjectsQuerySchema>;

export const DataExplorerObjectDetailQuerySchema = z
  .object({
    database: OptionalQueryStringSchema,
    schema: OptionalQueryStringSchema,
    object_type: DataExplorerObjectTypeSchema,
    object_name: z.string().trim().min(1)
  })
  .transform((query) =>
    DataExplorerObjectRefSchema.parse({
      database_name: query.database ?? null,
      schema_name: query.schema ?? null,
      object_type: query.object_type,
      object_name: query.object_name
    })
  );
export type DataExplorerObjectDetailQuery = z.infer<typeof DataExplorerObjectDetailQuerySchema>;

export const DataExplorerObjectSummarySchema = DataExplorerObjectRefSchema.extend({
  source_comment: z.string().nullable(),
  engine: z.string().nullable(),
  column_count: z.number().int().nonnegative(),
  row_count_estimate: z.number().int().nonnegative().nullable()
});
export type DataExplorerObjectSummary = z.infer<typeof DataExplorerObjectSummarySchema>;

export const DataExplorerColumnSchema = z.object({
  column_name: z.string().min(1),
  data_type: z.string().min(1),
  nullable: z.boolean(),
  default_value: z.string().nullable(),
  ordinal_position: z.number().int().positive(),
  source_comment: z.string().nullable()
});
export type DataExplorerColumn = z.infer<typeof DataExplorerColumnSchema>;

export const DataExplorerObjectDetailSchema = z.object({
  object: DataExplorerObjectSummarySchema,
  columns: z.array(DataExplorerColumnSchema),
  partition_key: z.array(z.string()).nullable(),
  order_by: z.array(z.string()).nullable(),
  primary_key: z.array(z.string()).nullable(),
  ddl_fetched_at: z.string().min(1),
  ddl_source: DataExplorerDdlSourceSchema,
  cache_hit: z.boolean()
});
export type DataExplorerObjectDetail = z.infer<typeof DataExplorerObjectDetailSchema>;

export const DataExplorerObjectsResponseSchema = z.object({
  objects: z.array(DataExplorerObjectSummarySchema),
  ddl_fetched_at: z.string().min(1),
  ddl_source: DataExplorerDdlSourceSchema,
  cache_hit: z.boolean()
});
export type DataExplorerObjectsResponse = z.infer<typeof DataExplorerObjectsResponseSchema>;

export const DataExplorerValidationIssueSchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1)
});
export type DataExplorerValidationIssue = z.infer<typeof DataExplorerValidationIssueSchema>;

export const DataExplorerSqlValidationSchema = z.object({
  status: z.enum(["valid", "invalid"]),
  errors: z.array(DataExplorerValidationIssueSchema),
  normalized_sql: z.string()
});
export type DataExplorerSqlValidation = z.infer<typeof DataExplorerSqlValidationSchema>;

export const DataExplorerSemanticTypeSchema = z.enum([
  "time",
  "dimension",
  "measure",
  "boolean",
  "json",
  "unknown"
]);
export type DataExplorerSemanticType = z.infer<typeof DataExplorerSemanticTypeSchema>;

export const DataExplorerResultColumnSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  semantic_type: DataExplorerSemanticTypeSchema
});
export type DataExplorerResultColumn = z.infer<typeof DataExplorerResultColumnSchema>;

export const DataExplorerChartSpecSchema = z.object({
  chart_type: z.enum(["line", "bar", "scatter"]),
  x: z.object({
    column: z.string().min(1),
    type: DataExplorerSemanticTypeSchema
  }),
  y: z.array(
    z.object({
      column: z.string().min(1),
      aggregation: z.enum(["none", "count", "sum", "avg"])
    })
  ),
  series: z
    .object({
      column: z.string().min(1)
    })
    .nullable(),
  options: z.object({
    stack: z.boolean(),
    show_legend: z.boolean()
  })
});
export type DataExplorerChartSpec = z.infer<typeof DataExplorerChartSpecSchema>;

export const DataExplorerQueryRunRequestSchema = z.object({
  project_id: z.string().trim().min(1),
  sql_text: z.string(),
  row_limit: z.number().int().positive().optional(),
  timeout_ms: z.number().int().positive().optional(),
  origin: z.enum(["manual", "chatkit", "system"]).default("manual")
});
export type DataExplorerQueryRunRequest = z.infer<typeof DataExplorerQueryRunRequestSchema>;

export const DataExplorerQueryRunResponseSchema = z.object({
  query_run_id: z.string().min(1),
  status: z.enum(["succeeded", "failed", "cancelled"]),
  duration_ms: z.number().int().nonnegative(),
  row_count: z.number().int().nonnegative(),
  truncated: z.boolean(),
  columns: z.array(DataExplorerResultColumnSchema),
  rows: z.array(z.record(z.string(), z.unknown())),
  suggested_visualizations: z.array(DataExplorerChartSpecSchema),
  validation: DataExplorerSqlValidationSchema
});
export type DataExplorerQueryRunResponse = z.infer<typeof DataExplorerQueryRunResponseSchema>;

export const DataExplorerTimeRangeSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1)
});
export type DataExplorerTimeRange = z.infer<typeof DataExplorerTimeRangeSchema>;

export const DataExplorerAiQueryPlanRequestSchema = z.object({
  project_id: z.string().trim().min(1),
  natural_language_query: z.string().trim().min(1),
  time_range: DataExplorerTimeRangeSchema.optional()
});
export type DataExplorerAiQueryPlanRequest = z.infer<typeof DataExplorerAiQueryPlanRequestSchema>;

export const DataExplorerAiQueryPlanResponseSchema = z.object({
  query_plan_id: z.string().min(1),
  generated_sql: z.string(),
  validation: DataExplorerSqlValidationSchema
});
export type DataExplorerAiQueryPlanResponse = z.infer<typeof DataExplorerAiQueryPlanResponseSchema>;

export const DataExplorerAiChatCurrentResultSchema = z.object({
  query_run_id: z.string().min(1),
  columns: z.array(DataExplorerResultColumnSchema),
  rows: z.array(z.record(z.string(), z.unknown())),
  row_count: z.number().int().nonnegative(),
  truncated: z.boolean()
});
export type DataExplorerAiChatCurrentResult = z.infer<typeof DataExplorerAiChatCurrentResultSchema>;

export const DataExplorerAiChatRequestSchema = z.object({
  project_id: z.string().trim().min(1),
  message: z.string().trim().min(1),
  current_result: DataExplorerAiChatCurrentResultSchema.optional()
});
export type DataExplorerAiChatRequest = z.infer<typeof DataExplorerAiChatRequestSchema>;

export const DataExplorerAiChatResponseSchema = z.object({
  action: z.enum(["query_run", "result_analysis"]),
  assistant_message: z.string().min(1),
  query_plan: DataExplorerAiQueryPlanResponseSchema.nullable(),
  query_result: DataExplorerQueryRunResponseSchema.nullable()
});
export type DataExplorerAiChatResponse = z.infer<typeof DataExplorerAiChatResponseSchema>;
