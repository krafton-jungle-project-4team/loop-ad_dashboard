import type { TrackingPlanEvent, TrackingPlanJsonSchema } from "@loopad/shared";

export const EVENT_SDK_PACKAGE_VERSION = "0.1.20260713-run.16.1";

export function eventSdkInstallCode(): string {
  return `# .npmrc
@krafton-jungle-project-4team:registry=https://npm.pkg.github.com

npm install @krafton-jungle-project-4team/loop-ad_event_sdk@${EVENT_SDK_PACKAGE_VERSION}`;
}

export function eventSdkInitCode(connectionUrl: string): string {
  return `// src/lib/loop-ad-events.ts
import {
  init,
  type Identity,
  type LoopAdEventSdkClient
} from "@krafton-jungle-project-4team/loop-ad_event_sdk";

let clientPromise: Promise<LoopAdEventSdkClient> | null = null;

export function startLoopAdCollection() {
  if (!clientPromise) {
    clientPromise = init({
      connectionUrl: "${connectionUrl}",
      identity: null,
      debug: import.meta.env.DEV
    }).catch((error) => {
      clientPromise = null;
      throw error;
    });
  }
  return clientPromise;
}

export async function setLoopAdIdentity(identity: Identity) {
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
