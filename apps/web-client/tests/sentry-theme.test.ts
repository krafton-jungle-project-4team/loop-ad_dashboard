import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const themeSource = readFileSync(new URL("../src/index.css", import.meta.url), "utf8");
const buttonSource = readFileSync(
  new URL("../../../packages/ui/shadcn/button.tsx", import.meta.url),
  "utf8"
);
const badgeSource = readFileSync(
  new URL("../../../packages/ui/shadcn/badge.tsx", import.meta.url),
  "utf8"
);
const inputSource = readFileSync(
  new URL("../../../packages/ui/shadcn/input.tsx", import.meta.url),
  "utf8"
);
const tabsSource = readFileSync(
  new URL("../../../packages/ui/shadcn/tabs.tsx", import.meta.url),
  "utf8"
);
const sidebarSource = readFileSync(
  new URL("../../../packages/ui/shadcn/sidebar.tsx", import.meta.url),
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

function themeColor(name: string) {
  const match = themeSource.match(new RegExp(`--${name}:\\s*(#[0-9a-f]{6});`, "i"));
  assert.ok(match?.[1], `missing --${name} color token`);
  return match[1];
}

function contrastRatio(foreground: string, background: string) {
  const luminance = (hex: string) => {
    const channels = [1, 3, 5].map(
      (index) => Number.parseInt(hex.slice(index, index + 2), 16) / 255
    );
    const linear = channels.map((channel) =>
      channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
    );
    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
  };
  const foregroundLuminance = luminance(foreground);
  const backgroundLuminance = luminance(background);
  return (
    (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) /
    (Math.min(foregroundLuminance, backgroundLuminance) + 0.05)
  );
}

test("the global palette uses Make-inspired ink, violet, magenta, and cyan tokens", () => {
  assert.match(themeSource, /--background: #f8f7fa;/);
  assert.doesNotMatch(themeSource, /--workspace-highlight:/);
  assert.match(themeSource, /--foreground: #2b0a3d;/);
  assert.match(themeSource, /--primary: #8b2bd1;/);
  assert.match(themeSource, /--primary-active: #5f158f;/);
  assert.match(themeSource, /--input: #9e8fa5;/);
  assert.match(themeSource, /--brand-ink: #20052e;/);
  assert.match(themeSource, /--brand-magenta: #e62c8b;/);
  assert.match(themeSource, /--brand-cyan: #00aeb8;/);
  assert.match(themeSource, /--sidebar: #3a104f;/);
  assert.match(themeSource, /--sidebar-hover: #4b165f;/);
  assert.match(themeSource, /--sidebar-accent: #5a1c6e;/);
  assert.match(themeSource, /--sidebar-border: #522161;/);
  assert.match(themeSource, /--sidebar-foreground: #f9effb;/);
  assert.match(themeSource, /--chart-2: #e62c8b;/);
  assert.doesNotMatch(themeSource, /body::before/);
  assert.doesNotMatch(themeSource, /dashboard-workspace-surface[^}]*radial-gradient/s);
  assert.doesNotMatch(themeSource, /--primary: #1d4ed8;/);
});

test("Make interaction colors preserve readable text and visible control boundaries", () => {
  assert.ok(contrastRatio(themeColor("primary-foreground"), themeColor("primary")) >= 4.5);
  assert.ok(contrastRatio(themeColor("muted-foreground"), themeColor("background")) >= 4.5);
  assert.ok(contrastRatio(themeColor("destructive"), themeColor("card")) >= 4.5);
  assert.ok(contrastRatio(themeColor("sidebar-foreground"), themeColor("sidebar")) >= 4.5);
  assert.ok(contrastRatio(themeColor("input"), themeColor("card")) >= 3);
});

test("semantic feedback roles preserve readable text on their soft surfaces", () => {
  for (const role of ["info", "success", "warning", "danger"]) {
    assert.ok(
      contrastRatio(themeColor(`status-${role}-foreground`), themeColor(`status-${role}-soft`)) >=
        4.5,
      `${role} feedback text must remain readable`
    );
  }
});

test("shared controls and navigation use the compact Make hierarchy", () => {
  assert.match(buttonSource, /rounded-md border border-transparent/);
  assert.match(buttonSource, /hover:bg-primary-hover/);
  assert.match(buttonSource, /active:bg-primary-active/);
  assert.match(buttonSource, /border-input bg-card text-primary/);
  assert.match(badgeSource, /transition-\[color,background-color,border-color,box-shadow\]/);
  assert.match(badgeSource, /"status-info":/);
  assert.match(badgeSource, /"status-success":/);
  assert.match(badgeSource, /"status-warning":/);
  assert.match(badgeSource, /"status-danger":/);
  assert.doesNotMatch(badgeSource, /transition-all/);
  assert.match(inputSource, /hover:border-primary\/60/);
  assert.match(tabsSource, /hover:bg-accent\/55 hover:text-foreground/);
  assert.match(sidebarSource, /hover:bg-sidebar-hover/);
  assert.doesNotMatch(sidebarSource, /transition-all/);
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
  assert.match(projectSelectSource, /bg-\[#eee8f3\]/);
  assert.match(projectSelectSource, /PROJECT MONITORING/);
  assert.match(sqlEditorSource, /bg-brand-ink-deep/);
  assert.match(sqlEditorSource, />\s*Explore\s*</);
});

test("project cards center their content within the reserved card height", () => {
  assert.equal(projectSelectSource.match(/min-h-40 justify-center/g)?.length, 2);
});
