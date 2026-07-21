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

test("segment candidate footer stays compact and exposes one confirmation action", () => {
  assert.match(
    suggestionPanelSource,
    /<CardFooter className="flex shrink-0 flex-col gap-3 border-t bg-muted\/20 py-3/
  );
  assert.match(suggestionPanelSource, /후보 \{formatInteger\(candidateCount\)\}개 중/);
  assert.match(suggestionPanelSource, /<CheckCircle2 data-icon="inline-start" \/>/);
  assert.doesNotMatch(suggestionPanelSource, /선택한 고객군/);
});

test("selected candidate cards have a strong card-level state", () => {
  assert.match(
    suggestionPanelSource,
    /border-primary bg-accent\/60 ring-2 ring-primary\/30 shadow-sm/
  );
  assert.match(suggestionPanelSource, /\{isAccepted \? <Badge>선택됨<\/Badge> : null\}/);
});

test("segment candidate tabs keep their intrinsic content height", () => {
  assert.match(workspaceSource, /<TabsContent className="flex-none" value="segments">/);
  assert.match(workspaceSource, /<TabsContent className="flex-none" value="candidates">/);
});

test("segment workflow connects candidates, confirmed segments, and experiments", () => {
  assert.match(workspaceSource, /<TabsTrigger value="candidates">/);
  assert.match(workspaceSource, /<TabsTrigger value="confirmed">/);
  assert.match(
    workspaceSource,
    /<TabsTrigger disabled=\{!selectedSegmentId\} value="experiments">/
  );
  assert.match(workspaceSource, /<TabsContent className="min-h-0" value="experiments">/);
});

test("experiment workflow stays unavailable until a confirmed segment is selected", () => {
  assert.match(
    workspaceSource,
    /segmentView === "experiments" && selectedSegmentId \? "experiments" : "candidates"/
  );
  assert.match(
    workspaceSource,
    /if \(nextTab === "experiments" && !selectedSegmentId\) \{\s+return;/
  );
});

test("confirming segment candidates asks before moving to confirmed segments", () => {
  assert.match(
    workspaceSource,
    /await onConfirmSuggestions\(segmentIds\);\s+setIsConfirmationNavigationOpen\(true\);/
  );
  assert.match(workspaceSource, /확정 고객군으로 이동하시겠어요\?/);
  assert.match(workspaceSource, /setSegmentListTab\("confirmed"\);/);
});

test("selecting creative experiments opens the experiment workflow tab", () => {
  assert.match(
    workspaceSource,
    /onSelectSegment=\{\(promotionId, segmentId\) => \{\s+setSegmentListTab\("experiments"\);\s+onSelectSegment\(promotionId, segmentId\);/
  );
});

test("content candidates use one full-width carousel slide at a time", () => {
  assert.match(workspaceSource, /aria-label="광고 소재 후보"/);
  assert.match(workspaceSource, /<CarouselContent className="ml-0">/);
  assert.match(workspaceSource, /<CarouselItem\s+className="basis-full pl-0"/);
  assert.match(workspaceSource, /aria-label="이전 광고 소재"/);
  assert.match(workspaceSource, /aria-label="다음 광고 소재"/);
  assert.match(workspaceSource, /aria-label="광고 소재 이동"/);
  assert.doesNotMatch(workspaceSource, /좌우 버튼 또는 방향키/);
});
