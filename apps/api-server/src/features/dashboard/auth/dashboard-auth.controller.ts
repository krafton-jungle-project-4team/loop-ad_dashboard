import {
  Body,
  Controller,
  Get,
  Inject,
  Post,
  Req,
  Res,
  UnauthorizedException
} from "@nestjs/common";
import { DashboardLoginRequestSchema } from "@loopad/shared";
import {
  clearDashboardAuthCookie,
  readDashboardAuthCookie,
  setDashboardAuthCookie,
  type DashboardCookieRequest,
  type DashboardCookieResponse
} from "./dashboard-auth-cookie.js";
import { DashboardAuthService } from "./dashboard-auth.service.js";

@Controller("dashboard/auth")
export class DashboardAuthController {
  constructor(
    @Inject(DashboardAuthService)
    private readonly dashboardAuth: DashboardAuthService
  ) {}

  @Post("login")
  login(
    @Body() body: unknown,
    @Res({ passthrough: true }) response: DashboardCookieResponse
  ) {
    const result = this.dashboardAuth.login(DashboardLoginRequestSchema.parse(body));

    if (!result) {
      throw new UnauthorizedException("Invalid dashboard admin credentials.");
    }

    setDashboardAuthCookie(response, result.sessionId);
    return { user: result.user };
  }

  @Get("me")
  me(@Req() request: DashboardCookieRequest) {
    const session = this.dashboardAuth.findSession(readDashboardAuthCookie(request));

    if (!session) {
      throw new UnauthorizedException("Dashboard login is required.");
    }

    return session;
  }

  @Post("logout")
  logout(
    @Req() request: DashboardCookieRequest,
    @Res({ passthrough: true }) response: DashboardCookieResponse
  ) {
    this.dashboardAuth.logout(readDashboardAuthCookie(request));
    clearDashboardAuthCookie(response);
    return { ok: true };
  }
}
