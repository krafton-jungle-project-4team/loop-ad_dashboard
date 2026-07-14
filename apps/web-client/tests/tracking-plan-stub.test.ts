import assert from "node:assert/strict";
import test from "node:test";
import { getTrackingPlan } from "../src/features/dashboard/api/tracking-plan-stub.js";

const DEMO_EVENT_NAMES = [
  "page_view",
  "hotel_search",
  "hotel_detail_view",
  "hotel_click",
  "booking_start",
  "booking_complete",
  "booking_cancel",
  "promotion_impression",
  "promotion_click",
  "campaign_redirect_click",
  "campaign_landing"
];

test("tracking plan stub mirrors the demo storefront event names", async () => {
  const plan = await getTrackingPlan("demo_project");

  assert.deepEqual(
    plan.events.map((event) => event.eventName),
    DEMO_EVENT_NAMES
  );
});

test("tracking plan stub exposes marketer-facing properties without developer ids", async () => {
  const plan = await getTrackingPlan("demo_project");
  const propertyNames = plan.events.flatMap((event) =>
    Object.keys(event.propertiesSchema.properties ?? {})
  );

  assert.equal(
    propertyNames.some((name) => name === "id" || name.endsWith("_id")),
    false
  );
  assert.equal(propertyNames.includes("customer_name"), true);
  assert.equal(propertyNames.includes("gender"), true);
  assert.equal(propertyNames.includes("age_group"), true);
  assert.equal(propertyNames.includes("user_segment"), true);
});
