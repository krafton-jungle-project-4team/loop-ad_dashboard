import type {
  DataExplorerSource,
  DataExplorerSourceId,
  DataExplorerSqlValidation
} from "@loopad/shared";
import { Alert, AlertDescription, AlertTitle } from "@loopad/ui/shadcn/alert";
import { Badge } from "@loopad/ui/shadcn/badge";
import { Button } from "@loopad/ui/shadcn/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@loopad/ui/shadcn/select";
import { Textarea } from "@loopad/ui/shadcn/textarea";
import { CheckCircle2, Loader2, Play } from "lucide-react";
import { Section } from "../../dashboard/ui/Section.js";

export function SqlEditorPanel({
  pending,
  onRun,
  onSourceIdChange,
  onSqlTextChange,
  sourceId,
  sources,
  sqlText,
  validation
}: {
  pending: boolean;
  onRun: () => void;
  onSourceIdChange: (sourceId: DataExplorerSourceId) => void;
  onSqlTextChange: (value: string) => void;
  sourceId: DataExplorerSourceId;
  sources: DataExplorerSource[];
  sqlText: string;
  validation: DataExplorerSqlValidation | null;
}) {
  const hasInvalidValidation = validation?.status === "invalid";

  return (
    <Section
      action={
        <div className="flex items-center gap-2">
          <Button disabled={pending || !sqlText.trim()} onClick={onRun} type="button">
            {pending ? <Loader2 className="animate-spin" /> : <Play />}
            실행
          </Button>
        </div>
      }
      contentClassName="grid gap-4"
      title="SQL 쿼리"
    >
      <div className="flex flex-wrap items-center gap-3">
        <Select
          onValueChange={(value) => onSourceIdChange(value as DataExplorerSourceId)}
          value={sourceId}
        >
          <SelectTrigger className="w-[260px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {sources.map((source) => (
              <SelectItem key={source.source_id} value={source.source_id}>
                {source.display_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {validation ? (
          <Badge variant={hasInvalidValidation ? "destructive" : "outline"}>
            {hasInvalidValidation ? "invalid" : "valid"}
          </Badge>
        ) : null}
        {validation?.status === "valid" ? (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <CheckCircle2 className="size-3.5 text-[#0066cc]" />
            limit {validation.effective_row_limit}, timeout {validation.effective_timeout_ms}ms
          </span>
        ) : null}
      </div>

      <Textarea
        className="min-h-72 resize-y font-mono text-sm leading-relaxed"
        onChange={(event) => onSqlTextChange(event.target.value)}
        placeholder="SELECT ..."
        spellCheck={false}
        value={sqlText}
      />

      {validation?.errors.length ? (
        <Alert variant="destructive">
          <AlertTitle>Validation error</AlertTitle>
          <AlertDescription>
            {validation.errors.map((error) => error.message).join(" ")}
          </AlertDescription>
        </Alert>
      ) : null}
    </Section>
  );
}
