import { z } from "zod";

export function createApiSuccessResponseSchema<TData>(dataSchema: z.ZodType<TData>) {
  return z.object({
    requestId: z.string(),
    data: dataSchema
  });
}
