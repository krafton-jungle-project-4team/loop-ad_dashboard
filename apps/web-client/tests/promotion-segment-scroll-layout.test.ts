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
const workspaceControllerSource = readFileSync(
  new URL(
    "../src/features/dashboard/ui/pages/campaign/promotion/usePromotionWorkspaceController.ts",
    import.meta.url
  ),
  "utf8"
);

test("segment candidate panel grows to its content height so the page owns scrolling", () => {
  assert.match(suggestionPanelSource, /<Card className="shrink-0 shadow-none">/);
  assert.match(suggestionPanelSource, /<CardContent className="grid content-start gap-4">/);
  assert.doesNotMatch(suggestionPanelSource, /<Card className="min-h-0(?: [^"]*)?shadow-none">/);
});

test("segment workspace keeps its intrinsic content height without nested workflow tabs", () => {
  assert.match(workspaceSource, /<TabsContent className="flex-none" value="segments">/);
  assert.doesNotMatch(workspaceSource, /<TabsContent[^>]+value="candidates">/);
  assert.doesNotMatch(workspaceSource, /<TabsContent[^>]+value="confirmed">/);
  assert.doesNotMatch(workspaceSource, /<TabsContent[^>]+value="experiments">/);
});

test("segment workflow keeps the candidate deck beside the confirmed shortlist", () => {
  assert.match(
    workspaceSource,
    /xl:grid-cols-\[minmax\(0,1\.65fr\)_minmax\(19rem,0\.75fr\)\]/
  );
  assert.match(workspaceSource, /<PromotionSegmentSuggestionPanel/);
  assert.match(workspaceSource, /<PromotionCurrentSegmentsPanel/);
  assert.doesNotMatch(workspaceSource, /<TabsTrigger[^>]+value="experiments">/);
});

test("experiment detail renders only after a confirmed segment is selected", () => {
  assert.match(
    workspaceSource,
    /const showsExperimentWorkspace = segmentView === "experiments" && Boolean\(selectedSegmentId\);/
  );
  assert.match(workspaceSource, /고객군 관리로 돌아가기/);
});

test("confirming segment candidates keeps the combined workspace open", () => {
  assert.match(workspaceSource, /onConfirmSuggestions=\{onConfirmSuggestions\}/);
  assert.doesNotMatch(workspaceSource, /확정 고객군으로 이동하시겠어요\?/);
  assert.doesNotMatch(workspaceSource, /setIsConfirmationNavigationOpen/);
});

test("selecting creative experiments opens the separate experiment detail", () => {
  assert.match(workspaceSource, /onSelectSegment=\{onSelectSegment\}/);
  assert.match(
    workspaceControllerSource,
    /const selectSegment = \(promotionId: string, segmentId: string\) => \{\s+setWorkspaceTab\("segment-detail"\);\s+void setDashboardQueryState\(\{\s+segmentView: "experiments"/
  );
});

test("segment candidates use one full-width carousel slide at a time", () => {
  assert.match(suggestionPanelSource, /aria-label="고객군 후보 검토"/);
  assert.match(suggestionPanelSource, /<CarouselContent className="ml-0 items-stretch">/);
  assert.match(suggestionPanelSource, /<CarouselItem className="flex basis-full pl-0"/);
  assert.match(suggestionPanelSource, /aria-label="고객군 후보 이동"/);
  assert.match(suggestionPanelSource, /이전 후보/);
  assert.match(suggestionPanelSource, /다음 후보/);
  assert.match(suggestionPanelSource, /candidateCarouselApi\?\.scrollPrev\(\)/);
  assert.match(suggestionPanelSource, /candidateCarouselApi\?\.scrollNext\(\)/);
  assert.match(
    suggestionPanelSource,
    /grid-cols-\[minmax\(0,1fr\)_auto_minmax\(0,1fr\)\]/
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
