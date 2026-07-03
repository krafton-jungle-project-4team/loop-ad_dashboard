import { z } from "zod";

export const DataExplorerSourceIdSchema = z.enum(["postgres_contract", "clickhouse_events"]);
export type DataExplorerSourceId = z.infer<typeof DataExplorerSourceIdSchema>;

export const DataExplorerSourceKindSchema = z.enum(["postgres", "clickhouse"]);
export type DataExplorerSourceKind = z.infer<typeof DataExplorerSourceKindSchema>;

export const DataExplorerCapabilitySchema = z.enum(["schema_browser"]);
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
