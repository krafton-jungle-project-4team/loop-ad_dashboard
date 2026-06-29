import { z } from "zod";
import type { DashboardQuery } from "./dashboard-types.js";

const DashboardQuerySchema = z.object({
  experimentId: z.string().trim().min(1),
  projectId: z.string().trim().min(1),
  recommendationResultId: z.string().trim().min(1).optional()
});

export function parseDashboardQuery(search: string): DashboardQuery | null {
  const params = new URLSearchParams(search);
  const parsed = DashboardQuerySchema.safeParse({
    experimentId: params.get("experimentId"),
    projectId: params.get("projectId"),
    recommendationResultId: params.get("recommendationResultId") ?? undefined
  });

  return parsed.success ? parsed.data : null;
}
