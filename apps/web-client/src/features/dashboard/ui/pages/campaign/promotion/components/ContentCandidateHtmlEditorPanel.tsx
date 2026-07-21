import { Alert, AlertDescription, AlertTitle } from "@loopad/ui/shadcn/alert";
import { Badge } from "@loopad/ui/shadcn/badge";
import { Button } from "@loopad/ui/shadcn/button";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@loopad/ui/shadcn/resizable";
import { Skeleton } from "@loopad/ui/shadcn/skeleton";
import { Spinner } from "@loopad/ui/shadcn/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@loopad/ui/shadcn/tabs";
import { useIsMobile } from "@loopad/ui/shadcn/use-mobile";
import { RotateCcw } from "lucide-react";
import { lazy, Suspense } from "react";
import type { HtmlValidationStatus } from "../useContentCandidateHtmlEditor.js";
import { CreativeHtmlPreview } from "./CreativeHtmlPreview.js";

const CreativeHtmlCodeEditor = lazy(() => import("./CreativeHtmlCodeEditor.js"));

export function ContentCandidateHtmlEditorPanel({
  disabled,
  draftHtml,
  isLoading,
  loadError,
  onChange,
  onReset,
  onRetry,
  operationError,
  previewHtml,
  validationError,
  validationStatus
}: {
  disabled: boolean;
  draftHtml: string;
  isLoading: boolean;
  loadError: string | null;
  onChange: (html: string) => void;
  onReset: () => void;
  onRetry: () => void;
  operationError: string | null;
  previewHtml: string;
  validationError: string | null;
  validationStatus: HtmlValidationStatus;
}) {
  const isMobile = useIsMobile();

  if (loadError) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center p-4 sm:p-6">
        <Alert className="max-w-lg" variant="destructive">
          <AlertTitle>HTML을 불러오지 못했어요</AlertTitle>
          <AlertDescription className="grid gap-3">
            <span>{loadError}</span>
            <Button className="w-fit" onClick={onRetry} size="sm" type="button" variant="outline">
              다시 시도
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoading) {
    return <HtmlEditorLoadingState />;
  }

  if (isMobile) {
    return (
      <Tabs className="h-full min-h-0 gap-3 p-3" defaultValue="code">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="code">HTML/CSS</TabsTrigger>
          <TabsTrigger value="preview">미리보기</TabsTrigger>
        </TabsList>
        <TabsContent
          className="h-full min-h-0 overflow-hidden data-[state=inactive]:hidden"
          forceMount
          value="code"
        >
          <HtmlCodePane
            disabled={disabled}
            draftHtml={draftHtml}
            onChange={onChange}
            onReset={onReset}
            operationError={operationError}
            validationError={validationError}
            validationStatus={validationStatus}
          />
        </TabsContent>
        <TabsContent
          className="h-full min-h-0 overflow-hidden data-[state=inactive]:hidden"
          forceMount
          value="preview"
        >
          <CreativeHtmlPreview
            className="h-full"
            sanitizedHtml={previewHtml}
            statusLabel={previewStatusLabel(validationStatus, Boolean(previewHtml))}
            title="광고 HTML 미리보기"
          />
        </TabsContent>
      </Tabs>
    );
  }

  return (
    <ResizablePanelGroup
      className="h-full min-h-0 overflow-hidden border-y bg-card"
      id="content-candidate-html-editor"
      orientation="horizontal"
    >
      <ResizablePanel className="min-w-0 overflow-hidden p-4" defaultSize="44%" minSize="32%">
        <HtmlCodePane
          disabled={disabled}
          draftHtml={draftHtml}
          onChange={onChange}
          onReset={onReset}
          operationError={operationError}
          validationError={validationError}
          validationStatus={validationStatus}
        />
      </ResizablePanel>
      <ResizableHandle className="transition-colors hover:bg-primary/50" withHandle />
      <ResizablePanel className="min-w-0 overflow-hidden p-4" defaultSize="56%" minSize="32%">
        <CreativeHtmlPreview
          className="h-full"
          sanitizedHtml={previewHtml}
          statusLabel={previewStatusLabel(validationStatus, Boolean(previewHtml))}
          title="광고 HTML 미리보기"
        />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}

function HtmlCodePane({
  disabled,
  draftHtml,
  onChange,
  onReset,
  operationError,
  validationError,
  validationStatus
}: {
  disabled: boolean;
  draftHtml: string;
  onChange: (html: string) => void;
  onReset: () => void;
  operationError: string | null;
  validationError: string | null;
  validationStatus: HtmlValidationStatus;
}) {
  return (
    <section aria-label="HTML 및 CSS 코드 편집" className="flex h-full min-h-0 flex-col gap-3">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <h2 className="text-sm font-semibold">HTML/CSS 코드</h2>
          <ValidationBadge status={validationStatus} />
          <span className="text-xs tabular-nums text-muted-foreground">
            {draftHtml.length.toLocaleString()}자
          </span>
        </div>
        <Button disabled={disabled} onClick={onReset} size="sm" type="button" variant="ghost">
          <RotateCcw aria-hidden="true" data-icon="inline-start" />
          저장본으로 복원
        </Button>
      </header>
      <div className="min-h-64 flex-1">
        <Suspense fallback={<Skeleton className="h-full min-h-64 w-full" />}>
          <CreativeHtmlCodeEditor
            ariaLabel="광고 HTML 및 CSS 코드"
            disabled={disabled}
            onChange={onChange}
            value={draftHtml}
          />
        </Suspense>
      </div>
      {validationError || operationError ? (
        <Alert variant="destructive">
          <AlertTitle>
            {operationError ? "HTML을 저장하지 못했어요" : "HTML 검증이 필요해요"}
          </AlertTitle>
          <AlertDescription>{operationError ?? validationError}</AlertDescription>
        </Alert>
      ) : (
        <p className="text-xs leading-5 text-muted-foreground">
          변경 내용은 서버 안전성 검증을 통과한 뒤 오른쪽 미리보기에 반영돼요.
        </p>
      )}
    </section>
  );
}

function ValidationBadge({ status }: { status: HtmlValidationStatus }) {
  if (status === "pending") {
    return (
      <Badge variant="secondary">
        <Spinner aria-hidden="true" data-icon="inline-start" />
        검증 중
      </Badge>
    );
  }
  if (status === "invalid") {
    return <Badge variant="destructive">수정 필요</Badge>;
  }
  if (status === "valid") {
    return <Badge variant="secondary">검증 완료</Badge>;
  }
  return <Badge variant="outline">불러오는 중</Badge>;
}

function previewStatusLabel(status: HtmlValidationStatus, hasPreview: boolean) {
  if (status === "valid") {
    return "검증된 미리보기";
  }
  if (status === "invalid") {
    return hasPreview ? "마지막 정상 미리보기" : "검증 실패 · 미리보기 없음";
  }
  if (status === "pending") {
    return hasPreview ? "마지막 정상 미리보기" : "안전성 검증 중";
  }
  return "미리보기 준비 중";
}

function HtmlEditorLoadingState() {
  return (
    <div
      aria-busy="true"
      aria-label="HTML 편집기 불러오는 중"
      className="grid h-full min-h-0 gap-4 p-4 md:grid-cols-2"
    >
      <Skeleton className="min-h-80" />
      <Skeleton className="min-h-80" />
    </div>
  );
}
