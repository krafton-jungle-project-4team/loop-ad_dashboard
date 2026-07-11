import assert from "node:assert/strict";
import test from "node:test";
import { calculateDetailPanelMaxHeight } from "../src/features/dashboard/ui/pages/funnel/useFunnelDetailPanelResize.js";

test("mobile funnel panel reserves room for the onboarding action", () => {
  assert.equal(calculateDetailPanelMaxHeight(844), 658);
  assert.equal(calculateDetailPanelMaxHeight(844, 136), 522);
});

test("funnel panel remains at least as tall as its collapsed header", () => {
  assert.equal(calculateDetailPanelMaxHeight(120, 136), 58);
});
