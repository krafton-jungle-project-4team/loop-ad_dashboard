import { Controller, Get, Inject, Param, Post, Query } from "@nestjs/common";
import {
  BannerResolveQuerySchema,
  BannerResolveResponseSchema,
  PromotionRunDispatchParamsSchema,
  PromotionRunDispatchResponseSchema
} from "@loopad/shared";
import { BannerResolveService, PromotionDispatchService } from "../service/index.js";

@Controller("ad")
export class AdExecutionController {
  constructor(
    @Inject(PromotionDispatchService)
    private readonly promotionDispatchService: PromotionDispatchService,
    @Inject(BannerResolveService)
    private readonly bannerResolveService: BannerResolveService
  ) {}

  @Post("promotion-runs/:promotion_run_id/dispatch")
  async dispatchPromotionRun(@Param() params: unknown) {
    const parsedParams = PromotionRunDispatchParamsSchema.parse(params);

    return PromotionRunDispatchResponseSchema.parse(
      await this.promotionDispatchService.dispatchPromotionRun(parsedParams.promotion_run_id)
    );
  }

  @Get("banner/resolve")
  async resolveBanner(@Query() query: unknown) {
    const request = BannerResolveQuerySchema.parse(query);

    return BannerResolveResponseSchema.parse(await this.bannerResolveService.resolveBanner(request));
  }
}
