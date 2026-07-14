import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../infra/database/index.js";
import {
  PublicSdkConnectionController,
  TrackingPlanController
} from "./tracking-plan.controller.js";
import { TrackingPlanObservedEventReader } from "./tracking-plan-observed-event-reader.js";
import { TrackingPlanRepository } from "./tracking-plan.repository.js";
import { TrackingPlanService } from "./tracking-plan.service.js";

@Module({
  imports: [DatabaseModule],
  controllers: [TrackingPlanController, PublicSdkConnectionController],
  providers: [TrackingPlanObservedEventReader, TrackingPlanRepository, TrackingPlanService]
})
export class TrackingPlanModule {}
