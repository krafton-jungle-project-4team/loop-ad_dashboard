import assert from "node:assert/strict";
import test from "node:test";
import type { TrackingPlanEvent } from "@loopad/shared";
import {
  EVENT_SDK_IIFE_URL,
  EVENT_SDK_VERSION,
  eventSdkInitCode,
  eventSdkInstallCode,
  eventSdkTrackCode
} from "../src/features/dashboard/model/sdk-guide.js";

test("SDK guide loads the public IIFE and initializes before login", () => {
  const installCode = eventSdkInstallCode();
  assert.match(installCode, new RegExp(`src="${escapeRegExp(EVENT_SDK_IIFE_URL)}"`));
  assert.match(installCode, /crossorigin="anonymous"/);
  assert.match(installCode, new RegExp(`\\?v=${escapeRegExp(EVENT_SDK_VERSION)}`));
  assert.doesNotMatch(installCode, /npm|npmrc|github\.com\/packages/i);

  const code = eventSdkInitCode("demo-project", "public-write-key");
  assert.match(code, /window\.LoopAdEventSDK\.init/);
  assert.match(code, /projectId: "demo-project"/);
  assert.match(code, /writeKey: "public-write-key"/);
  assert.doesNotMatch(code, /connectionUrl/);
  assert.doesNotMatch(code, /@krafton-jungle-project-4team\/loop-ad_event_sdk/);
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
