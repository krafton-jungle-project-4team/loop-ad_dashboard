import { z } from "zod";

export const DashboardAuthUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.literal("admin")
});
export type DashboardAuthUser = z.infer<typeof DashboardAuthUserSchema>;

export const DashboardLoginRequestSchema = z.object({
  id: z.string().trim().min(1),
  password: z.string().min(1)
});
export type DashboardLoginRequest = z.infer<typeof DashboardLoginRequestSchema>;

export const DashboardAuthSessionSchema = z.object({
  user: DashboardAuthUserSchema
});
export type DashboardAuthSession = z.infer<typeof DashboardAuthSessionSchema>;

export const DashboardLogoutResultSchema = z.object({
  ok: z.literal(true)
});
export type DashboardLogoutResult = z.infer<typeof DashboardLogoutResultSchema>;
