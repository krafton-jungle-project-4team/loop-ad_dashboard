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

test("segment candidate explanations use readable foreground contrast", () => {
  assert.match(
    suggestionPanelSource,
    /<CardContent className="grid gap-3 text-sm text-foreground\/80">/
  );
  assert.match(suggestionPanelSource, /gap-0\.5 text-\[11px\] leading-4 text-foreground\/70/);
});

test("segment report body copy does not use muted foreground", () => {
  assert.match(
    suggestionPanelSource,
    /<p className="text-sm leading-6 text-foreground\/80">\{report\.action_hint\}<\/p>/
  );
  assert.match(
    suggestionPanelSource,
    /<ul className="grid gap-2 text-sm leading-6 text-foreground\/80">/
  );
  assert.doesNotMatch(
    suggestionPanelSource,
    /<ul className="grid gap-2 text-sm leading-6 text-muted-foreground">/
  );
});
