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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@loopad/ui/shadcn/tabs";
import { Textarea } from "@loopad/ui/shadcn/textarea";
import { Pencil, WandSparkles } from "lucide-react";
import { useState, type FormEvent } from "react";

export function ContentCandidateCopyEditDialog({
  candidate,
  isPending,
  isRevisionPending,
  onRevise,
  onSave
}: {
  candidate: DashboardContentCandidate;
  isPending: boolean;
  isRevisionPending: boolean;
  onRevise: (feedback: string) => Promise<void>;
  onSave: (request: DashboardUpdateContentCandidateCopyRequest) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"ai" | "copy">("copy");
  const [form, setForm] = useState(() => contentCandidateCopyForm(candidate));
  const [feedback, setFeedback] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const pending = isPending || isRevisionPending;

  const handleOpenChange = (nextOpen: boolean) => {
    if (pending && !nextOpen) {
      return;
    }
    if (nextOpen) {
      setMode("copy");
      setForm(contentCandidateCopyForm(candidate));
      setFeedback("");
      setErrorMessage(null);
    }
    setOpen(nextOpen);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    try {
      if (mode === "ai") {
        await onRevise(feedback);
      } else {
        await onSave(form);
      }
      setOpen(false);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "광고를 수정하지 못했어요.");
    }
  };

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogTrigger asChild>
        <Button disabled={candidate.status !== "draft" || pending} size="sm" variant="outline">
          <Pencil data-icon="inline-start" />
          광고 수정
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <form className="contents" onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>광고 수정</DialogTitle>
            <DialogDescription>
              문구를 직접 바꾸거나 피드백을 남겨 광고 디자인 전체를 다시 만들 수 있어요.
            </DialogDescription>
          </DialogHeader>
          <Tabs onValueChange={(value) => setMode(value as "ai" | "copy")} value={mode}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="copy">문구 직접 수정</TabsTrigger>
              <TabsTrigger value="ai">AI 디자인 수정</TabsTrigger>
            </TabsList>
            <TabsContent className="mt-5" value="copy">
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor={`${candidate.content_id}-headline`}>
                    {candidate.channel === "email" ? "이메일 제목" : "제목"}
                  </FieldLabel>
                  <Input
                    autoFocus
                    disabled={pending}
                    id={`${candidate.content_id}-headline`}
                    maxLength={200}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, headline: event.target.value }))
                    }
                    required={mode === "copy"}
                    value={form.headline}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor={`${candidate.content_id}-body`}>본문</FieldLabel>
                  <Textarea
                    disabled={pending}
                    id={`${candidate.content_id}-body`}
                    maxLength={5000}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, body: event.target.value }))
                    }
                    required={mode === "copy"}
                    rows={6}
                    value={form.body}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor={`${candidate.content_id}-cta`}>버튼 문구</FieldLabel>
                  <Input
                    disabled={pending}
                    id={`${candidate.content_id}-cta`}
                    maxLength={100}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, cta: event.target.value }))
                    }
                    required={mode === "copy"}
                    value={form.cta}
                  />
                </Field>
              </FieldGroup>
            </TabsContent>
            <TabsContent className="mt-5" value="ai">
              <Field>
                <FieldLabel htmlFor={`${candidate.content_id}-html-feedback`}>
                  디자인 피드백
                </FieldLabel>
                <Textarea
                  autoFocus
                  disabled={pending}
                  id={`${candidate.content_id}-html-feedback`}
                  maxLength={2000}
                  minLength={3}
                  onChange={(event) => setFeedback(event.target.value)}
                  placeholder="상단 여백을 줄이고 혜택과 예약 버튼이 더 먼저 보이게 바꿔줘"
                  required={mode === "ai"}
                  rows={8}
                  value={feedback}
                />
              </Field>
            </TabsContent>
          </Tabs>
          {errorMessage ? (
            <Alert variant="destructive">
              <AlertTitle>광고를 수정하지 못했어요</AlertTitle>
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          ) : null}
          <DialogFooter>
            <DialogClose asChild>
              <Button disabled={pending} type="button" variant="outline">
                취소
              </Button>
            </DialogClose>
            <Button disabled={pending} type="submit">
              {pending ? <Spinner aria-hidden="true" data-icon="inline-start" /> : null}
              {!pending && mode === "ai" ? (
                <WandSparkles aria-hidden="true" data-icon="inline-start" />
              ) : null}
              {pending
                ? mode === "ai"
                  ? "광고 다시 만드는 중…"
                  : "저장 중…"
                : mode === "ai"
                  ? "피드백 반영"
                  : "수정 내용 저장"}
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
