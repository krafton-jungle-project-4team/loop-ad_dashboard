import { Controller, Get, Inject, Param, Post, Query } from "@nestjs/common";
import {
  BannerResolveQuerySchema,
  BannerResolveResponseSchema,
  PromotionRunDispatchParamsSchema,
  PromotionRunDispatchResponseSchema
} from "@loopad/shared";
import { BannerResolveService, PromotionDispatchService } from "../service/index.js";

/** 광고 실행 API 요청을 기능별 서비스로 전달하는 컨트롤러입니다. */
@Controller("ad")
export class AdExecutionController {
  constructor(
    @Inject(PromotionDispatchService)
    private readonly promotionDispatchService: PromotionDispatchService,
    @Inject(BannerResolveService)
    private readonly bannerResolveService: BannerResolveService
  ) {}

  /** 저장된 assignment 기반으로 프로모션 발송을 실행합니다. */
  @Post("promotion-runs/:promotion_run_id/dispatch")
  async dispatchPromotionRun(@Param() params: unknown) {
    const parsedParams = PromotionRunDispatchParamsSchema.parse(params);

    return PromotionRunDispatchResponseSchema.parse(
      await this.promotionDispatchService.dispatchPromotionRun(parsedParams.promotion_run_id)
    );
  }

  /** 사용자의 onsite banner 배정 콘텐츠를 조회합니다. */
  @Get("banner/resolve")
  async resolveBanner(@Query() query: unknown) {
    const request = BannerResolveQuerySchema.parse(query);

    return BannerResolveResponseSchema.parse(await this.bannerResolveService.resolveBanner(request));
  }
}
