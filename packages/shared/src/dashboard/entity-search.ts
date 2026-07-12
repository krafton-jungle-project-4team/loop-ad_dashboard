import { z } from "zod";

export const DashboardEntityTypeSchema = z.enum(["campaign", "promotion", "segment"]);
export type DashboardEntityType = z.infer<typeof DashboardEntityTypeSchema>;

export const DashboardEntitySearchTypeSchema = z.enum(["all", "campaign", "promotion", "segment"]);
export type DashboardEntitySearchType = z.infer<typeof DashboardEntitySearchTypeSchema>;

export const DashboardEntitySearchQuerySchema = z.object({
  project_id: z.string().trim().min(1),
  q: z.string().trim().min(1),
  entity_type: DashboardEntitySearchTypeSchema.default("all")
});
export type DashboardEntitySearchQuery = z.infer<typeof DashboardEntitySearchQuerySchema>;

export const DashboardEntitySearchResultSchema = z.object({
  entity_type: DashboardEntityTypeSchema,
  entity_id: z.string(),
  display_name: z.string(),
  status: z.string(),
  campaign_id: z.string(),
  promotion_id: z.string().nullable(),
  segment_id: z.string().nullable(),
  updated_at: z.string()
});
export type DashboardEntitySearchResult = z.infer<typeof DashboardEntitySearchResultSchema>;

export const DashboardEntitySearchResponseSchema = z.object({
  results: z.array(DashboardEntitySearchResultSchema).max(20)
});
export type DashboardEntitySearchResponse = z.infer<typeof DashboardEntitySearchResponseSchema>;
