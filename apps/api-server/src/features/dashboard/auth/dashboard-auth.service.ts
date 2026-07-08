import { randomUUID } from "node:crypto";
import { Injectable } from "@nestjs/common";
import type { DashboardAuthUser, DashboardLoginRequest } from "@loopad/shared";

const DASHBOARD_ADMIN = {
  id: "loopadmin",
  name: "LoopAd Admin",
  password: "loopadminpw",
  role: "admin" as const
};

type DashboardSession = {
  expiresAt: number;
  user: DashboardAuthUser;
};

@Injectable()
export class DashboardAuthService {
  private readonly sessions = new Map<string, DashboardSession>();

  login(request: DashboardLoginRequest) {
    if (request.id !== DASHBOARD_ADMIN.id || request.password !== DASHBOARD_ADMIN.password) {
      return null;
    }

    const sessionId = randomUUID();
    const user = this.adminUser();

    this.sessions.set(sessionId, {
      expiresAt: Date.now() + 1000 * 60 * 60 * 8,
      user
    });

    return { sessionId, user };
  }

  findSession(sessionId: string | null) {
    if (!sessionId) {
      return null;
    }

    const session = this.sessions.get(sessionId);

    if (!session) {
      return null;
    }

    if (session.expiresAt <= Date.now()) {
      this.sessions.delete(sessionId);
      return null;
    }

    return { user: session.user };
  }

  logout(sessionId: string | null) {
    if (sessionId) {
      this.sessions.delete(sessionId);
    }
  }

  private adminUser(): DashboardAuthUser {
    return {
      id: DASHBOARD_ADMIN.id,
      name: DASHBOARD_ADMIN.name,
      role: DASHBOARD_ADMIN.role
    };
  }
}
