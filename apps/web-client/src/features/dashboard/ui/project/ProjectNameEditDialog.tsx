import type { DashboardProject, DashboardProjectList } from "@loopad/shared";
import { Alert, AlertDescription, AlertTitle } from "@loopad/ui/shadcn/alert";
import { Button } from "@loopad/ui/shadcn/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@loopad/ui/shadcn/dialog";
import { Field, FieldGroup, FieldLabel } from "@loopad/ui/shadcn/field";
import { Input } from "@loopad/ui/shadcn/input";
import { Spinner } from "@loopad/ui/shadcn/spinner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Save } from "lucide-react";
import { useState, type FormEvent } from "react";
import { updateDashboardProject } from "../../api/dashboard-api.js";
import { dashboardProjectsQueryKey } from "../../model/dashboard-query-keys.js";
import { useBeforeUnloadWarning } from "../shared/use-before-unload-warning.js";

export function ProjectNameEditDialog({
  onClose,
  project
}: {
  onClose: () => void;
  project: DashboardProject;
}) {
  const [projectName, setProjectName] = useState(project.project_name);
  const queryClient = useQueryClient();
  const trimmedProjectName = projectName.trim();
  const isDirty = trimmedProjectName !== project.project_name.trim();
  const updateProjectMutation = useMutation({
    mutationFn: () =>
      updateDashboardProject(project.project_id, { project_name: trimmedProjectName }),
    onSuccess: (updatedProject) => {
      queryClient.setQueryData<DashboardProjectList>(
        dashboardProjectsQueryKey(),
        (currentProjects) =>
          currentProjects
            ? {
                projects: currentProjects.projects
                  .map((currentProject) =>
                    currentProject.project_id === updatedProject.project_id
                      ? updatedProject
                      : currentProject
                  )
                  .sort((leftProject, rightProject) =>
                    rightProject.updated_at.localeCompare(leftProject.updated_at)
                  )
              }
            : currentProjects
      );
      onClose();
    }
  });
  const canSave = Boolean(trimmedProjectName) && isDirty && !updateProjectMutation.isPending;

  useBeforeUnloadWarning(isDirty);

  function closeDialog() {
    if (!updateProjectMutation.isPending) {
      onClose();
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (canSave) {
      updateProjectMutation.mutate();
    }
  }

  return (
    <Dialog onOpenChange={(nextOpen) => !nextOpen && closeDialog()} open>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>프로젝트 이름 수정</DialogTitle>
          <DialogDescription>프로젝트 이름만 바꿀 수 있어요.</DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="edit-project-name">프로젝트 이름</FieldLabel>
              <Input
                autoComplete="off"
                autoFocus
                disabled={updateProjectMutation.isPending}
                id="edit-project-name"
                maxLength={255}
                name="projectName"
                onChange={(event) => setProjectName(event.target.value)}
                required
                value={projectName}
              />
            </Field>
          </FieldGroup>

          {updateProjectMutation.isError ? (
            <Alert variant="destructive">
              <AlertTitle>프로젝트 이름을 저장할 수 없어요</AlertTitle>
              <AlertDescription>잠시 후 다시 시도해 주세요.</AlertDescription>
            </Alert>
          ) : null}

          <DialogFooter>
            <Button
              disabled={updateProjectMutation.isPending}
              onClick={closeDialog}
              type="button"
              variant="outline"
            >
              취소
            </Button>
            <Button disabled={!canSave} type="submit">
              {updateProjectMutation.isPending ? (
                <Spinner aria-hidden="true" data-icon="inline-start" />
              ) : (
                <Save aria-hidden="true" data-icon="inline-start" />
              )}
              {updateProjectMutation.isPending ? "저장 중…" : "저장"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
