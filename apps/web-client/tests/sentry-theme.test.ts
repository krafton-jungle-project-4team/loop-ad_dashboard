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

test("the global palette uses Make-inspired ink, violet, magenta, and cyan tokens", () => {
  assert.match(themeSource, /--background: #f8f7fa;/);
  assert.doesNotMatch(themeSource, /--workspace-highlight:/);
  assert.match(themeSource, /--foreground: #2b0a3d;/);
  assert.match(themeSource, /--primary: #8b2bd1;/);
  assert.match(themeSource, /--brand-ink: #20052e;/);
  assert.match(themeSource, /--brand-magenta: #e62c8b;/);
  assert.match(themeSource, /--brand-cyan: #00aeb8;/);
  assert.match(themeSource, /--sidebar: #3a104f;/);
  assert.match(themeSource, /--sidebar-accent: #5a1c6e;/);
  assert.match(themeSource, /--sidebar-border: #522161;/);
  assert.match(themeSource, /--sidebar-foreground: #f9effb;/);
  assert.match(themeSource, /--chart-2: #e62c8b;/);
  assert.doesNotMatch(themeSource, /body::before/);
  assert.doesNotMatch(themeSource, /dashboard-workspace-surface[^}]*radial-gradient/s);
  assert.doesNotMatch(themeSource, /--primary: #1d4ed8;/);
});

test("shared controls and navigation use the compact Make hierarchy", () => {
  assert.match(buttonSource, /rounded-md border border-transparent/);
  assert.match(buttonSource, /hover:bg-primary-hover/);
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

test("high-visibility entry and developer surfaces expose the Make palette", () => {
  assert.match(projectSelectSource, /bg-brand-ink/);
  assert.match(projectSelectSource, /PROJECT MONITORING/);
  assert.match(sqlEditorSource, /bg-brand-ink-deep/);
  assert.match(sqlEditorSource, />\s*Explore\s*</);
});
