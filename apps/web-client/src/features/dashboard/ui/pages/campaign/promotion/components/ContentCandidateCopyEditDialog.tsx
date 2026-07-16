import type {
  DashboardContentCandidate,
  DashboardUpdateContentCandidateCopyRequest
} from "@loopad/shared";
import { Alert, AlertDescription, AlertTitle } from "@loopad/ui/shadcn/alert";
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
import { Field, FieldGroup, FieldLabel } from "@loopad/ui/shadcn/field";
import { Input } from "@loopad/ui/shadcn/input";
import { Spinner } from "@loopad/ui/shadcn/spinner";
import { Textarea } from "@loopad/ui/shadcn/textarea";
import { Pencil } from "lucide-react";
import { useState, type FormEvent } from "react";

export function ContentCandidateCopyEditDialog({
  candidate,
  isPending,
  onSave
}: {
  candidate: DashboardContentCandidate;
  isPending: boolean;
  onSave: (request: DashboardUpdateContentCandidateCopyRequest) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(() => contentCandidateCopyForm(candidate));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleOpenChange = (nextOpen: boolean) => {
    if (isPending && !nextOpen) {
      return;
    }
    if (nextOpen) {
      setForm(contentCandidateCopyForm(candidate));
      setErrorMessage(null);
    }
    setOpen(nextOpen);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    try {
      await onSave(form);
      setOpen(false);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "텍스트를 저장하지 못했어요.");
    }
  };

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogTrigger asChild>
        <Button disabled={candidate.status !== "draft" || isPending} size="sm" variant="outline">
          <Pencil data-icon="inline-start" />
          텍스트 수정
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <form className="contents" onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>광고 텍스트 수정</DialogTitle>
            <DialogDescription>
              저장하면 HTML 미리보기와 실제 광고에 수정한 내용이 반영돼요.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor={`${candidate.content_id}-headline`}>
                {candidate.channel === "email" ? "이메일 제목" : "제목"}
              </FieldLabel>
              <Input
                autoFocus
                disabled={isPending}
                id={`${candidate.content_id}-headline`}
                maxLength={200}
                onChange={(event) =>
                  setForm((current) => ({ ...current, headline: event.target.value }))
                }
                required
                value={form.headline}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`${candidate.content_id}-body`}>본문</FieldLabel>
              <Textarea
                disabled={isPending}
                id={`${candidate.content_id}-body`}
                maxLength={5000}
                onChange={(event) =>
                  setForm((current) => ({ ...current, body: event.target.value }))
                }
                required
                rows={6}
                value={form.body}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`${candidate.content_id}-cta`}>버튼 문구</FieldLabel>
              <Input
                disabled={isPending}
                id={`${candidate.content_id}-cta`}
                maxLength={100}
                onChange={(event) =>
                  setForm((current) => ({ ...current, cta: event.target.value }))
                }
                required
                value={form.cta}
              />
            </Field>
          </FieldGroup>
          {errorMessage ? (
            <Alert variant="destructive">
              <AlertTitle>텍스트를 저장하지 못했어요</AlertTitle>
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          ) : null}
          <DialogFooter>
            <DialogClose asChild>
              <Button disabled={isPending} type="button" variant="outline">
                취소
              </Button>
            </DialogClose>
            <Button disabled={isPending} type="submit">
              {isPending ? <Spinner aria-hidden="true" data-icon="inline-start" /> : null}
              {isPending ? "저장 중…" : "수정 내용 저장"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function contentCandidateCopyForm(
  candidate: DashboardContentCandidate
): DashboardUpdateContentCandidateCopyRequest {
  return {
    headline: candidate.channel === "email" ? (candidate.subject ?? "") : (candidate.title ?? ""),
    body: candidate.body ?? "",
    cta: candidate.cta ?? ""
  };
}
