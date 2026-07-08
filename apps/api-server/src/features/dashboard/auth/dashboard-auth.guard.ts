import {
  Inject,
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext
} from "@nestjs/common";
import { readDashboardAuthCookie, type DashboardCookieRequest } from "./dashboard-auth-cookie.js";
import { DashboardAuthService } from "./dashboard-auth.service.js";

type GuardRequest = DashboardCookieRequest & {
  originalUrl?: string;
  url?: string;
};

@Injectable()
export class DashboardAuthGuard implements CanActivate {
  constructor(
    @Inject(DashboardAuthService)
    private readonly dashboardAuth: DashboardAuthService
  ) {}

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<GuardRequest>();

    if (!shouldProtectDashboardPath(request)) {
      return true;
    }

    const session = this.dashboardAuth.findSession(readDashboardAuthCookie(request));

    if (!session) {
      throw new UnauthorizedException("Dashboard login is required.");
    }

    return true;
  }
}

function shouldProtectDashboardPath(request: GuardRequest) {
  const path = request.originalUrl ?? request.url ?? "";

  return (
    path.startsWith("/api/dashboard/v1/") ||
    path === "/api/dashboard/v1" ||
    path.startsWith("/api/dashboard/data-explorer/") ||
    path === "/api/dashboard/data-explorer"
  );
}
