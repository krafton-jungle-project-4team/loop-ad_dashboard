import { z } from "zod";

export const FunnelStepKeySchema = z.enum([
  "impression",
  "click",
  "page_view",
  "product_view",
  "add_to_cart",
  "checkout_start",
  "purchase"
]);

export const FunnelStepSchema = z.object({
  key: FunnelStepKeySchema,
  label: z.string(),
  userCount: z.number(),
  displayUserCount: z.string(),
  conversionRate: z.number(),
  dropOffRate: z.number()
});
export type FunnelStep = z.infer<typeof FunnelStepSchema>;

export const FunnelComparisonRowSchema = z.object({
  segment: z.string(),
  steps: z.array(FunnelStepSchema)
});
export type FunnelComparisonRow = z.infer<typeof FunnelComparisonRowSchema>;
