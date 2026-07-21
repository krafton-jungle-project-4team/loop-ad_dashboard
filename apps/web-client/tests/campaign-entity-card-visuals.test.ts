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

test("campaign cards expose schedule-specific visual treatments", () => {
  assert.match(workspaceSource, /label: "예정 캠페인", tone: "neutral"/);
  assert.match(workspaceSource, /label: "진행 중 캠페인", tone: "blue"/);
  assert.match(workspaceSource, /label: "완료 캠페인", tone: "mint"/);
  assert.match(workspaceSource, /toCampaignCard\(campaign, section\.status\)/);
});

test("campaign and promotion row icons use distinct status colors", () => {
  assert.match(workspaceSource, /status: "scheduled",\s+tone: "neutral"/);
  assert.match(workspaceSource, /status: "preparing",\s+tone: "neutral"/);
  assert.match(workspaceSource, /status: "in_progress",\s+tone: "blue"/);
  assert.match(workspaceSource, /status: "next_experiment",\s+tone: "coral"/);
  assert.match(workspaceSource, /status: "completed",\s+tone: "mint"/);
  assert.match(
    workspaceSource,
    /blue: "border-entity-blue\/25 bg-entity-blue-soft text-entity-blue-foreground"/
  );
  assert.match(workspaceSource, /STATUS_ICON_TONE_CLASS\[section\.tone\]/);
  assert.match(workspaceSource, /neutral: "border-border bg-muted text-muted-foreground"/);
});

test("promotion cards expose channel-specific visual treatments", () => {
  assert.match(workspaceSource, /email: \{ icon: Mail, label: "이메일", tone: "blue" \}/);
  assert.match(workspaceSource, /sms: \{ icon: MessageSquareText, label: "문자", tone: "coral" \}/);
  assert.match(
    workspaceSource,
    /onsite_banner: \{ icon: Megaphone, label: "온사이트 배너", tone: "mint" \}/
  );
});

test("entity cards render a restrained accent, icon tile, and metric surface", () => {
  assert.match(entityCardSource, /<div aria-hidden="true" className=\{cn\("h-1 w-full"/);
  assert.match(entityCardSource, /<VisualIcon aria-hidden="true" className="size-4" \/>/);
  assert.match(entityCardSource, /rounded-md border border-border\/70 bg-muted\/35 p-3/);
});

test("campaign and promotion cards reserve equal title and description rows", () => {
  assert.match(entityCardSource, /flex min-w-0 flex-nowrap items-center gap-2/);
  assert.match(entityCardSource, /min-h-14 text-lg leading-7 group-data-\[size=sm\]\/card:text-lg/);
  assert.match(entityCardSource, /isCompact \? "min-h-10" : "min-h-12"/);
  assert.match(entityCardSource, /title=\{entity\.title\}/);
  assert.match(entityCardSource, /title=\{entity\.description\}/);
});

test("entity card accents use named Mintlify palette tokens", () => {
  for (const token of ["mint", "blue", "amber", "coral"]) {
    assert.match(themeSource, new RegExp(`--entity-${token}:`));
    assert.match(themeSource, new RegExp(`--entity-${token}-soft:`));
    assert.match(themeSource, new RegExp(`--entity-${token}-foreground:`));
  }
});
