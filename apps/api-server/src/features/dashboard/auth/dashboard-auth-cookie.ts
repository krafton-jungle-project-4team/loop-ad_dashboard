export const DASHBOARD_AUTH_COOKIE_NAME = "loopad_dashboard_session";
export const DASHBOARD_AUTH_SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;

export type DashboardCookieRequest = {
  headers?: {
    cookie?: string | string[];
  };
};

export type DashboardCookieResponse = {
  setHeader(name: string, value: string | string[]): unknown;
};

export function readDashboardAuthCookie(request: DashboardCookieRequest) {
  const cookieHeader = request.headers?.cookie;
  const rawCookie = Array.isArray(cookieHeader) ? cookieHeader.join("; ") : cookieHeader;

  if (!rawCookie) {
    return null;
  }

  const cookies = rawCookie.split(";").map((part) => part.trim());
  const match = cookies.find((part) => part.startsWith(`${DASHBOARD_AUTH_COOKIE_NAME}=`));

  if (!match) {
    return null;
  }

  return decodeURIComponent(match.slice(DASHBOARD_AUTH_COOKIE_NAME.length + 1));
}

export function setDashboardAuthCookie(response: DashboardCookieResponse, sessionId: string) {
  response.setHeader("Set-Cookie", serializeDashboardCookie(sessionId));
}

export function clearDashboardAuthCookie(response: DashboardCookieResponse) {
  response.setHeader("Set-Cookie", serializeDashboardCookie("", 0));
}

function serializeDashboardCookie(value: string, maxAge = DASHBOARD_AUTH_SESSION_MAX_AGE_SECONDS) {
  return [
    `${DASHBOARD_AUTH_COOKIE_NAME}=${encodeURIComponent(value)}`,
    "HttpOnly",
    "Path=/",
    "SameSite=Lax",
    `Max-Age=${maxAge}`
  ].join("; ");
}
