import { Inject, Injectable } from "@nestjs/common";
import { adExecutionErrors } from "../ad-execution-errors.js";
import {
  AdExecutionDomain,
  type AdExecutionChannel,
  type RedirectLinkEntity,
  type RedirectPageSnapshot
} from "../domain/index.js";
import { AdExecutionReader } from "../repository/index.js";

const LOOPAD_EVENT_SDK_URL =
  "https://krafton-jungle-project-4team.github.io/loop-ad_event_sdk/loop-ad-event-sdk.iife.js";
const LOOPAD_EVENT_WRITE_KEY = "public_write_key";
const LOOPAD_EVENT_SDK = Object.freeze({
  url: LOOPAD_EVENT_SDK_URL,
  writeKey: LOOPAD_EVENT_WRITE_KEY
});

/** redirect token을 SDK handoff 페이지 데이터로 복원합니다. */
@Injectable()
export class RedirectService {
  constructor(
    @Inject(AdExecutionReader)
    private readonly reader: AdExecutionReader
  ) {}

  /** redirect_id로 클릭 이벤트 payload와 이동 대상 URL을 구성합니다. */
  async resolveRedirectPage(redirectId: string): Promise<RedirectPageSnapshot> {
    const link = await this.requireRedirectLink(redirectId);
    const promotionChannel = await this.requireRedirectChannel(link.adExperimentId);

    return AdExecutionDomain.toRedirectPage(link, promotionChannel, LOOPAD_EVENT_SDK);
  }

  private async requireRedirectLink(redirectId: string): Promise<RedirectLinkEntity> {
    const link = await this.reader.findRedirectLink(redirectId);

    if (!link) {
      throw adExecutionErrors.redirectNotFound(redirectId);
    }

    if (link.expiresAt && link.expiresAt <= new Date()) {
      throw adExecutionErrors.redirectExpired(redirectId);
    }

    if (!isHttpUrl(link.destinationUrl)) {
      throw adExecutionErrors.redirectTargetUrlInvalid(redirectId);
    }

    return link;
  }

  private async requireRedirectChannel(adExperimentId: string | null): Promise<AdExecutionChannel> {
    if (!adExperimentId) {
      throw adExecutionErrors.inconsistentAssignment(
        "redirect link is missing ad_experiment_id."
      );
    }

    const adExperiment = await this.reader.findAdExperiment(adExperimentId);

    if (!adExperiment) {
      throw adExecutionErrors.inconsistentAssignment(
        `redirect link references missing ad_experiment_id '${adExperimentId}'.`
      );
    }

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
