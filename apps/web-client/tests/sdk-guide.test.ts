import assert from "node:assert/strict";
import test from "node:test";
import { SDK_TRACKING_PLAN_SCHEMA_VERSION, type TrackingPlanEvent } from "@loopad/shared";
import {
  EVENT_SDK_IIFE_URL,
  EVENT_SDK_VERSION,
  describeEventSchemaVersion,
  eventSdkInitCode,
  eventSdkInstallCode,
  eventSdkTrackCode,
  getNewlyPublishedEventNames,
  prioritizeNewlyPublishedEvents
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

test("event schema descriptions are generated from each self-contained version snapshot", () => {
  const previousEvent = trackingPlanEvent("booking_start", "before");
  const changedEvent = trackingPlanEvent("booking_complete", "after");
  const previousSchema = {
    schemaVersion: SDK_TRACKING_PLAN_SCHEMA_VERSION,
    revision: 1,
    events: [previousEvent, trackingPlanEvent("booking_complete", "before")]
  };
  const publishedSchema = {
    schemaVersion: SDK_TRACKING_PLAN_SCHEMA_VERSION,
    revision: 2,
    events: [changedEvent, trackingPlanEvent("booking_cancel", "new")]
  };

  const publishedDescription = describeEventSchemaVersion({
    draftEvents: publishedSchema.events,
    hasPendingChanges: false,
    previousSchema,
    publishedSchema
  });
  assert.match(publishedDescription, /현재 이벤트 스키마 v2/);
  assert.match(publishedDescription, /이벤트 2개/);
  assert.match(publishedDescription, /추가: booking_cancel/);
  assert.match(publishedDescription, /수정: booking_complete/);
  assert.match(publishedDescription, /삭제: booking_start/);

  const draftDescription = describeEventSchemaVersion({
    draftEvents: [...publishedSchema.events, trackingPlanEvent("hotel_view", "new")],
    hasPendingChanges: true,
    previousSchema,
    publishedSchema
  });
  assert.match(draftDescription, /이벤트 스키마 v3 초안/);
  assert.match(draftDescription, /추가: hotel_view/);
  assert.match(draftDescription, /확정 전 SDK 적용 버전은 v2/);
});

test("only events absent from the previous published version are marked as new", () => {
  const previousSchema = {
    schemaVersion: SDK_TRACKING_PLAN_SCHEMA_VERSION,
    revision: 1,
    events: [
      trackingPlanEvent("booking_start", "before"),
      trackingPlanEvent("booking_complete", "before")
    ]
  };
  const publishedSchema = {
    schemaVersion: SDK_TRACKING_PLAN_SCHEMA_VERSION,
    revision: 2,
    events: [
      trackingPlanEvent("booking_complete", "after"),
      trackingPlanEvent("booking_cancel", "new")
    ]
  };

  assert.deepEqual(
    [...getNewlyPublishedEventNames({ previousSchema, publishedSchema })],
    ["booking_cancel"]
  );
  assert.deepEqual([...getNewlyPublishedEventNames({ previousSchema: null, publishedSchema })], []);
});

test("newly published events appear first without changing either group's order", () => {
  const events = [
    trackingPlanEvent("existing_first", "existing"),
    trackingPlanEvent("new_first", "new"),
    trackingPlanEvent("existing_second", "existing"),
    trackingPlanEvent("new_second", "new")
  ];

  assert.deepEqual(
    prioritizeNewlyPublishedEvents(events, new Set(["new_first", "new_second"])).map(
      (event) => event.eventName
    ),
    ["new_first", "new_second", "existing_first", "existing_second"]
  );
  assert.deepEqual(
    prioritizeNewlyPublishedEvents(events, new Set()).map((event) => event.eventName),
    events.map((event) => event.eventName)
  );
});

function trackingPlanEvent(eventName: string, description: string): TrackingPlanEvent {
  return {
    eventName,
    description,
    propertiesSchema: { type: "object", properties: {}, required: [] }
  };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
