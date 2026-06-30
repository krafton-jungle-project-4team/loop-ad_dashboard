import assert from "node:assert/strict";
import { test } from "node:test";
import { isAllowedLoopAdOrigin } from "../src/infra/http/cors-origin.js";

test("allows loop-ad.org and loop-ad.org subdomains only", () => {
  assert.equal(isAllowedLoopAdOrigin("https://loop-ad.org"), true);
  assert.equal(isAllowedLoopAdOrigin("https://dashboard.dev.loop-ad.org"), true);
  assert.equal(isAllowedLoopAdOrigin("https://shop.loop-ad.org"), true);
  assert.equal(isAllowedLoopAdOrigin("http://loop-ad.org"), false);
  assert.equal(isAllowedLoopAdOrigin("https://localhost:5173"), false);
  assert.equal(isAllowedLoopAdOrigin("http://127.0.0.1:5173"), false);
  assert.equal(isAllowedLoopAdOrigin("https://evil-loop-ad.org"), false);
});
