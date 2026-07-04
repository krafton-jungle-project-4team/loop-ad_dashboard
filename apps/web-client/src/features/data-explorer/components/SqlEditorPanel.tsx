import type { DataExplorerSqlValidation } from "@loopad/shared";
import { Alert, AlertDescription, AlertTitle } from "@loopad/ui/shadcn/alert";
import { Button } from "@loopad/ui/shadcn/button";
import { Textarea } from "@loopad/ui/shadcn/textarea";
import { Loader2, Play } from "lucide-react";
import type { ReactNode } from "react";

export function SqlEditorPanel({
  leftToolbar,
  isRunning,
  onRun,
  onSqlTextChange,
  rightToolbar,
  runDisabled,
  sqlText,
  validation
}: {
  leftToolbar?: ReactNode;
  isRunning: boolean;
  onRun: () => void;
  onSqlTextChange: (value: string) => void;
  rightToolbar?: ReactNode;
  runDisabled: boolean;
  sqlText: string;
  validation: DataExplorerSqlValidation | null;
}) {
  return (
    <div className="grid h-full min-h-0 min-w-0 grid-rows-[auto_minmax(0,1fr)_auto] bg-white">
      <div className="flex min-w-0 items-center justify-between gap-3 border-b border-black/10 px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          {leftToolbar}
          <h2 className="truncate text-sm font-semibold text-[#1d1d1f]">SQL editor</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button
            className="bg-[#0066cc] text-white hover:bg-[#0057ad]"
            disabled={runDisabled}
            onClick={onRun}
            size="sm"
            type="button"
          >
            {isRunning ? <Loader2 className="animate-spin" /> : <Play />}
            Run
          </Button>
          {rightToolbar}
        </div>
      </div>

      <div className="min-h-0 min-w-0 p-3">
        <Textarea
          className="h-full min-h-[180px] resize-none font-mono text-xs leading-5"
          onChange={(event) => onSqlTextChange(event.target.value)}
          placeholder="SELECT ..."
          spellCheck={false}
          value={sqlText}
          wrap="off"
        />
      </div>

      {validation?.errors.length ? (
        <Alert className="mx-3 mb-3" variant="destructive">
          <AlertTitle>SQL 확인 필요</AlertTitle>
          <AlertDescription>
            {validation.errors.map((error) => error.message).join(" ")}
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
