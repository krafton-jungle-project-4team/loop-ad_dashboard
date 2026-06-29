import { z } from "zod";
import type { DashboardQuery } from "./dashboard-types.js";

const DashboardQuerySchema = z.object({
  projectId: z.string().trim().min(1)
});

export function parseDashboardQuery(search: string): DashboardQuery | null {
  const params = new URLSearchParams(search);
  const parsed = DashboardQuerySchema.safeParse({
    projectId: params.get("projectId")
  });

  return parsed.success ? parsed.data : null;
}
