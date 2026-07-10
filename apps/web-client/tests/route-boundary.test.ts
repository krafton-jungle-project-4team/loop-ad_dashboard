import assert from "node:assert/strict";
import test from "node:test";
import { createRouteBoundaryOptions } from "../src/app/route-boundary.js";

test("route pending state appears immediately without flashing", () => {
  const PendingComponent = () => null;
  const options = createRouteBoundaryOptions({ pendingComponent: PendingComponent });

  assert.equal(options.pendingComponent, PendingComponent);
  assert.equal(options.pendingMs, 0);
  assert.equal(options.pendingMinMs, 300);
  assert.equal(options.wrapInSuspense, true);
});
