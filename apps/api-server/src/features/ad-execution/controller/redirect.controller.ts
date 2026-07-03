import { Controller, Get, Inject, Param, Res } from "@nestjs/common";
import { z } from "zod";
import { AdExecutionService } from "../service/index.js";

type RedirectResponse = {
  redirect: (statusCode: number, url: string) => void;
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
  async redirect(@Param() params: unknown, @Res() response: RedirectResponse) {
    const parsedParams = RedirectParamsSchema.parse(params);
    const targetUrl = await this.adExecutionService.handleRedirect(parsedParams.redirectId);

    response.redirect(302, targetUrl);
  }
}
