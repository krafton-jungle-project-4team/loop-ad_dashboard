import { z } from "zod";

export const CustomerSegmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  channel: z.string(),
  ageGroup: z.string(),
  gender: z.string(),
  category: z.string(),
  region: z.string(),
  device: z.string(),
  conversionRate: z.string(),
  majorDropOffStep: z.string()
});
export type CustomerSegment = z.infer<typeof CustomerSegmentSchema>;
