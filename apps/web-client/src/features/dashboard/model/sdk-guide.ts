import type { TrackingPlanEvent, TrackingPlanJsonSchema } from "@loopad/shared";

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
