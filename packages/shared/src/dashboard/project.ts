import { z } from "zod";

export const DashboardProjectStatusSchema = z.enum(["active", "inactive", "archived"]);
export type DashboardProjectStatus = z.infer<typeof DashboardProjectStatusSchema>;

export const DashboardProjectSchema = z.object({
  project_id: z.string(),
  project_name: z.string(),
  domain: z.string(),
  write_key: z.string(),
  status: DashboardProjectStatusSchema,
  created_at: z.string(),
  updated_at: z.string()
});
export type DashboardProject = z.infer<typeof DashboardProjectSchema>;

export const DashboardProjectListSchema = z.object({
  projects: z.array(DashboardProjectSchema)
});
export type DashboardProjectList = z.infer<typeof DashboardProjectListSchema>;

export const DashboardCreateProjectRequestSchema = z.object({
  project_name: z.string().trim().min(1),
  domain: z.string().trim().min(1).default("hotel-booking.local"),
  status: DashboardProjectStatusSchema.default("active")
});
export type DashboardCreateProjectRequest = z.infer<typeof DashboardCreateProjectRequestSchema>;

export const DashboardUpdateProjectRequestSchema = z
  .object({
    project_name: z.string().trim().min(1).max(255)
  })
  .strict();
export type DashboardUpdateProjectRequest = z.infer<typeof DashboardUpdateProjectRequestSchema>;

export const DashboardDeleteProjectResultSchema = z.object({
  project_id: z.string(),
  status: z.literal("archived")
});
export type DashboardDeleteProjectResult = z.infer<typeof DashboardDeleteProjectResultSchema>;
