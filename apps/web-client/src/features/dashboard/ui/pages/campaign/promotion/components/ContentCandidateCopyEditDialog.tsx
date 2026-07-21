import type {
  DashboardContentCandidate,
  DashboardUpdateContentCandidateCopyRequest
} from "@loopad/shared";
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
import { cn } from "@loopad/ui/shadcn/utils";
import { Pencil, Save, WandSparkles } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useBeforeUnloadWarning } from "../../../../shared/use-before-unload-warning.js";
import {
  type ContentCandidateHtmlEditorActions,
  useContentCandidateHtmlEditor
} from "../useContentCandidateHtmlEditor.js";
import { ContentCandidateHtmlEditorPanel } from "./ContentCandidateHtmlEditorPanel.js";

type EditMode = "ai" | "code" | "copy";
type DiscardIntent = { kind: "close" } | { kind: "mode"; mode: EditMode };

export function ContentCandidateCopyEditDialog({
  candidate,
  contentCandidateHtmlEditor,
  isPending,
  isRevisionPending,
  onRevise,
  onSave
}: {
  candidate: DashboardContentCandidate;
  contentCandidateHtmlEditor: ContentCandidateHtmlEditorActions;
  isPending: boolean;
  isRevisionPending: boolean;
  onRevise: (feedback: string) => Promise<void>;
  onSave: (request: DashboardUpdateContentCandidateCopyRequest) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<EditMode>("copy");
  const [form, setForm] = useState(() => contentCandidateCopyForm(candidate));
  const [feedback, setFeedback] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [discardIntent, setDiscardIntent] = useState<DiscardIntent | null>(null);
  const identity = {
    contentId: candidate.content_id,
    promotionId: candidate.promotion_id,
    segmentId: candidate.segment_id
  };
  const htmlEditor = useContentCandidateHtmlEditor({
    active: open && mode === "code",
    loadSource: (signal) => contentCandidateHtmlEditor.loadSource(identity, signal),
    previewHtml: (html, signal) => contentCandidateHtmlEditor.previewHtml(identity, html, signal),
    saveHtml: (request) => contentCandidateHtmlEditor.saveHtml(identity, request)
  });
  const pending =
    isPending ||
    isRevisionPending ||
    contentCandidateHtmlEditor.isSavePending ||
    htmlEditor.isSaving;

  useBeforeUnloadWarning(open && mode === "code" && htmlEditor.isDirty);

  const closeDialog = () => {
    setOpen(false);
    setDiscardIntent(null);
    htmlEditor.resetSession();
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setMode("copy");
      setForm(contentCandidateCopyForm(candidate));
      setFeedback("");
      setErrorMessage(null);
      setDiscardIntent(null);
      htmlEditor.resetSession();
      setOpen(true);
      return;
    }
    if (pending) {
      return;
    }
    if (mode === "code" && htmlEditor.isDirty) {
      setDiscardIntent({ kind: "close" });
      return;
    }
    closeDialog();
  };

  const handleModeChange = (value: string) => {
    if (!isEditMode(value) || value === mode || pending) {
      return;
    }
    setErrorMessage(null);
    if (mode === "code" && htmlEditor.isDirty) {
      setDiscardIntent({ kind: "mode", mode: value });
      return;
    }
    if (mode === "code") {
      htmlEditor.resetSession();
    }
    setMode(value);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (mode === "code") {
      return;
    }
    setErrorMessage(null);
    try {
      if (mode === "ai") {
        await onRevise(feedback);
      } else {
        await onSave(form);
      }
      closeDialog();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "광고를 수정하지 못했어요.");
    }
  };

  const handleHtmlSave = async () => {
    setErrorMessage(null);
    try {
      await htmlEditor.saveDraft();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "HTML을 저장하지 못했어요.");
    }
  };

  const confirmDiscard = () => {
    if (!discardIntent) {
      return;
    }
    const intent = discardIntent;
    htmlEditor.resetSession();
    setErrorMessage(null);
    setDiscardIntent(null);
    if (intent.kind === "close") {
      setOpen(false);
      return;
    }
    setMode(intent.mode);
  };

  const isCodeMode = mode === "code";

  return (
    <>
      <Dialog onOpenChange={handleOpenChange} open={open}>
        <DialogTrigger asChild>
          <Button disabled={candidate.status !== "draft" || pending} size="sm" variant="outline">
            <Pencil data-icon="inline-start" />
            광고 수정
          </Button>
        </DialogTrigger>
        <DialogContent
          className={cn(
            "[interpolate-size:allow-keywords] transition-[width,max-width,height] duration-300 sm:max-w-xl",
            isCodeMode &&
              "h-[calc(100svh-2rem)] w-[calc(100vw-2rem)] max-w-none grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0 sm:h-[min(90svh,900px)] sm:w-[min(94vw,1440px)] sm:max-w-[min(94vw,1440px)]"
          )}
        >
          <form className="contents" onSubmit={handleSubmit}>
            <DialogHeader className={cn(isCodeMode && "px-5 pt-5 pr-12")}>
              <DialogTitle>광고 수정</DialogTitle>
              <DialogDescription>
                {isCodeMode
                  ? "HTML과 CSS를 직접 수정하고, 안전성 검증을 통과한 결과를 실제 화면 너비로 미리볼 수 있어요."
                  : "문구를 직접 바꾸거나 피드백을 남겨 광고 디자인 전체를 다시 만들 수 있어요."}
              </DialogDescription>
            </DialogHeader>
            <Tabs
              className={cn(isCodeMode && "min-h-0 gap-3 overflow-hidden")}
              onValueChange={handleModeChange}
              value={mode}
            >
              <TabsList
                className={cn(
                  "grid w-full grid-cols-3",
                  isCodeMode && "mx-5 mt-1 w-[calc(100%-2.5rem)] shrink-0"
                )}
              >
                <TabsTrigger value="copy">문구 직접 수정</TabsTrigger>
                <TabsTrigger value="ai">AI 디자인 수정</TabsTrigger>
                <TabsTrigger value="code">
                  <span className="hidden sm:inline">HTML/CSS 직접 수정</span>
                  <span className="sm:hidden">HTML/CSS</span>
                </TabsTrigger>
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
              <TabsContent className="min-h-0 overflow-hidden" value="code">
                <ContentCandidateHtmlEditorPanel
                  disabled={pending}
                  draftHtml={htmlEditor.draftHtml}
                  isLoading={htmlEditor.isLoading || !htmlEditor.isReady}
                  loadError={htmlEditor.loadError}
                  onChange={(html) => {
                    setErrorMessage(null);
                    htmlEditor.updateDraftHtml(html);
                  }}
                  onReset={() => {
                    setErrorMessage(null);
                    htmlEditor.resetDraft();
                  }}
                  onRetry={htmlEditor.retryLoad}
                  operationError={errorMessage}
                  previewHtml={htmlEditor.previewHtml}
                  validationError={htmlEditor.validationError}
                  validationStatus={htmlEditor.validationStatus}
                />
              </TabsContent>
            </Tabs>
            {!isCodeMode && errorMessage ? (
              <Alert variant="destructive">
                <AlertTitle>광고를 수정하지 못했어요</AlertTitle>
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            ) : null}
            <DialogFooter className={cn(isCodeMode && "mx-0 mb-0 rounded-none px-5 py-3")}>
              <Button
                disabled={pending}
                onClick={() => handleOpenChange(false)}
                type="button"
                variant="outline"
              >
                {isCodeMode ? "닫기" : "취소"}
              </Button>
              {isCodeMode ? (
                <Button
                  disabled={pending || !htmlEditor.canSave}
                  onClick={() => void handleHtmlSave()}
                  type="button"
                >
                  {pending ? (
                    <Spinner aria-hidden="true" data-icon="inline-start" />
                  ) : (
                    <Save aria-hidden="true" data-icon="inline-start" />
                  )}
                  {pending ? "저장 중…" : htmlEditor.isDirty ? "HTML 저장" : "저장됨"}
                </Button>
              ) : (
                <Button disabled={pending} type="submit">
                  {pending ? <Spinner aria-hidden="true" data-icon="inline-start" /> : null}
                  {!pending && mode === "ai" ? (
                    <WandSparkles aria-hidden="true" data-icon="inline-start" />
                  ) : null}
                  {!pending && mode === "copy" ? (
                    <Pencil aria-hidden="true" data-icon="inline-start" />
                  ) : null}
                  {pending
                    ? mode === "ai"
                      ? "광고 다시 만드는 중…"
                      : "저장 중…"
                    : mode === "ai"
                      ? "피드백 반영"
                      : "수정 내용 저장"}
                </Button>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <AlertDialog
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setDiscardIntent(null);
          }
        }}
        open={discardIntent !== null}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>저장하지 않은 HTML 변경사항이 있어요</AlertDialogTitle>
            <AlertDialogDescription>
              지금 나가면 직접 수정한 HTML과 CSS가 사라져요.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>계속 편집</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDiscard} variant="destructive">
              변경사항 버리기
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function isEditMode(value: string): value is EditMode {
  return value === "ai" || value === "code" || value === "copy";
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
