import { z } from "zod";

export const MetricValueSchema = z.object({
  label: z.string(),
  value: z.string(),
  description: z.string().optional(),
  delta: z.string().optional()
});
export type MetricValue = z.infer<typeof MetricValueSchema>;

export const NamedPerformanceSchema = z.object({
  name: z.string(),
  value: z.number(),
  displayValue: z.string()
});
export type NamedPerformance = z.infer<typeof NamedPerformanceSchema>;

export const TimeSeriesPointSchema = z.object({
  label: z.string(),
  value: z.number(),
  displayValue: z.string().optional()
});
export type TimeSeriesPoint = z.infer<typeof TimeSeriesPointSchema>;
