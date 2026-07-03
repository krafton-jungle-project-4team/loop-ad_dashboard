import { randomUUID } from "node:crypto";
import { Injectable } from "@nestjs/common";
import { env } from "../../../infra/env/env.js";
import { adExecutionErrors } from "../ad-execution-errors.js";
import { AdExecutionDomain, type RedirectLinkSnapshot } from "../domain/index.js";

export abstract class PromotionEventCollector {
  abstract trackRedirectClick(link: RedirectLinkSnapshot): Promise<void>;
}

@Injectable()
export class HttpPromotionEventCollector extends PromotionEventCollector {
  async trackRedirectClick(link: RedirectLinkSnapshot): Promise<void> {
    if (!env.eventCollector.url) {
      throw adExecutionErrors.eventCollectorNotConfigured();
    }

    const response = await fetch(resolveEventsEndpoint(env.eventCollector.url), {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(toRedirectClickPayload(link))
    });

    if (!response.ok) {
      throw adExecutionErrors.eventCollectorRejected(response.status);
    }
  }
}

function toRedirectClickPayload(link: RedirectLinkSnapshot) {
  const properties = {
    ...AdExecutionDomain.toRedirectClickProperties(link),
    target_url: link.targetUrl
  };

  return {
    project_id: link.projectId,
    schema_version: "hotel_rec_promo.v1",
    event_id: randomUUID(),
    event_name: "campaign_redirect_click",
    event_time: new Date().toISOString(),
    source: "dashboard_redirect",
    user_id: link.userId,
    session_id: `redirect:${link.redirectId}`,
    properties_json: JSON.stringify(properties)
  };
}

function resolveEventsEndpoint(baseUrl: string) {
  const url = new URL(baseUrl);

  if (url.pathname === "" || url.pathname === "/") {
    url.pathname = "/events";
  }

  return url.toString();
}
