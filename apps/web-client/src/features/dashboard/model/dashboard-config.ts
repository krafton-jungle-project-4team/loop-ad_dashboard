import { z } from "zod";

const DashboardConfigSchema = z.object({
  apiBaseUrl: z.string().min(1),
  dataSource: z.enum(["fixture", "http"]),
  fixtureLatencyMs: z.coerce.number().int().nonnegative()
});

export const dashboardConfig = DashboardConfigSchema.parse({
  apiBaseUrl: import.meta.env.VITE_LOOPAD_API_BASE_URL ?? "/api",
  dataSource: import.meta.env.VITE_LOOPAD_DATA_SOURCE ?? "fixture",
  fixtureLatencyMs: import.meta.env.VITE_LOOPAD_FIXTURE_LATENCY_MS ?? 450
});
