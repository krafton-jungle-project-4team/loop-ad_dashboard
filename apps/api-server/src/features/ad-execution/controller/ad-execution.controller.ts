import { Controller, Get, Inject, Param, Post, Query } from "@nestjs/common";
import {
  BannerResolveQuerySchema,
  BannerResolveResponseSchema,
  PromotionRunDispatchParamsSchema,
  PromotionRunDispatchResponseSchema
} from "@loopad/shared";
import { AdExecutionService } from "../service/index.js";

@Controller("ad/v1")
export class AdExecutionController {
  constructor(
    @Inject(AdExecutionService)
    private readonly adExecutionService: AdExecutionService
  ) {}

  @Post("promotion-runs/:promotion_run_id/dispatch")
  async dispatchPromotionRun(@Param() params: unknown) {
    const parsedParams = PromotionRunDispatchParamsSchema.parse(params);

    return PromotionRunDispatchResponseSchema.parse(
      await this.adExecutionService.dispatchPromotionRun(parsedParams.promotion_run_id)
    );
  }

  @Get("banner/resolve")
  async resolveBanner(@Query() query: unknown) {
    const request = BannerResolveQuerySchema.parse(query);

    return BannerResolveResponseSchema.parse(await this.adExecutionService.resolveBanner(request));
  }
}
