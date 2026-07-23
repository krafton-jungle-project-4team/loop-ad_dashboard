import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dashboardLayoutSource = readFileSync(
  new URL("../src/routes/dashboard.$projectId.tsx", import.meta.url),
  "utf8"
);
const mainPageSource = readFileSync(
  new URL("../src/features/dashboard/ui/pages/main/MainPage.tsx", import.meta.url),
  "utf8"
);

test("statistics campaign names open the campaign performance view", () => {
  assert.match(
    mainPageSource,
    /campaignView: "performance",\s+selectedCampaignId: campaign\.campaign_id/
  );
  assert.doesNotMatch(
    mainPageSource,
    /campaignView: "overview",\s+selectedCampaignId: campaign\.campaign_id/
  );
});

test("dashboard routes verify the project before mounting project features", () => {
  assert.match(
    dashboardLayoutSource,
    /<DashboardProjectExistenceGate[\s\S]*?<ProjectOnboardingProvider/
  );
  assert.match(
    dashboardLayoutSource,
    /projectsQuery\.data\?\.projects\.some\([\s\S]*?project\.project_id === projectId/
  );
  assert.match(dashboardLayoutSource, /프로젝트를 찾지 못했어요/);
  assert.match(dashboardLayoutSource, /프로젝트 선택으로 돌아가기/);
});
