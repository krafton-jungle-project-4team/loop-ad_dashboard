import { z } from "zod";

const DashboardConfigSchema = z.object({
  apiBaseUrl: z.string().min(1),
  projectId: z.literal("google-ga4-demo-commerce"),
  experimentId: z.literal("1"),
  segmentId: z.literal("1"),
  recommendationId: z.literal("1")
});

export const dashboardConfig = DashboardConfigSchema.parse({
  apiBaseUrl: import.meta.env.VITE_LOOPAD_API_BASE_URL,
  projectId: "google-ga4-demo-commerce",
  experimentId: "1",
  segmentId: "1",
  recommendationId: "1"
});
