import assert from "node:assert/strict";
import test from "node:test";
import type { TrackingPlanEvent } from "@loopad/shared";
import {
  EVENT_SDK_PACKAGE_VERSION,
  eventSdkInitCode,
  eventSdkInstallCode,
  eventSdkTrackCode
} from "../src/features/dashboard/model/sdk-guide.js";

test("SDK guide pins the merged DevTools package and initializes before login", () => {
  assert.match(eventSdkInstallCode(), new RegExp(`@${escapeRegExp(EVENT_SDK_PACKAGE_VERSION)}$`));

  const code = eventSdkInitCode("https://dashboard.example/sdk/connections/key");
  assert.match(code, /identity: null/);
  assert.match(code, /debug: import\.meta\.env\.DEV/);
  assert.match(code, /client\.setIdentity\(identity\)/);
  assert.match(code, /clientPromise = null/);
  assert.match(code, /void startLoopAdCollection\(\)\.catch/);
});

test("SDK guide passes event properties directly to track", () => {
  const event: TrackingPlanEvent = {
    eventName: "booking_complete",
    description: "booking completed",
    status: "draft",
    propertiesSchema: {
      type: "object",
      properties: {
        booking_id: { type: "string" },
        price: { type: "number" }
      },
      required: ["booking_id"]
    }
  };

  const code = eventSdkTrackCode(event);
  assert.match(code, /client\.track\("booking_complete", \{/);
  assert.match(code, /"booking_id": "booking_id_value"/);
  assert.doesNotMatch(code, /properties\s*:/);
});

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
