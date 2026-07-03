import { Controller, Get, Inject, Param, Res } from "@nestjs/common";
import { z } from "zod";
import { renderRedirectPage } from "../adapters/redirect-page-renderer.js";
import { AdExecutionService } from "../service/index.js";

type HtmlResponse = {
  type: (contentType: string) => HtmlResponse;
  send: (body: string) => void;
};

const RedirectParamsSchema = z.object({
  redirectId: z.string().min(1)
});

@Controller("r")
export class RedirectController {
  constructor(
    @Inject(AdExecutionService)
    private readonly adExecutionService: AdExecutionService
  ) {}

  @Get(":redirectId")
  async redirect(@Param() params: unknown, @Res() response: HtmlResponse) {
    const parsedParams = RedirectParamsSchema.parse(params);
    const page = await this.adExecutionService.resolveRedirectPage(parsedParams.redirectId);

    response.type("html").send(renderRedirectPage(page));
  }
}
