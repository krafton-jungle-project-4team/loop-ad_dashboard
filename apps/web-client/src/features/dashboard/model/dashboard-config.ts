import { z } from "zod";

const DashboardConfigSchema = z.object({
  apiBaseUrl: z.string().min(1),
  projectId: z.literal("demo_project"),
  experimentId: z.literal("exp_001"),
  segmentId: z.literal("seg_30m_mobile_fresh"),
  recommendationId: z.literal("rec_001")
});

export const dashboardConfig = DashboardConfigSchema.parse({
  apiBaseUrl: import.meta.env.VITE_LOOPAD_API_BASE_URL,
  projectId: "demo_project",
  experimentId: "exp_001",
  segmentId: "seg_30m_mobile_fresh",
  recommendationId: "rec_001"
});
