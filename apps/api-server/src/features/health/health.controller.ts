import { Controller, Get } from "@nestjs/common";
import { success } from "../../infra/http/api-response.js";

@Controller("health")
export class HealthController {
  @Get()
  health() {
    return success({ status: "ok" });
  }
}
