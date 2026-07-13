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

export interface TrackingPlanJsonSchema {
  type: TrackingPlanPropertyType;
  properties?: Record<string, TrackingPlanJsonSchema>;
  required?: string[];
  items?: TrackingPlanJsonSchema;
}

export const SDK_TRACKING_PLAN_SCHEMA_VERSION = "tracking-plan.v1";
const SDK_SCHEMA_MAX_DEPTH = 8;
const SDK_SCHEMA_MAX_NODES = 100;
const SDK_RESERVED_PROPERTY_NAMES = new Set(["page_path", "page", "sdk", "element"]);
const SDK_DANGEROUS_PROPERTY_NAMES = new Set(["__proto__", "prototype", "constructor"]);

export const TrackingPlanJsonSchemaSchema: z.ZodType<TrackingPlanJsonSchema> = z.lazy(() =>
  z
    .object({
      type: TrackingPlanPropertyTypeSchema,
      properties: z.record(z.string().trim().min(1), TrackingPlanJsonSchemaSchema).optional(),
      required: z.array(z.string().trim().min(1)).optional(),
      items: TrackingPlanJsonSchemaSchema.optional()
    })
    .strict()
    .superRefine((schema, context) => {
      if (schema.type === "object") {
        const properties = schema.properties ?? {};
        for (const requiredName of schema.required ?? []) {
          if (!(requiredName in properties)) {
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

export const TrackingPlanPropertiesSchemaSchema = TrackingPlanJsonSchemaSchema.refine(
  (schema) => schema.type === "object",
  "event properties schema must be an object"
).superRefine((schema, context) => validateSdkSchemaContract(schema, context));

function validateSdkSchemaContract(schema: TrackingPlanJsonSchema, context: z.RefinementCtx): void {
  let nodes = 0;
  let nodeLimitReported = false;

  function visit(current: TrackingPlanJsonSchema, path: PropertyKey[], depth: number): void {
    nodes += 1;
    if (nodes > SDK_SCHEMA_MAX_NODES) {
      if (!nodeLimitReported) {
        context.addIssue({
          code: "custom",
          message: `schema exceeds ${SDK_SCHEMA_MAX_NODES} nodes`,
          path
        });
        nodeLimitReported = true;
      }
      return;
    }
    if (depth > SDK_SCHEMA_MAX_DEPTH) {
      context.addIssue({
        code: "custom",
        message: `schema exceeds depth ${SDK_SCHEMA_MAX_DEPTH}`,
        path
      });
      return;
    }

    if (current.type === "object") {
      const properties = current.properties ?? {};
      const required = current.required ?? [];
      if (new Set(required).size !== required.length) {
        context.addIssue({
          code: "custom",
          message: "required contains duplicates",
          path: [...path, "required"]
        });
      }
      for (const [name, property] of Object.entries(properties)) {
        const propertyPath = [...path, "properties", name];
        if (!name.trim() || name !== name.trim()) {
          context.addIssue({
            code: "custom",
            message: "invalid property name",
            path: propertyPath
          });
          continue;
        }
        if (SDK_DANGEROUS_PROPERTY_NAMES.has(name)) {
          context.addIssue({ code: "custom", message: `${name} is unsafe`, path: propertyPath });
          continue;
        }
        if (depth === 0 && SDK_RESERVED_PROPERTY_NAMES.has(name)) {
          context.addIssue({ code: "custom", message: `${name} is reserved`, path: propertyPath });
          continue;
        }
        visit(property, propertyPath, depth + 1);
      }
      return;
    }

    if (current.type === "array" && current.items) {
      visit(current.items, [...path, "items"], depth + 1);
    }
  }

  visit(schema, [], 0);
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
