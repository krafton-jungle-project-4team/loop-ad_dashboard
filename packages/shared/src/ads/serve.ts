import { z } from "zod";

export const AdsServeContextSchema = z
  .object({
    pageUrl: z.string().optional(),
    device: z.string().optional()
  })
  .catchall(z.unknown());
export type AdsServeContext = z.infer<typeof AdsServeContextSchema>;

export const AdsServeRequestSchema = z.object({
  projectId: z.string().min(1),
  userId: z.string().min(1),
  placementKey: z.string().min(1),
  context: AdsServeContextSchema.default({})
});
export type AdsServeRequest = z.infer<typeof AdsServeRequestSchema>;

export const ServedAdCreativeSchema = z.object({
  creativeId: z.string(),
  contentType: z.string(),
  title: z.string(),
  body: z.string(),
  ctaLabel: z.string(),
  imageUrl: z.string(),
  landingUrl: z.string()
});
export type ServedAdCreative = z.infer<typeof ServedAdCreativeSchema>;

export const ServedAdTrackingSchema = z.object({
  projectId: z.string(),
  experimentId: z.string(),
  variantId: z.string(),
  creativeId: z.string(),
  mappingId: z.string(),
  actionId: z.string()
});
export type ServedAdTracking = z.infer<typeof ServedAdTrackingSchema>;

export const AdsServeFilledResponseSchema = z.object({
  placementKey: z.string(),
  status: z.literal("filled"),
  ad: ServedAdCreativeSchema,
  tracking: ServedAdTrackingSchema
});
export type AdsServeFilledResponse = z.infer<typeof AdsServeFilledResponseSchema>;

export const AdsServeEmptyResponseSchema = z.object({
  placementKey: z.string(),
  status: z.literal("empty"),
  ad: z.null(),
  tracking: z.null()
});
export type AdsServeEmptyResponse = z.infer<typeof AdsServeEmptyResponseSchema>;

export const AdsServeResponseSchema = z.discriminatedUnion("status", [
  AdsServeFilledResponseSchema,
  AdsServeEmptyResponseSchema
]);
export type AdsServeResponse = z.infer<typeof AdsServeResponseSchema>;
