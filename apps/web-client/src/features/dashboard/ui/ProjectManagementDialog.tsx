import type { DashboardCreateProjectRequest, DashboardProject } from "@loopad/shared";
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
import { Link, useNavigate } from "@tanstack/react-router";
import { Plus, Trash2 } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import {
  createDashboardProject,
  deleteDashboardProject,
  fetchDashboardProjects
} from "../api/dashboard-api.js";
import { dashboardProjectsQueryKey } from "../model/dashboard-query-keys.js";

type ProjectFormState = {
  domain: string;
  project_name: string;
};

const emptyProjectForm: ProjectFormState = {
  domain: "hotel-booking.local",
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
  const createProjectMutation = useMutation({
    mutationFn: createDashboardProject,
    onSuccess: async (project) => {
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setForm(emptyProjectForm);
      setPendingDeleteProjectId(null);
      setOpen(false);
      void navigate({
        params: { projectId: project.project_id, tabPath: "main" },
        to: "/dashboard/$projectId/$tabPath"
      });
    }
  });
  const deleteProjectMutation = useMutation({
    mutationFn: deleteDashboardProject,
    onSuccess: async (_result, deletedProjectId) => {
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

  function handleDeleteProject(project: DashboardProject) {
    if (projects.length <= 1) {
      return;
    }

    if (pendingDeleteProjectId === project.project_id) {
      deleteProjectMutation.mutate(project.project_id);
      return;
    }

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
          <DialogDescription>대시보드에서 사용할 프로젝트를 생성하거나 삭제합니다.</DialogDescription>
        </DialogHeader>

        <form
          className="grid gap-3 rounded-lg border border-black/10 p-3"
          onSubmit={handleCreateProject}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="project-name">프로젝트 이름</FieldLabel>
              <Input
                autoComplete="off"
                id="project-name"
                onChange={(event) =>
                  handleProjectInputChange("project_name", event.target.value)
                }
                placeholder="데모 호텔"
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
            <p className="text-sm text-destructive">
              {toErrorMessage(createProjectMutation.error)}
            </p>
          ) : null}

          <div className="flex justify-end">
            <Button disabled={createProjectMutation.isPending} type="submit">
              <Plus />
              {createProjectMutation.isPending ? "생성 중" : "프로젝트 생성"}
            </Button>
          </div>
        </form>

        <div className="grid gap-2">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-[#1d1d1f]">프로젝트 목록</h3>
            {projectsQuery.isFetching ? (
              <span className="text-xs text-muted-foreground">불러오는 중</span>
            ) : null}
          </div>

          <div className="max-h-64 overflow-y-auto rounded-lg border border-black/10">
            {projectsQuery.isError ? (
              <div className="p-3 text-sm text-destructive">
                {toErrorMessage(projectsQuery.error)}
              </div>
            ) : projects.length > 0 ? (
              <div className="divide-y divide-black/10">
                {projects.map((project) => {
                  const isCurrentProject = project.project_id === currentProjectId;
                  const isDeleting =
                    deleteProjectMutation.isPending &&
                    deleteProjectMutation.variables === project.project_id;
                  const isPendingDelete = pendingDeleteProjectId === project.project_id;
                  const deleteDisabled = projects.length <= 1 || isDeleting;

                  return (
                    <div
                      className="grid gap-3 p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                      key={project.project_id}
                    >
                      <div className="min-w-0">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="truncate text-sm font-semibold text-[#1d1d1f]">
                            {project.project_name}
                          </span>
                          {isCurrentProject ? (
                            <span className="rounded-full bg-[#0066cc]/10 px-2 py-0.5 text-xs font-semibold text-[#0066cc]">
                              현재
                            </span>
                          ) : null}
                        </div>
                        <p className="truncate text-xs text-muted-foreground">{project.domain}</p>
                      </div>
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          asChild
                          size="sm"
                          variant={isCurrentProject ? "secondary" : "outline"}
                        >
                          <Link
                            params={{ projectId: project.project_id, tabPath: "main" }}
                            to="/dashboard/$projectId/$tabPath"
                          >
                            열기
                          </Link>
                        </Button>
                        <Button
                          aria-label={`${project.project_name} 삭제`}
                          disabled={deleteDisabled}
                          onClick={() => handleDeleteProject(project)}
                          size={isPendingDelete ? "sm" : "icon-sm"}
                          type="button"
                          variant="destructive"
                        >
                          {isPendingDelete ? "삭제 확인" : <Trash2 />}
                        </Button>
                        {isPendingDelete ? (
                          <Button
                            onClick={() => setPendingDeleteProjectId(null)}
                            size="sm"
                            type="button"
                            variant="ghost"
                          >
                            취소
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-3 text-sm text-muted-foreground">등록된 프로젝트가 없습니다.</div>
            )}
          </div>

          {deleteProjectMutation.isError ? (
            <p className="text-sm text-destructive">
              {toErrorMessage(deleteProjectMutation.error)}
            </p>
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
    </Dialog>
  );
}

function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "요청을 처리하지 못했습니다.";
}
