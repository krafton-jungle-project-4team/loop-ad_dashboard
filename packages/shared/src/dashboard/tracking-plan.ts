import { z } from "zod";

export const TrackingPlanPropertyTypeSchema = z.enum([
  "object",
  "string",
  "number",
  "integer",
  "boolean",
  "array"
]);
export type TrackingPlanPropertyType = z.infer<typeof TrackingPlanPropertyTypeSchema>;

export const TRACKING_PLAN_MAX_SCHEMA_DEPTH = 8;
export const TRACKING_PLAN_MAX_SCHEMA_NODES = 100;
export const TRACKING_PLAN_RESERVED_ROOT_PROPERTIES = [
  "page_path",
  "page",
  "sdk",
  "element"
] as const;
export const TRACKING_PLAN_UNSAFE_PROPERTIES = ["__proto__", "prototype", "constructor"] as const;

export interface TrackingPlanJsonSchema {
  type: TrackingPlanPropertyType;
  properties?: Record<string, TrackingPlanJsonSchema>;
  required?: string[];
  items?: TrackingPlanJsonSchema;
}

export const SDK_TRACKING_PLAN_SCHEMA_VERSION = "tracking-plan.v1";
const TrackingPlanPropertyNameSchema = z
  .string()
  .min(1)
  .refine((value) => value === value.trim(), "property names must not have surrounding whitespace");

export const TrackingPlanJsonSchemaSchema: z.ZodType<TrackingPlanJsonSchema> = z.lazy(() =>
  z
    .object({
      type: TrackingPlanPropertyTypeSchema,
      properties: z.record(TrackingPlanPropertyNameSchema, TrackingPlanJsonSchemaSchema).optional(),
      required: z.array(TrackingPlanPropertyNameSchema).optional(),
      items: TrackingPlanJsonSchemaSchema.optional()
    })
    .strict()
    .superRefine((schema, context) => {
      if (schema.type === "object") {
        const properties = schema.properties ?? {};
        for (const requiredName of schema.required ?? []) {
          if (!Object.prototype.hasOwnProperty.call(properties, requiredName)) {
            context.addIssue({
              code: "custom",
              message: `required property ${requiredName} is not defined`,
              path: ["required"]
            });
          }
        }
        if (schema.items !== undefined) {
          context.addIssue({ code: "custom", message: "object schema cannot define items" });
        }
        return;
      }

      if (schema.type === "array") {
        if (!schema.items) {
          context.addIssue({
            code: "custom",
            message: "array schema requires items",
            path: ["items"]
          });
        }
        if (schema.properties !== undefined || schema.required !== undefined) {
          context.addIssue({ code: "custom", message: "array schema cannot define object fields" });
        }
        return;
      }

      if (
        schema.properties !== undefined ||
        schema.required !== undefined ||
        schema.items !== undefined
      ) {
        context.addIssue({
          code: "custom",
          message: `${schema.type} schema cannot define nested fields`
        });
      }
    })
);

const TrackingPlanPropertiesShapeSchema = TrackingPlanJsonSchemaSchema.refine(
  (schema) => schema.type === "object",
  "event properties schema must be an object"
).superRefine((schema, context) => {
  if (schema.type !== "object") return;
  for (const issue of trackingPlanSchemaIssues(schema)) {
    context.addIssue({
      code: "custom",
      message: issue.message,
      path: issue.path
    });
  }
});

const TrackingPlanSchemaComplexityGuard = z.unknown().superRefine((value, context) => {
  const pending: Array<{ value: unknown; depth: number; path: PropertyKey[] }> = [
    { value, depth: 0, path: [] }
  ];
  const visited = new WeakSet<object>();
  let nodes = 0;

  while (pending.length > 0) {
    const current = pending.pop();
    if (!current || !isRecord(current.value)) continue;
    if (visited.has(current.value)) {
      context.addIssue({
        code: "custom",
        message: "schema must not be circular",
        path: current.path
      });
      return;
    }
    visited.add(current.value);
    nodes += 1;
    if (nodes > TRACKING_PLAN_MAX_SCHEMA_NODES) {
      context.addIssue({
        code: "custom",
        message: `schema exceeds ${TRACKING_PLAN_MAX_SCHEMA_NODES} nodes`,
        path: current.path
      });
      return;
    }
    if (current.depth > TRACKING_PLAN_MAX_SCHEMA_DEPTH) {
      context.addIssue({
        code: "custom",
        message: `schema exceeds depth ${TRACKING_PLAN_MAX_SCHEMA_DEPTH}`,
        path: current.path
      });
      return;
    }

    if (isRecord(current.value.properties)) {
      for (const [name, child] of Object.entries(current.value.properties)) {
        pending.push({
          value: child,
          depth: current.depth + 1,
          path: [...current.path, "properties", name]
        });
      }
    }
    if (current.value.items !== undefined) {
      pending.push({
        value: current.value.items,
        depth: current.depth + 1,
        path: [...current.path, "items"]
      });
    }
  }
});

export const TrackingPlanPropertiesSchemaSchema = TrackingPlanSchemaComplexityGuard.pipe(
  TrackingPlanPropertiesShapeSchema
);

type TrackingPlanSchemaIssue = {
  message: string;
  path: PropertyKey[];
};

function trackingPlanSchemaIssues(schema: TrackingPlanJsonSchema): TrackingPlanSchemaIssue[] {
  const issues: TrackingPlanSchemaIssue[] = [];
  const state = { nodes: 0 };
  const reservedRootProperties = new Set<string>(TRACKING_PLAN_RESERVED_ROOT_PROPERTIES);
  const unsafeProperties = new Set<string>(TRACKING_PLAN_UNSAFE_PROPERTIES);

  function visit(current: TrackingPlanJsonSchema, depth: number, path: PropertyKey[]) {
    state.nodes += 1;
    if (state.nodes > TRACKING_PLAN_MAX_SCHEMA_NODES) {
      if (state.nodes === TRACKING_PLAN_MAX_SCHEMA_NODES + 1) {
        issues.push({
          message: `schema exceeds ${TRACKING_PLAN_MAX_SCHEMA_NODES} nodes`,
          path
        });
      }
      return;
    }
    if (depth > TRACKING_PLAN_MAX_SCHEMA_DEPTH) {
      issues.push({
        message: `schema exceeds depth ${TRACKING_PLAN_MAX_SCHEMA_DEPTH}`,
        path
      });
      return;
    }

    if (current.type === "object") {
      const required = current.required ?? [];
      if (new Set(required).size !== required.length) {
        issues.push({ message: "required contains duplicates", path: [...path, "required"] });
      }
      for (const [name, child] of Object.entries(current.properties ?? {})) {
        const propertyPath = [...path, "properties", name];
        if (name !== name.trim()) {
          issues.push({
            message: "property names must not have surrounding whitespace",
            path: propertyPath
          });
        }
        if (unsafeProperties.has(name)) {
          issues.push({ message: `${name} is unsafe`, path: propertyPath });
        }
        if (depth === 0 && reservedRootProperties.has(name)) {
          issues.push({ message: `${name} is reserved`, path: propertyPath });
        }
        visit(child, depth + 1, propertyPath);
      }
      return;
    }

    if (current.type === "array" && current.items) {
      visit(current.items, depth + 1, [...path, "items"]);
    }
  }

  visit(schema, 0, []);
  return issues;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export const TrackingPlanEventStatusSchema = z.enum(["draft", "system", "archived"]);

export const TrackingPlanEventSchema = z.object({
  eventName: z.string().trim().min(1).max(100),
  description: z.string().trim().max(2000).default(""),
  status: TrackingPlanEventStatusSchema,
  propertiesSchema: TrackingPlanPropertiesSchemaSchema
});
export type TrackingPlanEvent = z.infer<typeof TrackingPlanEventSchema>;

export const TrackingPlanEventInputSchema = TrackingPlanEventSchema.pick({
  eventName: true,
  description: true,
  propertiesSchema: true
});
export type TrackingPlanEventInput = z.infer<typeof TrackingPlanEventInputSchema>;

export const TrackingPlanEventUpdateSchema = TrackingPlanEventInputSchema.omit({ eventName: true });
export type TrackingPlanEventUpdate = z.infer<typeof TrackingPlanEventUpdateSchema>;

export const SdkAllowedOriginSchema = z
  .string()
  .trim()
  .url()
  .refine((value) => {
    const url = new URL(value);
    return (url.protocol === "https:" || url.protocol === "http:") && url.origin === value;
  }, "must be an exact HTTP(S) origin without a path");

export const TrackingPlanCreateRequestSchema = z.object({
  name: z.string().trim().min(1).max(255).default("Default Tracking Plan"),
  allowedOrigins: z.array(SdkAllowedOriginSchema).max(20).optional()
});
export type TrackingPlanCreateRequest = z.infer<typeof TrackingPlanCreateRequestSchema>;

export const SdkSettingsUpdateSchema = z.object({
  allowedOrigins: z
    .array(SdkAllowedOriginSchema)
    .min(1)
    .max(20)
    .transform((origins) => [...new Set(origins)])
});
export type SdkSettingsUpdate = z.infer<typeof SdkSettingsUpdateSchema>;

export const TrackingPlanSchema = z.object({
  trackingPlanId: z.string(),
  projectId: z.string(),
  name: z.string(),
  status: z.enum(["draft", "published", "archived"]),
  currentRevision: z.number().int().nonnegative(),
  publishedRevision: z.number().int().positive().nullable(),
  sdkKey: z.string(),
  allowedOrigins: z.array(SdkAllowedOriginSchema),
  events: z.array(TrackingPlanEventSchema)
});
export type TrackingPlan = z.infer<typeof TrackingPlanSchema>;

export const TrackingPlanValidationSchema = z.object({
  valid: z.boolean(),
  issues: z.array(z.string())
});
export type TrackingPlanValidation = z.infer<typeof TrackingPlanValidationSchema>;

export const SdkPublishedEventSchema = TrackingPlanEventSchema.omit({ status: true });
export type SdkPublishedEvent = z.infer<typeof SdkPublishedEventSchema>;

export const SdkPublishedSchemaSchema = z.object({
  schemaVersion: z.literal(SDK_TRACKING_PLAN_SCHEMA_VERSION),
  revision: z.number().int().positive(),
  events: z.array(SdkPublishedEventSchema)
});
export type SdkPublishedSchema = z.infer<typeof SdkPublishedSchemaSchema>;

export const SdkConnectionSchema = SdkPublishedSchemaSchema.extend({
  projectId: z.string(),
  writeKey: z.string(),
  collectorUrl: z.string().url(),
  schemaUrl: z.string().url(),
  cacheTtlSeconds: z.number().positive()
});
export type SdkConnection = z.infer<typeof SdkConnectionSchema>;
