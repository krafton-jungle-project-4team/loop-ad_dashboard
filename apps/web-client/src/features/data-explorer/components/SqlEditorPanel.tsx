import type { DataExplorerSqlValidation } from "@loopad/shared";
import { Alert, AlertDescription, AlertTitle } from "@loopad/ui/shadcn/alert";
import { Textarea } from "@loopad/ui/shadcn/textarea";
import { useLayoutEffect, useRef, useState } from "react";

const MIN_EDITOR_HEIGHT = 400;
const MAX_EDITOR_HEIGHT = 560;

export function SqlEditorPanel({
  onSqlTextChange,
  sqlText,
  validation
}: {
  onSqlTextChange: (value: string) => void;
  sqlText: string;
  validation: DataExplorerSqlValidation | null;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [editorHeight, setEditorHeight] = useState(MIN_EDITOR_HEIGHT);
  const lineNumbers = Array.from(
    { length: Math.max(sqlText.split("\n").length, 22) },
    (_, index) => index + 1
  );

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    textarea.style.height = `${MIN_EDITOR_HEIGHT}px`;
    setEditorHeight(
      Math.min(MAX_EDITOR_HEIGHT, Math.max(MIN_EDITOR_HEIGHT, textarea.scrollHeight))
    );
  }, [sqlText]);

  return (
    <div className="min-w-0 overflow-hidden bg-white">
      <div className="relative overflow-hidden bg-[#fafafc]" style={{ height: editorHeight }}>
        <div className="pointer-events-none absolute left-0 top-0 grid w-10 gap-0 border-r border-black/10 py-3 text-right font-mono text-xs leading-5 text-muted-foreground">
          {lineNumbers.map((lineNumber) => (
            <span className="pr-2.5" key={lineNumber}>
              {lineNumber}
            </span>
          ))}
        </div>
        <Textarea
          className="resize-none overflow-auto rounded-none border-0 bg-transparent py-3 pl-12 pr-4 font-mono text-xs leading-5 text-[#1d1d1f] shadow-none outline-none ring-0 ![field-sizing:fixed] placeholder:text-muted-foreground focus-visible:ring-0"
          onChange={(event) => onSqlTextChange(event.target.value)}
          placeholder="SELECT ..."
          ref={textareaRef}
          spellCheck={false}
          style={{ height: editorHeight }}
          value={sqlText}
          wrap="off"
        />
      </div>

      {validation?.errors.length ? (
        <Alert className="m-4" variant="destructive">
          <AlertTitle>Validation error</AlertTitle>
          <AlertDescription>
            {validation.errors.map((error) => error.message).join(" ")}
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
