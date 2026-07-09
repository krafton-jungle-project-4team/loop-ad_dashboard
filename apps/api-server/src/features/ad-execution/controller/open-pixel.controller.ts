import { Controller, Get, Inject, Param, Res } from "@nestjs/common";
import { z } from "zod";
import { LogContextScope, durationMs, log } from "../../../infra/logger/index.js";
import { OpenPixelEventPublisher } from "../adapters/event-collector.js";
import { decodeOpenPixelToken } from "../adapters/open-pixel-token.js";

type ImageResponse = {
  setHeader: (name: string, value: string) => ImageResponse;
  status: (statusCode: number) => ImageResponse;
  send: (body: Buffer) => void;
};

const OpenPixelParamsSchema = z.object({
  openPixelId: z.string().min(1)
});

const TRANSPARENT_GIF = Buffer.from(
  "R0lGODlhAQABAPAAAP///wAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==",
  "base64"
);

@Controller("p")
export class OpenPixelController {
  constructor(
    @Inject(OpenPixelEventPublisher)
    private readonly eventPublisher: OpenPixelEventPublisher
  ) {}

  @Get("open/:openPixelId")
  @LogContextScope()
  async openPixel(@Param() params: unknown, @Res() response: ImageResponse) {
    const startedAt = Date.now();
    const parsedParams = OpenPixelParamsSchema.parse(params);
    const openPixel = decodeOpenPixelToken(parsedParams.openPixelId);
    log.info("started", { tokenValid: Boolean(openPixel) });

    if (openPixel) {
      log.assignContext({
        projectId: openPixel.attribution.project_id,
        promotionRunId: openPixel.attribution.promotion_run_id,
        userId: openPixel.recipient_user_id
      });
      await this.publishOpenEvent(openPixel);
    } else {
      log.warn("open_pixel_token_invalid");
    }

    response
      .status(200)
      .setHeader("Content-Type", "image/gif")
      .setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
      .setHeader("Pragma", "no-cache")
      .send(TRANSPARENT_GIF);
    log.info("completed", { durationMs: durationMs(startedAt) });
  }

  private async publishOpenEvent(openPixel: NonNullable<ReturnType<typeof decodeOpenPixelToken>>) {
    try {
      await this.eventPublisher.publishOpenEvent(openPixel);
    } catch (error) {
      log.warn("open_pixel_event_publish_failed", { err: error });
    }
  }
}
