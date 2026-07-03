import type { DataExplorerSqlValidation } from "@loopad/shared";
import { Alert, AlertDescription, AlertTitle } from "@loopad/ui/shadcn/alert";
import { Textarea } from "@loopad/ui/shadcn/textarea";

export function SqlEditorPanel({
  onSqlTextChange,
  sqlText,
  validation
}: {
  onSqlTextChange: (value: string) => void;
  sqlText: string;
  validation: DataExplorerSqlValidation | null;
}) {
  return (
    <div className="min-w-0 border-b border-black/10 bg-white p-3">
      <Textarea
        className="h-80 resize-none font-mono text-xs leading-5"
        onChange={(event) => onSqlTextChange(event.target.value)}
        placeholder="SELECT ..."
        spellCheck={false}
        value={sqlText}
        wrap="off"
      />

      {validation?.errors.length ? (
        <Alert className="mt-3" variant="destructive">
          <AlertTitle>SQL 확인 필요</AlertTitle>
          <AlertDescription>
            {validation.errors.map((error) => error.message).join(" ")}
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
