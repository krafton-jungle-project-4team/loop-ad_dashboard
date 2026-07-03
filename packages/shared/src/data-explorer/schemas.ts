import { z } from "zod";

export const DataExplorerSourceIdSchema = z.enum(["postgres_contract", "clickhouse_events"]);
export type DataExplorerSourceId = z.infer<typeof DataExplorerSourceIdSchema>;

export const DataExplorerSourceKindSchema = z.enum(["postgres", "clickhouse"]);
export type DataExplorerSourceKind = z.infer<typeof DataExplorerSourceKindSchema>;

export const DataExplorerCapabilitySchema = z.enum(["sql_query", "schema_browser", "ai_query"]);
export type DataExplorerCapability = z.infer<typeof DataExplorerCapabilitySchema>;

export const DataExplorerObjectTypeSchema = z.enum([
  "database",
  "schema",
  "table",
  "view",
  "materialized_view",
  "column"
]);
export type DataExplorerObjectType = z.infer<typeof DataExplorerObjectTypeSchema>;

export const DataExplorerDdlSourceSchema = z.enum(["live", "cache"]);
export type DataExplorerDdlSource = z.infer<typeof DataExplorerDdlSourceSchema>;

export const DataExplorerSourceSchema = z.object({
  source_id: DataExplorerSourceIdSchema,
  kind: DataExplorerSourceKindSchema,
  display_name: z.string().min(1),
  purpose: z.string().min(1),
  capabilities: z.array(DataExplorerCapabilitySchema)
});
export type DataExplorerSource = z.infer<typeof DataExplorerSourceSchema>;

export const DataExplorerObjectRefSchema = z.object({
  source_id: DataExplorerSourceIdSchema,
  database_name: z.string().nullable(),
  schema_name: z.string().nullable(),
  object_type: DataExplorerObjectTypeSchema,
  object_name: z.string().min(1),
  column_name: z.string().nullable().optional()
});
export type DataExplorerObjectRef = z.infer<typeof DataExplorerObjectRefSchema>;

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

export const DataExplorerIndexSchema = z.object({
  index_name: z.string().min(1),
  definition: z.string().min(1)
});
export type DataExplorerIndex = z.infer<typeof DataExplorerIndexSchema>;

export const DataExplorerConstraintSchema = z.object({
  constraint_name: z.string().min(1),
  constraint_type: z.string().min(1),
  definition: z.string().min(1)
});
export type DataExplorerConstraint = z.infer<typeof DataExplorerConstraintSchema>;

export const DataExplorerObjectDetailSchema = z.object({
  object: DataExplorerObjectSummarySchema,
  columns: z.array(DataExplorerColumnSchema),
  indexes: z.array(DataExplorerIndexSchema),
  constraints: z.array(DataExplorerConstraintSchema),
  partition_key: z.array(z.string()).nullable(),
  order_by: z.array(z.string()).nullable(),
  primary_key: z.array(z.string()).nullable(),
  ddl_fetched_at: z.string().min(1),
  ddl_source: DataExplorerDdlSourceSchema,
  cache_hit: z.boolean()
});
export type DataExplorerObjectDetail = z.infer<typeof DataExplorerObjectDetailSchema>;

export const DataExplorerObjectDdlSchema = z.object({
  ref: DataExplorerObjectRefSchema,
  ddl: z.string().min(1),
  ddl_fetched_at: z.string().min(1),
  ddl_source: DataExplorerDdlSourceSchema,
  cache_hit: z.boolean()
});
export type DataExplorerObjectDdl = z.infer<typeof DataExplorerObjectDdlSchema>;

export const DataExplorerSourcesResponseSchema = z.object({
  sources: z.array(DataExplorerSourceSchema)
});
export type DataExplorerSourcesResponse = z.infer<typeof DataExplorerSourcesResponseSchema>;

export const DataExplorerObjectsResponseSchema = z.object({
  source_id: DataExplorerSourceIdSchema,
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
  warnings: z.array(DataExplorerValidationIssueSchema),
  normalized_sql: z.string(),
  effective_row_limit: z.number().int().positive(),
  effective_timeout_ms: z.number().int().positive()
});
export type DataExplorerSqlValidation = z.infer<typeof DataExplorerSqlValidationSchema>;

export const DataExplorerQueryValidateRequestSchema = z.object({
  project_id: z.string().trim().min(1),
  source_id: DataExplorerSourceIdSchema,
  sql_text: z.string(),
  params: z.record(z.string(), z.unknown()).default({}),
  row_limit: z.number().int().positive().optional(),
  timeout_ms: z.number().int().positive().optional()
});
export type DataExplorerQueryValidateRequest = z.infer<
  typeof DataExplorerQueryValidateRequestSchema
>;

export const DataExplorerQueryValidateResponseSchema = z.object({
  source_id: DataExplorerSourceIdSchema,
  validation: DataExplorerSqlValidationSchema
});
export type DataExplorerQueryValidateResponse = z.infer<
  typeof DataExplorerQueryValidateResponseSchema
>;

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

export const DataExplorerQueryRunRequestSchema = DataExplorerQueryValidateRequestSchema.extend({
  origin: z.enum(["manual", "chatkit", "system"]).default("manual"),
  chat_session_id: z.string().trim().min(1).optional(),
  action_run_id: z.string().trim().min(1).optional(),
  schema_context: z.array(DataExplorerObjectDetailSchema).optional()
});
export type DataExplorerQueryRunRequest = z.infer<typeof DataExplorerQueryRunRequestSchema>;

export const DataExplorerQueryRunResponseSchema = z.object({
  query_run_id: z.string().min(1),
  status: z.enum(["succeeded", "failed", "cancelled"]),
  source_id: DataExplorerSourceIdSchema,
  duration_ms: z.number().int().nonnegative(),
  row_count: z.number().int().nonnegative(),
  truncated: z.boolean(),
  columns: z.array(DataExplorerResultColumnSchema),
  rows: z.array(z.record(z.string(), z.unknown())),
  suggested_visualizations: z.array(DataExplorerChartSpecSchema),
  validation: DataExplorerSqlValidationSchema
});
export type DataExplorerQueryRunResponse = z.infer<typeof DataExplorerQueryRunResponseSchema>;

export const DataExplorerQueryRunMetadataSchema = z.object({
  query_run_id: z.string().min(1),
  project_id: z.string().min(1),
  source_id: DataExplorerSourceIdSchema,
  origin: z.enum(["manual", "chatkit", "system"]),
  sql_text: z.string().min(1),
  row_count: z.number().int().nonnegative(),
  truncated: z.boolean(),
  duration_ms: z.number().int().nonnegative(),
  status: z.enum(["succeeded", "failed", "cancelled"]),
  error_summary: z.string().nullable(),
  executed_at: z.string().min(1)
});
export type DataExplorerQueryRunMetadata = z.infer<typeof DataExplorerQueryRunMetadataSchema>;

export const DataExplorerQueryRunsResponseSchema = z.object({
  query_runs: z.array(DataExplorerQueryRunMetadataSchema)
});
export type DataExplorerQueryRunsResponse = z.infer<typeof DataExplorerQueryRunsResponseSchema>;

export const DataExplorerTimeRangeSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1)
});
export type DataExplorerTimeRange = z.infer<typeof DataExplorerTimeRangeSchema>;

export const DataExplorerAiQueryPlanRequestSchema = z.object({
  project_id: z.string().trim().min(1),
  source_id: DataExplorerSourceIdSchema.optional(),
  natural_language_query: z.string().trim().min(1),
  time_range: DataExplorerTimeRangeSchema.optional(),
  force_live_schema: z.boolean().default(true)
});
export type DataExplorerAiQueryPlanRequest = z.infer<typeof DataExplorerAiQueryPlanRequestSchema>;

export const DataExplorerSchemaContextSchema = z.object({
  object_type: DataExplorerObjectTypeSchema,
  object_name: z.string().min(1),
  ddl_fetched_at: z.string().min(1),
  ddl_source: DataExplorerDdlSourceSchema,
  columns: z.array(z.string().min(1))
});
export type DataExplorerSchemaContext = z.infer<typeof DataExplorerSchemaContextSchema>;

export const DataExplorerAiQueryPlanResponseSchema = z.object({
  query_plan_id: z.string().min(1),
  source_id: DataExplorerSourceIdSchema,
  schema_context: z.array(DataExplorerSchemaContextSchema),
  generated_sql: z.string(),
  params: z.record(z.string(), z.unknown()),
  referenced_objects: z.array(DataExplorerObjectRefSchema),
  suggested_visualizations: z.array(DataExplorerChartSpecSchema),
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
export type DataExplorerAiChatCurrentResult = z.infer<
  typeof DataExplorerAiChatCurrentResultSchema
>;

export const DataExplorerAiChatRequestSchema = z.object({
  project_id: z.string().trim().min(1),
  source_id: DataExplorerSourceIdSchema.optional(),
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
