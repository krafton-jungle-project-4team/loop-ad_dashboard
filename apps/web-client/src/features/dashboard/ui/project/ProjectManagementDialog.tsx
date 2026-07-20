import type { DashboardCreateProjectRequest, DashboardProject } from "@loopad/shared";
import { Alert, AlertDescription, AlertTitle } from "@loopad/ui/shadcn/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@loopad/ui/shadcn/alert-dialog";
import { Button } from "@loopad/ui/shadcn/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@loopad/ui/shadcn/dialog";
import { Field, FieldLabel } from "@loopad/ui/shadcn/field";
import { Input } from "@loopad/ui/shadcn/input";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Plus, Trash2 } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import {
  createDashboardProject,
  deleteDashboardProject,
  fetchDashboardProjects
} from "../../api/dashboard-api.js";
import { dashboardProjectsQueryKey } from "../../model/dashboard-query-keys.js";
import { clearCampaignOnboardingScope } from "../../model/campaign-onboarding-scope.js";
import {
  clearProjectTutorialPending,
  clearProjectSetupProgress,
  initializeProjectSetupProgress,
  markProjectTutorialPending
} from "../../model/project-setup-progress.js";
import { useBeforeUnloadWarning } from "../shared/use-before-unload-warning.js";

type ProjectFormState = {
  domain: string;
  project_name: string;
};

const emptyProjectForm: ProjectFormState = {
  domain: "",
  project_name: ""
};

export function ProjectManagementDialog({
  currentProjectId,
  trigger
}: {
  currentProjectId?: string;
  trigger: ReactNode;
}) {
  const [form, setForm] = useState<ProjectFormState>(emptyProjectForm);
  const [open, setOpen] = useState(false);
  const [pendingDeleteProjectId, setPendingDeleteProjectId] = useState<string | null>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const projectsQuery = useQuery({
    enabled: open,
    queryFn: ({ signal }) => fetchDashboardProjects(signal),
    queryKey: dashboardProjectsQueryKey()
  });
  const projects = projectsQuery.data?.projects ?? [];
  const pendingDeleteProject =
    projects.find((project) => project.project_id === pendingDeleteProjectId) ?? null;
  const hasUnsavedProject = Boolean(form.project_name.trim() || form.domain.trim());

  useBeforeUnloadWarning(open && hasUnsavedProject);
  const createProjectMutation = useMutation({
    mutationFn: createDashboardProject,
    onSuccess: async (project) => {
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      initializeProjectSetupProgress(project.project_id);
      markProjectTutorialPending(project.project_id);
      setForm(emptyProjectForm);
      setPendingDeleteProjectId(null);
      setOpen(false);
      void navigate({
        params: { projectId: project.project_id, tabPath: "sdk" },
        to: "/dashboard/$projectId/$tabPath"
      });
    }
  });
  const deleteProjectMutation = useMutation({
    mutationFn: deleteDashboardProject,
    onSuccess: async (_result, deletedProjectId) => {
      clearCampaignOnboardingScope(deletedProjectId);
      clearProjectSetupProgress(deletedProjectId);
      clearProjectTutorialPending(deletedProjectId);
      const projectList = await fetchDashboardProjects();
      queryClient.setQueryData(dashboardProjectsQueryKey(), projectList);
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setPendingDeleteProjectId(null);

      if (deletedProjectId === currentProjectId) {
        void navigate({ replace: true, to: "/" });
      }
    }
  });

  function handleProjectInputChange(field: keyof ProjectFormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleCreateProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const requestBody: DashboardCreateProjectRequest = {
      domain: form.domain.trim(),
      project_name: form.project_name.trim(),
      status: "active"
    };

    createProjectMutation.mutate(requestBody);
  }

  function requestProjectDelete(project: DashboardProject) {
    setPendingDeleteProjectId(project.project_id);
  }

  return (
    <Dialog
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          setPendingDeleteProjectId(null);
        }
      }}
      open={open}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>프로젝트 관리</DialogTitle>
          <DialogDescription>프로젝트를 만들거나 삭제할 수 있어요.</DialogDescription>
        </DialogHeader>

        <form
          className="grid gap-3 rounded-lg border border-border p-3"
          onSubmit={handleCreateProject}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="project-name">프로젝트 이름</FieldLabel>
              <Input
                autoComplete="off"
                id="project-name"
                onChange={(event) => handleProjectInputChange("project_name", event.target.value)}
                required
                value={form.project_name}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="project-domain">도메인</FieldLabel>
              <Input
                autoComplete="off"
                id="project-domain"
                onChange={(event) => handleProjectInputChange("domain", event.target.value)}
                required
                value={form.domain}
              />
            </Field>
          </div>

          {createProjectMutation.isError ? (
            <Alert variant="destructive">
              <AlertTitle>프로젝트를 만들 수 없어요</AlertTitle>
              <AlertDescription>
                프로젝트 이름과 도메인을 확인한 뒤 다시 시도해 주세요.
              </AlertDescription>
            </Alert>
          ) : null}

          <div className="flex justify-end">
            <Button disabled={createProjectMutation.isPending} type="submit">
              <Plus />
              {createProjectMutation.isPending ? "프로젝트 만드는 중…" : "프로젝트 만들기"}
            </Button>
          </div>
        </form>

        <div className="grid gap-2">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-foreground">프로젝트 목록</h3>
            {projectsQuery.isFetching ? (
              <span className="text-xs text-muted-foreground" role="status">
                프로젝트 목록 불러오는 중…
              </span>
            ) : null}
          </div>

          <div className="max-h-64 overflow-y-auto rounded-lg border border-border">
            {projectsQuery.isError ? (
              <Alert className="m-3" variant="destructive">
                <AlertTitle>프로젝트 목록을 불러올 수 없어요</AlertTitle>
                <AlertDescription className="grid gap-3">
                  <p>네트워크 연결을 확인한 뒤 프로젝트 목록을 다시 불러와 주세요.</p>
                  <Button
                    className="w-fit"
                    onClick={() => void projectsQuery.refetch()}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    프로젝트 목록 다시 불러오기
                  </Button>
                </AlertDescription>
              </Alert>
            ) : projects.length > 0 ? (
              <div className="divide-y divide-black/10">
                {projects.map((project) => {
                  const isCurrentProject = project.project_id === currentProjectId;
                  const isDeleting =
                    deleteProjectMutation.isPending &&
                    deleteProjectMutation.variables === project.project_id;
                  return (
                    <div
                      className="grid gap-3 p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                      key={project.project_id}
                    >
                      <div className="min-w-0">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="truncate text-sm font-semibold text-foreground">
                            {project.project_name}
                          </span>
                          {isCurrentProject ? (
                            <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-primary">
                              현재
                            </span>
                          ) : null}
                        </div>
                        <p className="truncate text-xs text-muted-foreground">{project.domain}</p>
                      </div>
                      <Button
                        aria-label={`${project.project_name} 프로젝트 삭제`}
                        disabled={isDeleting}
                        onClick={() => requestProjectDelete(project)}
                        size="icon-sm"
                        type="button"
                        variant="destructive"
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-3 text-sm text-muted-foreground">아직 만든 프로젝트가 없어요.</div>
            )}
          </div>

          {deleteProjectMutation.isError ? (
            <Alert variant="destructive">
              <AlertTitle>프로젝트를 삭제할 수 없어요</AlertTitle>
              <AlertDescription>
                프로젝트가 목록에 남아 있는지 확인한 뒤 다시 시도해 주세요.
              </AlertDescription>
            </Alert>
          ) : null}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              닫기
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
      <AlertDialog
        onOpenChange={(nextOpen) => {
          if (!nextOpen && !deleteProjectMutation.isPending) {
            setPendingDeleteProjectId(null);
          }
        }}
        open={Boolean(pendingDeleteProject)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>프로젝트를 삭제할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDeleteProject?.project_name} 프로젝트와 연결된 캠페인, 프로모션, 고객군,
              실험이 모두 사라지고 되돌릴 수 없어요.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteProjectMutation.isPending}>취소</AlertDialogCancel>
            <AlertDialogAction
              disabled={!pendingDeleteProject || deleteProjectMutation.isPending}
              onClick={(event) => {
                event.preventDefault();
                if (pendingDeleteProject) {
                  deleteProjectMutation.mutate(pendingDeleteProject.project_id);
                }
              }}
              variant="destructive"
            >
              {deleteProjectMutation.isPending ? "프로젝트 삭제 중…" : "프로젝트 삭제"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
