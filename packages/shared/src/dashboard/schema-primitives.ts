import { z } from "zod";

export const RateSchema = z.number().min(0).max(1);
export const CountSchema = z.number().int().nonnegative();
export const JsonObjectSchema = z.record(z.string(), z.unknown());
