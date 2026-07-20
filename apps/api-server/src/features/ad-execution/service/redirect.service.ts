import { Inject, Injectable } from "@nestjs/common";
import { LogContextScope, durationMs, log } from "../../../infra/logger/index.js";
import { adExecutionErrors } from "../ad-execution-errors.js";
import {
  AdExecutionDomain,
  type AdExecutionChannel,
  type RedirectLinkEntity,
  type RedirectPageSnapshot
} from "../domain/index.js";
import { AdExecutionReader } from "../repository/index.js";
import { requireValidPromotionLandingUrl } from "./landing-url.guard.js";

const LOOPAD_EVENT_SDK_URL =
  "https://krafton-jungle-project-4team.github.io/loop-ad_event_sdk/loop-ad-event-sdk.iife.js";
const LOOPAD_EVENT_CONNECTION_BASE_URL =
  "https://dashboard.api.dev.loop-ad.org/api/public/v1/sdk/connections";

/** redirect token을 SDK handoff 페이지 데이터로 복원합니다. */
@Injectable()
export class RedirectService {
  constructor(
    @Inject(AdExecutionReader)
    private readonly reader: AdExecutionReader
  ) {}

  /** redirect_id로 클릭 이벤트 payload와 이동 대상 URL을 구성합니다. */
  @LogContextScope()
  async resolveRedirectPage(redirectId: string): Promise<RedirectPageSnapshot> {
    const startedAt = Date.now();
    log.assignContext({ redirectId });
    log.info("started");

    const link = await this.requireRedirectLink(redirectId);
    log.assignContext({
      adExperimentId: link.adExperimentId,
      campaignId: link.campaignId,
      contentId: link.contentId,
      contentOptionId: link.contentOptionId,
      projectId: link.projectId,
      promotionId: link.promotionId,
      promotionRunId: link.promotionRunId,
      segmentId: link.segmentId,
      userId: link.userId
    });
    const promotionChannel = await this.requireRedirectChannel(link.adExperimentId);
    log.assignContext({ channel: promotionChannel });
    const page = AdExecutionDomain.toRedirectPage(link, promotionChannel, {
      url: LOOPAD_EVENT_SDK_URL,
      connectionUrl: `${LOOPAD_EVENT_CONNECTION_BASE_URL}/${encodeURIComponent(link.sdkKey)}`
    });

    log.info("completed", {
      durationMs: durationMs(startedAt),
      response: { eventName: page.event.name },
      promotionChannel
    });

    return page;
  }

  private async requireRedirectLink(redirectId: string): Promise<RedirectLinkEntity> {
    const link = await this.reader.findRedirectLink(redirectId);

    if (!link) {
      log.warn("redirect_not_found");
      throw adExecutionErrors.redirectNotFound(redirectId);
    }

    if (link.expiresAt && link.expiresAt <= new Date()) {
      log.warn("redirect_expired", { expiresAt: link.expiresAt });
      throw adExecutionErrors.redirectExpired(redirectId);
    }

    if (!isHttpUrl(link.destinationUrl)) {
      log.warn("redirect_invalid_target_url", { promotionRunId: link.promotionRunId });
      throw adExecutionErrors.redirectTargetUrlInvalid(redirectId);
    }

    const resolvedLink = {
      ...link,
      destinationUrl: requireValidPromotionLandingUrl(link.promotionRunId, link.destinationUrl)
    };

    log.info("redirect_link_loaded", {
      expiresAt: resolvedLink.expiresAt,
      status: resolvedLink.status
    });

    return resolvedLink;
  }

  private async requireRedirectChannel(adExperimentId: string | null): Promise<AdExecutionChannel> {
    if (!adExperimentId) {
      log.warn("redirect_missing_ad_experiment_id", { adExperimentId });
      throw adExecutionErrors.inconsistentAssignment("redirect link is missing ad_experiment_id.");
    }

    const adExperiment = await this.reader.findAdExperiment(adExperimentId);

    if (!adExperiment) {
      log.warn("redirect_ad_experiment_not_found", { adExperimentId });
      throw adExecutionErrors.inconsistentAssignment(
        `redirect link references missing ad_experiment_id '${adExperimentId}'.`
      );
    }

    log.info("redirect_channel_loaded", {
      channel: adExperiment.channel,
      status: adExperiment.status
    });

    return adExperiment.channel;
  }
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
