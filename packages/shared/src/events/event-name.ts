import { z } from "zod";

export const EventNameSchema = z.enum([
  "impression",
  "click",
  "page_view",
  "product_view",
  "add_to_cart",
  "checkout_start",
  "purchase",
  "ad_click",
  "message_click",
  "coupon_issued",
  "coupon_used",
  "product_impression",
  "search",
  "leave_page"
]);
export type EventName = z.infer<typeof EventNameSchema>;
