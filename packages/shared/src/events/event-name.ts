import { z } from "zod";

export const EventNameSchema = z.enum([
  "page_view",
  "product_view",
  "add_to_cart",
  "purchase",
  "ad_impression",
  "ad_click"
]);
export type EventName = z.infer<typeof EventNameSchema>;
