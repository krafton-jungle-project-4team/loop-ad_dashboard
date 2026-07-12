import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../infra/database/index.js";
import {
  PublicSdkConnectionController,
  TrackingPlanController
} from "./tracking-plan.controller.js";
import { TrackingPlanRepository } from "./tracking-plan.repository.js";
import { TrackingPlanService } from "./tracking-plan.service.js";

@Module({
  imports: [DatabaseModule],
  controllers: [TrackingPlanController, PublicSdkConnectionController],
  providers: [TrackingPlanRepository, TrackingPlanService]
})
export class TrackingPlanModule {}
