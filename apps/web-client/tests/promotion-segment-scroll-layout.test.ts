import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const suggestionPanelSource = readFileSync(
  new URL(
    "../src/features/dashboard/ui/pages/campaign/promotion/components/PromotionSegmentSuggestions.tsx",
    import.meta.url
  ),
  "utf8"
);
const workspaceSource = readFileSync(
  new URL(
    "../src/features/dashboard/ui/pages/campaign/promotion/components/PromotionWorkspaceContent.tsx",
    import.meta.url
  ),
  "utf8"
);

test("segment candidate panel grows to its content height so the page owns scrolling", () => {
  assert.match(suggestionPanelSource, /<Card className="shrink-0 shadow-none">/);
  assert.match(suggestionPanelSource, /<CardContent className="grid content-start gap-4">/);
  assert.doesNotMatch(suggestionPanelSource, /<Card className="min-h-0(?: [^"]*)?shadow-none">/);
});

test("segment candidate tabs keep their intrinsic content height", () => {
  assert.match(workspaceSource, /<TabsContent className="flex-none" value="segments">/);
  assert.match(workspaceSource, /<TabsContent className="flex-none" value="candidates">/);
});
