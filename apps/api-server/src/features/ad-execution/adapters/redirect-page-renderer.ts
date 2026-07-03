import type { RedirectPageSnapshot } from "../domain/index.js";

const REDIRECT_MAX_WAIT_MS = 1800;
const REDIRECT_SETTLE_DELAY_MS = 200;

export function renderRedirectPage(snapshot: RedirectPageSnapshot): string {
  const redirectJson = serializeForScript(snapshot);
  const fallbackHref = escapeHtmlAttribute(snapshot.targetUrl);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="referrer" content="no-referrer-when-downgrade">
    <title>Redirecting</title>
    <style>
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        color: #172033;
        background: #f8fafc;
      }
      main {
        width: min(420px, calc(100vw - 48px));
      }
      p {
        margin: 8px 0 0;
        color: #526071;
      }
      a {
        color: #1d4ed8;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>Redirecting</h1>
      <p>Your promotion click is being recorded.</p>
      <p><a href="${fallbackHref}" rel="nofollow noreferrer">Continue</a></p>
    </main>
    <script>
      (function () {
        const redirect = ${redirectJson};
        let navigated = false;
        const fallbackTimer = window.setTimeout(navigate, ${REDIRECT_MAX_WAIT_MS});

        function navigate() {
          if (navigated) {
            return;
          }

          navigated = true;
          window.clearTimeout(fallbackTimer);
          window.location.replace(redirect.targetUrl);
        }

        function loadSdk(src) {
          return new Promise(function (resolve, reject) {
            if (window.LoopAdEventSDK && typeof window.LoopAdEventSDK.init === "function") {
              resolve();
              return;
            }

            const script = document.createElement("script");
            script.src = src;
            script.async = true;
            script.onload = function () { resolve(); };
            script.onerror = function () { reject(new Error("LoopAd Event SDK failed to load.")); };
            document.head.appendChild(script);
          });
        }

        function trackRedirectClick() {
          if (!window.LoopAdEventSDK || typeof window.LoopAdEventSDK.init !== "function") {
            throw new Error("LoopAd Event SDK is unavailable.");
          }

          const sdk = window.LoopAdEventSDK.init({
            projectId: redirect.event.projectId,
            writeKey: redirect.eventSdk.writeKey,
            identity: redirect.event.identity,
            autoTrackPageViews: false,
            collectDomEvents: false
          });

          if (!sdk || typeof sdk.track !== "function") {
            throw new Error("LoopAd Event SDK track method is unavailable.");
          }

          sdk.track(redirect.event.name, redirect.event.fields);
        }

        loadSdk(redirect.eventSdk.url)
          .then(trackRedirectClick)
          .catch(function (error) {
            console.warn("LoopAd redirect event failed.", error);
          })
          .finally(function () {
            window.setTimeout(navigate, ${REDIRECT_SETTLE_DELAY_MS});
          });
      })();
    </script>
    <noscript>
      <meta http-equiv="refresh" content="0;url=${fallbackHref}">
    </noscript>
  </body>
</html>`;
}

function serializeForScript(value: unknown) {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

function escapeHtmlAttribute(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
