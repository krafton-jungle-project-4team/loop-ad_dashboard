import assert from "node:assert/strict";
import { test } from "node:test";
import { createCorsOriginResolver, isAllowedLoopAdOrigin } from "../src/infra/http/cors-origin.js";

test("allows loop-ad.org and loop-ad.org subdomains only", () => {
  assert.equal(isAllowedLoopAdOrigin("https://loop-ad.org"), true);
  assert.equal(isAllowedLoopAdOrigin("https://dashboard.dev.loop-ad.org"), true);
  assert.equal(isAllowedLoopAdOrigin("https://demo-shoppingmall.dev.loop-ad.org"), true);
  assert.equal(isAllowedLoopAdOrigin("https://shop.loop-ad.org"), true);
  assert.equal(isAllowedLoopAdOrigin("http://loop-ad.org"), false);
  assert.equal(isAllowedLoopAdOrigin("https://localhost:5173"), false);
  assert.equal(isAllowedLoopAdOrigin("http://127.0.0.1:5173"), false);
  assert.equal(isAllowedLoopAdOrigin("https://evil-loop-ad.org"), false);
});

test("allows local HTTP origins only in local development resolver", async () => {
  const previousLoopAdEnv = process.env.LOOPAD_ENV;
  process.env.LOOPAD_ENV = "local";
  const resolveOrigin = createCorsOriginResolver();

  const allowed = await new Promise<boolean | undefined>((resolve, reject) => {
    resolveOrigin("http://localhost:5173", (error, allow) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(allow);
    });
  });

  assert.equal(allowed, true);
  if (previousLoopAdEnv === undefined) {
    delete process.env.LOOPAD_ENV;
  } else {
    process.env.LOOPAD_ENV = previousLoopAdEnv;
  }
});
