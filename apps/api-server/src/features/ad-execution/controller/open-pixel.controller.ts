import { Controller, Get, Param, Res } from "@nestjs/common";
import { z } from "zod";
import { LogContextScope, durationMs, log } from "../../../infra/logger/index.js";

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
  @Get("open/:openPixelId")
  @LogContextScope()
  async openPixel(@Param() params: unknown, @Res() response: ImageResponse) {
    const startedAt = Date.now();
    const parsedParams = OpenPixelParamsSchema.parse(params);
    log.assignContext({ openPixelId: parsedParams.openPixelId });
    log.info("started", {
      openPixelId: parsedParams.openPixelId,
      snapshot: decodeOpenPixelId(parsedParams.openPixelId)
    });

    response
      .status(200)
      .setHeader("Content-Type", "image/gif")
      .setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
      .setHeader("Pragma", "no-cache")
      .send(TRANSPARENT_GIF);
    log.info("completed", { durationMs: durationMs(startedAt) });
  }
}

function decodeOpenPixelId(openPixelId: string) {
  try {
    return JSON.parse(Buffer.from(openPixelId, "base64url").toString("utf8")) as unknown;
  } catch {
    return null;
  }
}
