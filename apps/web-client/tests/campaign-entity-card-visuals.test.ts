import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const entityCardSource = readFileSync(
  new URL(
    "../src/features/dashboard/ui/pages/campaign/workspace/EntityCardGrid.tsx",
    import.meta.url
  ),
  "utf8"
);
const workspaceSource = readFileSync(
  new URL(
    "../src/features/dashboard/ui/pages/campaign/workspace/CampaignWorkspacePage.tsx",
    import.meta.url
  ),
  "utf8"
);
const themeSource = readFileSync(new URL("../src/index.css", import.meta.url), "utf8");

test("campaign cards describe lifecycle states with semantic roles", () => {
  assert.match(workspaceSource, /label: "예정 캠페인", tone: "neutral"/);
  assert.match(workspaceSource, /label: "진행 중 캠페인", tone: "info"/);
  assert.match(workspaceSource, /label: "완료 캠페인", tone: "success"/);
  assert.match(workspaceSource, /toCampaignCard\(campaign, section\.status\)/);
});

test("campaign and promotion rows reserve color for meaningful status", () => {
  assert.match(workspaceSource, /status: "scheduled",\s+tone: "neutral"/);
  assert.match(workspaceSource, /status: "preparing",\s+tone: "neutral"/);
  assert.match(workspaceSource, /status: "in_progress",\s+tone: "info"/);
  assert.match(workspaceSource, /status: "next_experiment",\s+tone: "warning"/);
  assert.match(workspaceSource, /status: "completed",\s+tone: "success"/);
  assert.match(
    workspaceSource,
    /info: "border-status-info\/30 bg-status-info-soft text-status-info-foreground"/
  );
  assert.match(workspaceSource, /STATUS_ICON_TONE_CLASS\[section\.tone\]/);
  assert.match(workspaceSource, /neutral: "border-border bg-muted text-muted-foreground"/);
  assert.match(
    workspaceSource,
    /className="grid min-w-0 gap-3 rounded-xl border bg-muted\/25 p-3"/
  );
});

test("promotion cards use neutral, info, warning, and success roles", () => {
  assert.match(
    workspaceSource,
    /preparing: \{ icon: FlaskConical, label: "준비 중 프로모션", tone: "neutral" \}/
  );
  assert.match(
    workspaceSource,
    /in_progress: \{ icon: CirclePlay, label: "진행 중 프로모션", tone: "info" \}/
  );
  assert.match(
    workspaceSource,
    /next_experiment: \{ icon: RefreshCw, label: "다음 실험 필요", tone: "warning" \}/
  );
  assert.match(
    workspaceSource,
    /completed: \{ icon: CircleCheck, label: "완료 프로모션", tone: "success" \}/
  );
  assert.match(workspaceSource, /toPromotionCard\(promotion, section\.status\)/);
});

test("entity cards keep neutral surfaces and limit status color to badges and icons", () => {
  assert.doesNotMatch(entityCardSource, /h-1 w-full/);
  assert.doesNotMatch(entityCardSource, /entity\.visual && "pt-0"/);
  assert.match(entityCardSource, /<VisualIcon aria-hidden="true" className="size-4" \/>/);
  assert.match(
    entityCardSource,
    /icon: "border-status-warning\/30 bg-status-warning-soft text-status-warning-foreground"/
  );
  assert.match(
    entityCardSource,
    /icon: "border-status-success\/30 bg-status-success-soft text-status-success-foreground"/
  );
  assert.match(entityCardSource, /<Badge variant=\{visualTone\.badgeVariant\}>/);
  assert.match(entityCardSource, /rounded-md border border-border\/70 bg-muted\/35 p-3/);
});

test("campaign and promotion cards reserve equal title and description rows", () => {
  assert.match(entityCardSource, /flex min-w-0 flex-nowrap items-center gap-2/);
  assert.match(entityCardSource, /min-h-14 text-lg leading-7 group-data-\[size=sm\]\/card:text-lg/);
  assert.match(entityCardSource, /isCompact \? "min-h-10" : "min-h-12"/);
  assert.match(entityCardSource, /title=\{entity\.title\}/);
  assert.match(entityCardSource, /title=\{entity\.description\}/);
});

test("the palette exposes role tokens instead of product-area colors", () => {
  for (const token of ["info", "success", "warning", "danger"]) {
    assert.match(themeSource, new RegExp(`--status-${token}:`));
    assert.match(themeSource, new RegExp(`--status-${token}-soft:`));
    assert.match(themeSource, new RegExp(`--status-${token}-foreground:`));
  }

  assert.doesNotMatch(themeSource, /--entity-(mint|blue|amber|coral):/);
  assert.doesNotMatch(themeSource, /--promotion-action:/);
  assert.doesNotMatch(themeSource, /--segment-action:/);
});
