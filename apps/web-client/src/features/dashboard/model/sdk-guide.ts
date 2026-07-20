import type { SdkPublishedSchema, TrackingPlanEvent, TrackingPlanJsonSchema } from "@loopad/shared";

export const EVENT_SDK_VERSION = "0.1.0";
export const EVENT_SDK_IIFE_URL = `https://krafton-jungle-project-4team.github.io/loop-ad_event_sdk/loop-ad-event-sdk.iife.js?v=${EVENT_SDK_VERSION}`;

export function eventSdkInstallCode(): string {
  return `<script
  src="${EVENT_SDK_IIFE_URL}"
  crossorigin="anonymous"
></script>`;
}

export function eventSdkInitCode(projectId: string, writeKey: string): string {
  return `// src/lib/loop-ad-events.js
let clientPromise = null;

export function startLoopAdCollection() {
  if (!window.LoopAdEventSDK) {
    return Promise.reject(new Error("LoopAd Event SDK IIFE를 먼저 연결하세요."));
  }
  if (!clientPromise) {
    clientPromise = Promise.resolve().then(() => window.LoopAdEventSDK.init({
      projectId: "${projectId}",
      writeKey: "${writeKey}",
      identity: null,
      debug: import.meta.env.DEV
    })).catch((error) => {
      clientPromise = null;
      throw error;
    });
  }
  return clientPromise;
}

export async function setLoopAdIdentity(identity) {
  const client = await startLoopAdCollection();
  client.setIdentity(identity);
  return client;
}

void startLoopAdCollection().catch(() => undefined);`;
}

export function eventSdkTrackCode(event: TrackingPlanEvent): string {
  const properties = Object.fromEntries(
    Object.entries(event.propertiesSchema.properties ?? {}).map(([name, schema]) => [
      name,
      exampleValue(name, schema)
    ])
  );
  const identity = `const client = await setLoopAdIdentity({\n  userId: user.id,\n  sessionId: session.id\n});`;
  if (Object.keys(properties).length === 0) {
    return `${identity}\nclient.track("${event.eventName}");`;
  }
  return `${identity}\nclient.track("${event.eventName}", ${JSON.stringify(properties, null, 2)});`;
}

export function describeEventSchemaVersion({
  draftEvents,
  hasPendingChanges,
  previousSchema,
  publishedSchema
}: {
  draftEvents: TrackingPlanEvent[];
  hasPendingChanges: boolean;
  previousSchema: SdkPublishedSchema | null;
  publishedSchema: SdkPublishedSchema | null;
}): string {
  if (hasPendingChanges) {
    const nextRevision = (publishedSchema?.revision ?? 0) + 1;
    const changes = describeEventChanges(publishedSchema?.events ?? [], draftEvents);
    const activeVersion = publishedSchema
      ? `확정 전 SDK 적용 버전은 v${publishedSchema.revision}입니다.`
      : "확정 전 SDK 적용 버전은 없습니다.";
    return `이벤트 스키마 v${nextRevision} 초안 · 이벤트 ${draftEvents.length}개. ${changes} ${activeVersion}`;
  }

  if (!publishedSchema) {
    return "확정된 이벤트 스키마가 없어 SDK에 적용되는 이벤트 계약이 없습니다.";
  }

  const changes = previousSchema
    ? describeEventChanges(previousSchema.events, publishedSchema.events)
    : "첫 확정 버전입니다.";
  return `현재 이벤트 스키마 v${publishedSchema.revision} · 이벤트 ${publishedSchema.events.length}개. ${changes}`;
}

export function getNewlyPublishedEventNames({
  previousSchema,
  publishedSchema
}: {
  previousSchema: SdkPublishedSchema | null;
  publishedSchema: SdkPublishedSchema | null;
}): ReadonlySet<string> {
  if (!previousSchema || !publishedSchema) return new Set();
  return new Set(addedEventNames(previousSchema.events, publishedSchema.events));
}

export function prioritizeNewlyPublishedEvents(
  events: readonly TrackingPlanEvent[],
  newEventNames: ReadonlySet<string>
): TrackingPlanEvent[] {
  const newEvents: TrackingPlanEvent[] = [];
  const existingEvents: TrackingPlanEvent[] = [];

  for (const event of events) {
    if (newEventNames.has(event.eventName)) {
      newEvents.push(event);
    } else {
      existingEvents.push(event);
    }
  }

  return [...newEvents, ...existingEvents];
}

function describeEventChanges(
  previousEvents: TrackingPlanEvent[],
  nextEvents: TrackingPlanEvent[]
): string {
  const { added, changed, removed } = compareEventVersions(previousEvents, nextEvents);
  const parts = [
    formatEventNames("추가", added),
    formatEventNames("수정", changed),
    formatEventNames("삭제", removed)
  ].filter((part): part is string => part !== null);
  return parts.length > 0 ? `${parts.join(" · ")}.` : "이전 확정본과 이벤트 계약이 같습니다.";
}

function compareEventVersions(
  previousEvents: TrackingPlanEvent[],
  nextEvents: TrackingPlanEvent[]
) {
  const previousByName = new Map(previousEvents.map((event) => [event.eventName, event]));
  const nextByName = new Map(nextEvents.map((event) => [event.eventName, event]));
  const added = addedEventNames(previousEvents, nextEvents);
  const removed = previousEvents
    .filter((event) => !nextByName.has(event.eventName))
    .map((event) => event.eventName);
  const changed = nextEvents
    .filter((event) => {
      const previous = previousByName.get(event.eventName);
      return previous !== undefined && JSON.stringify(previous) !== JSON.stringify(event);
    })
    .map((event) => event.eventName);
  return { added, changed, removed };
}

function addedEventNames(
  previousEvents: TrackingPlanEvent[],
  nextEvents: TrackingPlanEvent[]
): string[] {
  const previousNames = new Set(previousEvents.map((event) => event.eventName));
  const addedNames: string[] = [];

  for (const event of nextEvents) {
    if (!previousNames.has(event.eventName)) {
      addedNames.push(event.eventName);
    }
  }

  return addedNames;
}

function formatEventNames(label: string, eventNames: string[]): string | null {
  if (eventNames.length === 0) return null;
  const visibleNames = eventNames.slice(0, 3).join(", ");
  const remainingCount = eventNames.length - 3;
  return `${label}: ${visibleNames}${remainingCount > 0 ? ` 외 ${remainingCount}개` : ""}`;
}

function exampleValue(name: string, schema: TrackingPlanJsonSchema): unknown {
  switch (schema.type) {
    case "string":
      return `${name}_value`;
    case "number":
      return 1.5;
    case "integer":
      return 1;
    case "boolean":
      return true;
    case "array":
      return [schema.items ? exampleValue(`${name}_item`, schema.items) : "value"];
    case "object":
      return Object.fromEntries(
        Object.entries(schema.properties ?? {}).map(([childName, childSchema]) => [
          childName,
          exampleValue(childName, childSchema)
        ])
      );
  }
}
