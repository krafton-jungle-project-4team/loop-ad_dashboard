import { z } from "zod";

export const requestIdSchema = z.string().min(1);

export const apiErrorSchema = z.object({
  statusCode: z.number().int().positive(),
  code: z.string().min(1),
  message: z.string().min(1)
});

export const createApiSuccessSchema = <TData extends z.ZodType>(dataSchema: TData) =>
  z.object({
    requestId: requestIdSchema,
    data: dataSchema
  });

export function createApiSuccessResponseSchema<TData>(dataSchema: z.ZodType<TData>) {
  return createApiSuccessSchema(dataSchema);
}

export const apiFailureResponseSchema = z.object({
  requestId: requestIdSchema,
  error: apiErrorSchema
});

export type ApiError = z.infer<typeof apiErrorSchema>;

export type ApiSuccess<TData> = {
  requestId: string;
  data: TData;
};

export type ApiFailure = z.infer<typeof apiFailureResponseSchema>;

export type ApiEnvelope<TData> = ApiSuccess<TData> | ApiFailure;
