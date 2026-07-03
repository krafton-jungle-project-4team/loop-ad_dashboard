import { readFileSync } from "node:fs";
import escapeHtml from "escape-html";
import serializeJavascript from "serialize-javascript";
import type { RedirectPageSnapshot } from "../domain/index.js";

const REDIRECT_MAX_WAIT_MS = 1800;
const REDIRECT_SETTLE_DELAY_MS = 200;
const REDIRECT_PAGE_TEMPLATE = readFileSync(
  new URL("./redirect-page.template.html", import.meta.url),
  "utf8"
);

/** redirect 이벤트 전송 후 이동하는 HTML을 렌더링합니다. */
export function renderRedirectPage(snapshot: RedirectPageSnapshot): string {
  return renderTemplate(REDIRECT_PAGE_TEMPLATE, {
    __LOOPAD_REDIRECT_JSON__: serializeJavascript(snapshot, { isJSON: true }),
    __LOOPAD_FALLBACK_HREF__: escapeHtml(snapshot.targetUrl),
    __LOOPAD_REDIRECT_MAX_WAIT_MS__: String(REDIRECT_MAX_WAIT_MS),
    __LOOPAD_REDIRECT_SETTLE_DELAY_MS__: String(REDIRECT_SETTLE_DELAY_MS)
  });
}

function renderTemplate(template: string, replacements: Record<string, string>) {
  return Object.entries(replacements).reduce(
    (html, [token, value]) => html.replaceAll(token, value),
    template
  );
}
