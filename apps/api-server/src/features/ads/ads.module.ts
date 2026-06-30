import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../infra/database/index.js";
import { AdsController } from "./controller/ads.controller.js";
import { AdsReader } from "./repository/index.js";
import { AdsService } from "./service/index.js";

@Module({
  imports: [DatabaseModule],
  controllers: [AdsController],
  providers: [AdsService, AdsReader]
})
export class AdsModule {}
