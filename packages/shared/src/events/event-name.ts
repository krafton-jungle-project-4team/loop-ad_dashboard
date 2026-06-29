import { z } from "zod";

export const EventNameSchema = z.enum([
  "page_view",
  "product_view",
  "add_to_cart",
  "checkout_start",
  "purchase",
  "coupon_shown",
  "action_exposed",
  "ad_impression",
  "ad_click",
  "coupon_click"
]);
export type EventName = z.infer<typeof EventNameSchema>;
