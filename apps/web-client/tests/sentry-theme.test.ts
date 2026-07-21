import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const themeSource = readFileSync(new URL("../src/index.css", import.meta.url), "utf8");
const buttonSource = readFileSync(
  new URL("../../../packages/ui/shadcn/button.tsx", import.meta.url),
  "utf8"
);
const dashboardShellSource = readFileSync(
  new URL("../src/features/dashboard/layout/DashboardShell.tsx", import.meta.url),
  "utf8"
);
const projectSelectSource = readFileSync(
  new URL("../src/features/dashboard/ui/project/ProjectSelectPage.tsx", import.meta.url),
  "utf8"
);
const projectSidebarBrandSource = readFileSync(
  new URL("../src/features/dashboard/ui/project/ProjectSidebarBrand.tsx", import.meta.url),
  "utf8"
);
const sqlEditorSource = readFileSync(
  new URL("../src/features/data-explorer/components/SqlEditorPanel.tsx", import.meta.url),
  "utf8"
);

test("the global palette uses Sentry-inspired purple, lavender, and ink tokens", () => {
  assert.match(themeSource, /--background: #f4f1f7;/);
  assert.match(themeSource, /--workspace-highlight: #ede7ff;/);
  assert.match(themeSource, /--foreground: #2b2233;/);
  assert.match(themeSource, /--primary: #6c5fc7;/);
  assert.match(themeSource, /--sidebar: #e4ddef;/);
  assert.match(themeSource, /--sidebar-accent: #cec3f0;/);
  assert.match(themeSource, /--sidebar-border: #c8bed5;/);
  assert.match(themeSource, /--sidebar-foreground: #30283a;/);
  assert.match(themeSource, /--chart-2: #e1567c;/);
  assert.doesNotMatch(themeSource, /--primary: #1d4ed8;/);
});

test("shared controls and navigation use the compact Sentry hierarchy", () => {
  assert.match(buttonSource, /rounded-md border border-transparent/);
  assert.match(buttonSource, /hover:bg-\[#584ab8\]/);
  assert.doesNotMatch(buttonSource, /#0071e3/);
  assert.match(dashboardShellSource, /border-sidebar-border/);
  assert.match(dashboardShellSource, /dashboard-workspace-surface/);
  assert.match(dashboardShellSource, /bg-sidebar-accent/);
  assert.match(dashboardShellSource, /before:bg-sidebar-primary/);
  assert.doesNotMatch(dashboardShellSource, /rounded-md border border-transparent text-sidebar/);
  assert.doesNotMatch(projectSidebarBrandSource, /border border-transparent/);
  assert.match(
    themeSource,
    /@layer base \{\s+\* \{\s+box-sizing: border-box;\s+border-color: var\(--border\);/
  );
});

test("high-visibility entry and developer surfaces expose the theme", () => {
  assert.match(projectSelectSource, /bg-\[#21192b\]/);
  assert.match(projectSelectSource, /PROJECT MONITORING/);
  assert.match(sqlEditorSource, /bg-\[#181421\]/);
  assert.match(sqlEditorSource, />\s*Explore\s*</);
});
