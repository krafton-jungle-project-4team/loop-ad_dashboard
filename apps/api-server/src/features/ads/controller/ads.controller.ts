import { Body, Controller, Inject, Post } from "@nestjs/common";
import { AdsServeRequestSchema, AdsServeResponseSchema } from "@loopad/shared";
import { AdsService } from "../service/index.js";

@Controller("ads")
export class AdsController {
  constructor(
    @Inject(AdsService)
    private readonly adsService: AdsService
  ) {}

  @Post("serve")
  async serve(@Body() body: unknown) {
    const request = AdsServeRequestSchema.parse(body);

    return AdsServeResponseSchema.parse(await this.adsService.serve(request));
  }
}
