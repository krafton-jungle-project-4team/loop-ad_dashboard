import { randomUUID } from "node:crypto";
import { Injectable } from "@nestjs/common";
import { log } from "../../../infra/logger/index.js";
import type { OpenPixelTokenPayload } from "./open-pixel-token.js";

const EVENT_COLLECTOR_URL = "https://event.api.dev.loop-ad.org";
const EVENT_WRITE_KEY = "public_write_key";
const SCHEMA_VERSION = "hotel_rec_promo.v1";
const SOURCE = "browser_sdk";

export interface EventCollectorPayload {
  project_id: string;
  write_key: string;
  schema_version: typeof SCHEMA_VERSION;
  event_id: string;
  event_name: string;
  event_time: string;
  source: typeof SOURCE;
  user_id: string;
  session_id: string;
  properties_json: string;
}

export abstract class OpenPixelEventPublisher {
  abstract publishOpenEvent(openPixel: OpenPixelTokenPayload): Promise<void>;
}

@Injectable()
export class FetchOpenPixelEventPublisher extends OpenPixelEventPublisher {
  override async publishOpenEvent(openPixel: OpenPixelTokenPayload): Promise<void> {
    const payload = toEventCollectorPayload(openPixel);

    const response = await fetch(EVENT_COLLECTOR_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      signal: AbortSignal.timeout(1000),
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const body = await readResponseBody(response);
      throw new Error(
        `Event Collector rejected open pixel event with status ${response.status}: ${body}`
      );
    }

    log.info("open_pixel_event_collector_published", {
      eventId: payload.event_id,
      eventName: payload.event_name,
      projectId: payload.project_id,
      userId: payload.user_id
    });
  }
}

export function toEventCollectorPayload(
  openPixel: OpenPixelTokenPayload,
  eventTime = new Date()
): EventCollectorPayload {
  return {
    project_id: openPixel.attribution.project_id,
    write_key: EVENT_WRITE_KEY,
    schema_version: SCHEMA_VERSION,
    event_id: `evt_${randomUUID()}`,
    event_name: openPixel.event_name,
    event_time: eventTime.toISOString(),
    source: SOURCE,
    user_id: openPixel.recipient_user_id,
    session_id: openPixelSessionId(openPixel),
    properties_json: JSON.stringify({
      ...openPixel.attribution,
      open_pixel: "true"
    })
  };
}

function openPixelSessionId(openPixel: OpenPixelTokenPayload) {
  return [
    "open",
    openPixel.attribution.promotion_run_id,
    openPixel.recipient_user_id,
    openPixel.attribution.redirect_id ?? openPixel.attribution.content_id
  ].join(":");
}

async function readResponseBody(response: Response) {
  try {
    return await response.text();
  } catch {
    return "";
  }
}
