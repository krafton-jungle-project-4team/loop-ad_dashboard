import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const projectApiSource = readFileSync(
  new URL("../src/features/dashboard/api/project-api.ts", import.meta.url),
  "utf8"
);
const projectManagementSource = readFileSync(
  new URL("../src/features/dashboard/ui/project/ProjectManagementDialog.tsx", import.meta.url),
  "utf8"
);
const projectNameEditSource = readFileSync(
  new URL("../src/features/dashboard/ui/project/ProjectNameEditDialog.tsx", import.meta.url),
  "utf8"
);
const projectSidebarSource = readFileSync(
  new URL("../src/features/dashboard/ui/project/ProjectSidebarBrand.tsx", import.meta.url),
  "utf8"
);

test("project name updates use the shared PATCH contract", () => {
  assert.match(projectApiSource, /DashboardUpdateProjectRequestSchema/);
  assert.match(projectApiSource, /type DashboardUpdateProjectRequest/);
  assert.match(projectApiSource, /`\$\{PROJECTS_PATH\}\/\$\{encodeURIComponent\(projectId\)\}`/);
  assert.match(
    projectApiSource,
    /body: DashboardUpdateProjectRequestSchema\.parse\(requestBody\),\s+method: "PATCH"/
  );
});

test("project management edits only a project's name", () => {
  assert.match(projectManagementSource, /<Pencil data-icon="inline-start" \/>/);
  assert.match(projectManagementSource, /setEditingProject\(project\)/);
  assert.match(projectManagementSource, /<ProjectNameEditDialog/);
  assert.match(projectNameEditSource, /useState\(project\.project_name\)/);
  assert.match(
    projectNameEditSource,
    /updateDashboardProject\(project\.project_id, \{ project_name: trimmedProjectName \}\)/
  );
  assert.match(projectNameEditSource, /<DialogTitle>프로젝트 이름 수정<\/DialogTitle>/);
  assert.match(projectNameEditSource, /<FieldLabel htmlFor="edit-project-name">프로젝트 이름/);
  assert.doesNotMatch(projectNameEditSource, /htmlFor="edit-project-domain"/);
});

test("project name saving rejects blank, unchanged, and pending drafts", () => {
  assert.match(projectNameEditSource, /const trimmedProjectName = projectName\.trim\(\)/);
  assert.match(
    projectNameEditSource,
    /Boolean\(trimmedProjectName\) && isDirty && !updateProjectMutation\.isPending/
  );
  assert.match(projectNameEditSource, /<Button disabled=\{!canSave\} type="submit">/);
  assert.match(projectNameEditSource, /useBeforeUnloadWarning\(isDirty\)/);
});

test("a successful project edit replaces the projects cache immediately", () => {
  assert.match(
    projectNameEditSource,
    /queryClient\.setQueryData<DashboardProjectList>\([\s\S]*dashboardProjectsQueryKey\(\)/
  );
  assert.match(
    projectNameEditSource,
    /currentProject\.project_id === updatedProject\.project_id[\s\S]*\? updatedProject[\s\S]*: currentProject/
  );
  assert.match(
    projectNameEditSource,
    /\.sort\(\(leftProject, rightProject\) =>[\s\S]*rightProject\.updated_at\.localeCompare\(leftProject\.updated_at\)/
  );
  assert.doesNotMatch(
    projectNameEditSource,
    /updateProjectMutation[\s\S]*invalidateQueries\(\{ queryKey: \["dashboard"\] \}\)/
  );
  assert.match(projectNameEditSource, /<AlertTitle>프로젝트 이름을 저장할 수 없어요<\/AlertTitle>/);
});

test("closing project name editing restores focus to its edit button", () => {
  assert.match(projectManagementSource, /const editTriggerRef = useRef<HTMLButtonElement \| null>/);
  assert.match(projectManagementSource, /editTriggerRef\.current = event\.currentTarget/);
  assert.match(
    projectManagementSource,
    /requestAnimationFrame\(\(\) => editTriggerRef\.current\?\.focus\(\)\)/
  );
  assert.match(
    projectManagementSource,
    /<ProjectNameEditDialog onClose=\{closeProjectEdit\} project=\{editingProject\}/
  );
});

test("project domains stay in creation and management but not in the sidebar", () => {
  assert.match(projectManagementSource, /<FieldLabel htmlFor="project-domain">도메인/);
  assert.match(projectManagementSource, /\{project\.domain\}/);
  assert.doesNotMatch(projectSidebarSource, /projectDescription|currentProject\?\.domain/);
  assert.match(projectSidebarSource, /\{projectName\}/);
});
