import { z } from "zod";
import {
  CreativeReportSchema,
  InsightReportSchema,
  RecommendationReportSchema
} from "./reports.js";

export const AiJobKindSchema = z.enum(["insight", "recommendation", "creative"]);
export type AiJobKind = z.infer<typeof AiJobKindSchema>;

export const AiJobStatusSchema = z.enum(["pending", "running", "completed", "failed"]);
export type AiJobStatus = z.infer<typeof AiJobStatusSchema>;

export const AiJobRequestSchema = z.object({
  kind: AiJobKindSchema,
  projectId: z.string().optional()
});
export type AiJobRequest = z.infer<typeof AiJobRequestSchema>;

export const AiJobAcceptedSchema = z.object({
  resultId: z.string(),
  status: AiJobStatusSchema
});
export type AiJobAccepted = z.infer<typeof AiJobAcceptedSchema>;

export const AiJobResultPayloadSchema = z.union([
  InsightReportSchema,
  RecommendationReportSchema,
  CreativeReportSchema
]);
export type AiJobResultPayload = z.infer<typeof AiJobResultPayloadSchema>;

export const AiJobResultSchema = z.object({
  resultId: z.string(),
  kind: AiJobKindSchema,
  status: AiJobStatusSchema,
  result: AiJobResultPayloadSchema.optional(),
  errorMessage: z.string().optional(),
  createdAt: z.string(),
  completedAt: z.string().optional()
});
export type AiJobResult = z.infer<typeof AiJobResultSchema>;
