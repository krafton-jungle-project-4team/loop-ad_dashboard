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

test("segment candidate workspace keeps its intrinsic content height", () => {
  assert.match(workspaceSource, /<TabsContent className="flex-none" value="segments">/);
  assert.match(workspaceSource, /segmentWorkspaceView === "candidates"/);
});

test("confirmed segments open in a contextual sheet instead of peer tabs", () => {
  assert.doesNotMatch(workspaceSource, /<TabsTrigger value="candidates">/);
  assert.doesNotMatch(workspaceSource, /<TabsTrigger value="confirmed">/);
  assert.doesNotMatch(workspaceSource, /<TabsTrigger[^>]+value="experiments">/);
  assert.match(workspaceSource, /<Sheet onOpenChange=\{setIsConfirmedSegmentsOpen\}/);
  assert.match(
    workspaceSource,
    /<SheetContent className="gap-0 p-0 data-\[side=right\]:w-\[92vw\] data-\[side=right\]:sm:max-w-xl">/
  );
  assert.match(workspaceSource, /<CardContent className="grid min-w-0 gap-3">/);
  assert.match(workspaceSource, /className="w-full justify-center whitespace-nowrap"/);
  assert.match(suggestionPanelSource, /확정 고객군 \{formatInteger\(confirmedSegmentCount\)\}/);
});

test("experiment workflow returns to candidates with an explicit action", () => {
  assert.match(
    workspaceSource,
    /setSegmentWorkspaceView\("candidates"\);\s+onSegmentViewChange\("manage"\);/
  );
  assert.match(workspaceSource, /고객군 후보로 돌아가기/);
});

test("confirming segment candidates asks before opening confirmed segments", () => {
  assert.match(
    workspaceSource,
    /await onConfirmSuggestions\(segmentIds\);\s+setIsConfirmationNavigationOpen\(true\);/
  );
  assert.match(workspaceSource, /확정 고객군 목록을 열어볼까요\?/);
  assert.match(workspaceSource, /setIsConfirmedSegmentsOpen\(true\);/);
});

test("selecting creative experiments closes the sheet and opens the experiment workspace", () => {
  assert.match(
    workspaceSource,
    /onSelectSegment=\{\(promotionId, segmentId\) => \{\s+setIsConfirmedSegmentsOpen\(false\);\s+setSegmentWorkspaceView\("experiments"\);\s+onSegmentViewChange\("experiments"\);\s+onSelectSegment\(promotionId, segmentId\);/
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
