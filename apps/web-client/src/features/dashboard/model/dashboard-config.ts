import { z } from "zod";

const DashboardConfigSchema = z.object({
  apiBaseUrl: z.string().min(1)
});

export const dashboardConfig = DashboardConfigSchema.parse({
  apiBaseUrl: import.meta.env.VITE_LOOPAD_API_BASE_URL ?? "/api"
});
