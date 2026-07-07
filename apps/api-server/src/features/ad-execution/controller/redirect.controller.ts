import { Controller, Get, Inject, Param, Res } from "@nestjs/common";
import { z } from "zod";
import { renderRedirectPage } from "../adapters/redirect-page-renderer.js";
import { RedirectService } from "../service/index.js";
import { LogContextScope, dms, log } from "../../../infra/logger/index.js";

type HtmlResponse = {
  type: (contentType: string) => HtmlResponse;
  send: (body: string) => void;
};

const RedirectParamsSchema = z.object({
  redirectId: z.string().min(1)
});

/** redirect 토큰을 SDK handoff HTML로 응답하는 컨트롤러입니다. */
@Controller("r")
export class RedirectController {
  constructor(
    @Inject(RedirectService)
    private readonly redirectService: RedirectService
  ) {}

  /** redirect 클릭 이벤트 전송용 HTML 페이지를 반환합니다. */
  @Get(":redirectId")
  @LogContextScope()
  async redirect(@Param() params: unknown, @Res() response: HtmlResponse) {
    const startedAt = Date.now();
    const parsedParams = RedirectParamsSchema.parse(params);
    log.assignContext({ redirectId: parsedParams.redirectId });
    log.info("started", { redirectId: parsedParams.redirectId });
    const page = await this.redirectService.resolveRedirectPage(parsedParams.redirectId);

    response.type("html").send(renderRedirectPage(page));
    log.info("completed", { durationMs: dms(startedAt), page });
  }
}
