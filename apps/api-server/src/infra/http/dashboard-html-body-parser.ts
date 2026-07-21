import type { IncomingMessage } from "node:http";

export const DASHBOARD_HTML_EDITOR_JSON_WIRE_LIMIT_BYTES = 12_100_000;

const DASHBOARD_HTML_EDITOR_PATH =
  /^\/api\/dashboard\/v1\/promotions\/[^/]+\/segments\/[^/]+\/content-candidates\/[^/]+\/html\/(?:preview|source)\/?$/;

export function isDashboardHtmlEditorJsonRequest(request: IncomingMessage) {
  if (!isJsonContentType(request.headers["content-type"])) {
    return false;
  }

  const path = request.url?.split("?", 1)[0] ?? "";
  return (
    ((request.method === "POST" && path.endsWith("/html/preview")) ||
      (request.method === "PUT" && path.endsWith("/html/source"))) &&
    DASHBOARD_HTML_EDITOR_PATH.test(path)
  );
}

export function isDefaultJsonRequest(request: IncomingMessage) {
  return (
    isJsonContentType(request.headers["content-type"]) && !isDashboardHtmlEditorJsonRequest(request)
  );
}

function isJsonContentType(value: string | string[] | undefined) {
  const contentType = (Array.isArray(value) ? value[0] : value)
    ?.split(";", 1)[0]
    ?.trim()
    .toLowerCase();
  return contentType === "application/json" || contentType?.endsWith("+json") === true;
}
