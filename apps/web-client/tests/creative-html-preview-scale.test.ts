import assert from "node:assert/strict";
import test from "node:test";
import { calculateCreativeHtmlPreviewScale } from "../src/features/dashboard/ui/pages/campaign/promotion/components/creativeHtmlPreviewScale.js";

test("creative preview keeps its actual size when the container is wide enough", () => {
  assert.equal(calculateCreativeHtmlPreviewScale(800, 600), 1);
  assert.equal(calculateCreativeHtmlPreviewScale(600, 600), 1);
});

test("creative preview scales down to fit while preserving the iframe viewport width", () => {
  assert.equal(calculateCreativeHtmlPreviewScale(600, 1200), 0.5);
  assert.equal(calculateCreativeHtmlPreviewScale(300, 375), 0.8);
});

test("creative preview uses a safe initial scale for unmeasured or invalid dimensions", () => {
  assert.equal(calculateCreativeHtmlPreviewScale(0, 600), 1);
  assert.equal(calculateCreativeHtmlPreviewScale(Number.NaN, 600), 1);
  assert.equal(calculateCreativeHtmlPreviewScale(600, 0), 1);
});
