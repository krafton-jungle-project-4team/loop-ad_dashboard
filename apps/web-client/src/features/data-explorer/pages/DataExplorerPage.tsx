import type {
  DataExplorerAiChatCurrentResult,
  DataExplorerObjectSummary,
  DataExplorerQueryRunMetadata,
  DataExplorerQueryRunResponse,
  DataExplorerSource,
  DataExplorerSourceId,
  DataExplorerSqlValidation
} from "@loopad/shared";
import { Alert, AlertDescription, AlertTitle } from "@loopad/ui/shadcn/alert";
import { Badge } from "@loopad/ui/shadcn/badge";
import { Button } from "@loopad/ui/shadcn/button";
import { ScrollArea } from "@loopad/ui/shadcn/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@loopad/ui/shadcn/tabs";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Play } from "lucide-react";
import type {
  CSSProperties,
  Dispatch,
  PointerEvent as ReactPointerEvent,
  SetStateAction
} from "react";
import { useCallback, useEffect, useState } from "react";
import { ChatKitQueryPanel, type ChatKitMessage } from "../components/ChatKitQueryPanel.js";
import { QueryResultTable } from "../components/QueryResultTable.js";
import { SchemaBrowserPanel } from "../components/SchemaBrowserPanel.js";
import { SchemaInspectorPanel } from "../components/SchemaInspectorPanel.js";
import { SqlEditorPanel } from "../components/SqlEditorPanel.js";
import { VisualizationPanel } from "../components/VisualizationPanel.js";
import {
  dataExplorerObjectDetailQueryOptions,
  dataExplorerObjectsQueryOptions,
  dataExplorerQueryRunsQueryOptions,
  useDataExplorerMutations,
  useDataExplorerSources
} from "../hooks/use-data-explorer.js";

const DEFAULT_SOURCE_ID: DataExplorerSourceId = "clickhouse_events";
const DEFAULT_SCHEMA_PANEL_WIDTH = 280;
const DEFAULT_CHAT_PANEL_WIDTH = 340;
const MIN_MAIN_PANEL_WIDTH = 640;
const MAX_CHAT_PANEL_WIDTH = 640;
const MAX_SCHEMA_PANEL_WIDTH = 520;
const MIN_CHAT_PANEL_WIDTH = 260;
const MIN_SCHEMA_PANEL_WIDTH = 140;
const PANEL_WIDTH_STORAGE_KEY = "loopad.dataExplorer.panelWidths";
const FALLBACK_SOURCES: DataExplorerSource[] = [
  {
    capabilities: ["sql_query", "schema_browser", "ai_query"],
    display_name: "PostgreSQL Contract DB",
    kind: "postgres",
    purpose: "AI Decision 결과, Dashboard read model, serving assignment, Dashboard metadata",
    source_id: "postgres_contract"
  },
  {
    capabilities: ["sql_query", "schema_browser", "ai_query"],
    display_name: "ClickHouse Event Store",
    kind: "clickhouse",
    purpose: "raw event source, hotel event analytics view",
    source_id: "clickhouse_events"
  }
];

export function DataExplorerPage({ projectId }: { projectId: string }) {
  const {
    chatPanelWidth,
    handleChatResizeStart,
    handleSchemaResizeStart,
    resetChatPanelWidth,
    resetSchemaPanelWidth,
    schemaPanelWidth
  } = useResizableDataExplorerPanels();
  const [sourceId, setSourceId] = useState<DataExplorerSourceId>(DEFAULT_SOURCE_ID);
  const [sqlText, setSqlText] = useState(() => defaultSqlText(projectId));
  const [queryParams, setQueryParams] = useState<Record<string, unknown>>({
    project_id: projectId
  });
  const [validation, setValidation] = useState<DataExplorerSqlValidation | null>(null);
  const [objectSearch, setObjectSearch] = useState("");
  const [selectedObject, setSelectedObject] = useState<DataExplorerObjectSummary | null>(null);
  const [message, setMessage] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatKitMessage[]>([
    {
      content: "쿼리로 보고 싶은 내용을 말하면 SQL 폼에 채워둘게요. 결과가 있으면 해석도 도와줄 수 있습니다.",
      id: "welcome",
      role: "assistant"
    }
  ]);
  const [queryResult, setQueryResult] = useState<DataExplorerQueryRunResponse | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [resultTab, setResultTab] = useState<"schema" | "result" | "visualization" | "history">(
    "schema"
  );
  const mutations = useDataExplorerMutations();
  const sourcesQuery = useDataExplorerSources();
  const sources = sourcesQuery.data?.sources ?? FALLBACK_SOURCES;
  const objectsQuery = useQuery(
    dataExplorerObjectsQueryOptions({ projectId, q: objectSearch, sourceId })
  );
  const objects = objectsQuery.data?.objects ?? [];
  const objectDetailQuery = useQuery(dataExplorerObjectDetailQueryOptions(selectedObject));
  const queryRunsQuery = useQuery(dataExplorerQueryRunsQueryOptions({ projectId, sourceId }));
  const hasInvalidValidation = validation?.status === "invalid";

  useEffect(() => {
    if (!objects.length) {
      setSelectedObject(null);
      return;
    }

    const selectedObjectKey = selectedObject ? objectKey(selectedObject) : null;
    const selectedObjectExists = objects.some((object) => objectKey(object) === selectedObjectKey);
    if (!selectedObjectExists) {
      setSelectedObject(preferredObject(objects, sourceId));
    }
  }, [objects, selectedObject, sourceId]);

  const handleRun = useCallback(async () => {
    try {
      setQueryError(null);
      const response = await mutations.runQuery.mutateAsync({
        origin: "manual",
        params: queryParams,
        project_id: projectId,
        row_limit: 500,
        source_id: sourceId,
        sql_text: sqlText,
        timeout_ms: 10_000
      });

      setValidation(response.validation);
      setQueryResult(response);
      setResultTab("result");
      void queryRunsQuery.refetch();
    } catch (error) {
      setQueryError(errorMessage(error));
    }
  }, [mutations.runQuery, projectId, queryParams, queryRunsQuery, sourceId, sqlText]);

  const handleSourceIdChange = useCallback((nextSourceId: DataExplorerSourceId) => {
    setSourceId(nextSourceId);
    setSelectedObject(null);
    setValidation(null);
  }, []);

  const handleSqlTextChange = useCallback((nextSqlText: string) => {
    setSqlText(nextSqlText);
    setValidation(null);
  }, []);

  const handleSelectQueryRun = useCallback(
    (run: DataExplorerQueryRunMetadata) => {
      setSourceId(run.source_id);
      setSqlText(run.sql_text);
      setQueryParams({ project_id: projectId });
      setValidation(null);
      setQueryError(null);
    },
    [projectId]
  );

  const handleChatSubmit = useCallback(async () => {
    const normalizedMessage = message.trim();
    if (!normalizedMessage) {
      return;
    }

    setMessage("");
    setQueryError(null);
    appendChatMessage(setChatMessages, "user", normalizedMessage);

    try {
      if (queryResult && shouldAnalyzeCurrentResult(normalizedMessage)) {
        const response = await mutations.chat.mutateAsync({
          current_result: toCurrentResult(queryResult),
          message: normalizedMessage,
          project_id: projectId,
          source_id: sourceId
        });

        appendChatMessage(setChatMessages, "assistant", response.assistant_message);
        return;
      }

      const queryPlan = await mutations.createPlan.mutateAsync({
        force_live_schema: true,
        natural_language_query: normalizedMessage,
        project_id: projectId,
        source_id: sourceId
      });

      setSourceId(queryPlan.source_id);
      setQueryParams({ project_id: projectId, ...queryPlan.params });
      setSqlText(
        inlineSqlParams(queryPlan.generated_sql, { project_id: projectId, ...queryPlan.params })
      );
      setValidation(queryPlan.validation);
      appendChatMessage(
        setChatMessages,
        "assistant",
        "SQL 폼에 쿼리를 채웠습니다. 내용을 확인한 뒤 실행하면 결과 탭에서 볼 수 있습니다."
      );
    } catch (error) {
      const messageText = errorMessage(error);
      setQueryError(messageText);
      appendChatMessage(setChatMessages, "assistant", messageText);
    }
  }, [message, mutations.chat, mutations.createPlan, projectId, queryResult, sourceId]);

  if (!projectId.trim()) {
    return (
      <Alert>
        <AlertTitle>조회 컨텍스트가 필요합니다</AlertTitle>
        <AlertDescription>대시보드 경로에 projectId를 명시해주세요.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="h-full min-h-0 overflow-x-auto overflow-y-hidden bg-white">
      <div
        className="grid h-full min-h-0 overflow-hidden border-t border-black/10 bg-white"
        style={
          {
            gridTemplateColumns: `${schemaPanelWidth}px minmax(${MIN_MAIN_PANEL_WIDTH}px, 1fr) ${chatPanelWidth}px`,
            minWidth: `${schemaPanelWidth + MIN_MAIN_PANEL_WIDTH + chatPanelWidth}px`
          } as CSSProperties
        }
      >
        <div className="relative min-h-0 min-w-0">
          <SchemaBrowserPanel
            isLoading={objectsQuery.isLoading}
            objectSearch={objectSearch}
            objects={objects}
            onObjectSearchChange={setObjectSearch}
            onSelectObject={setSelectedObject}
            onSourceIdChange={handleSourceIdChange}
            selectedObjectName={selectedObject?.object_name ?? null}
            sourceId={sourceId}
            sources={sources}
          />
          <DataExplorerResizeHandle
            ariaLabel="스키마 목록 너비 조절"
            onDoubleClick={resetSchemaPanelWidth}
            onPointerDown={handleSchemaResizeStart}
            side="right"
          />
        </div>

        <main className="grid min-h-0 min-w-0 grid-rows-[auto_minmax(0,1fr)] overflow-hidden border-y border-black/10 lg:border-x lg:border-y-0">
          <SqlEditorPanel
            onSqlTextChange={handleSqlTextChange}
            sqlText={sqlText}
            validation={validation}
          />

          <section className="flex min-h-0 flex-col border-t border-black/10 bg-white">
            {queryError ? (
              <Alert className="m-3 shrink-0" variant="destructive">
                <AlertTitle>Data Explorer 요청 실패</AlertTitle>
                <AlertDescription>{queryError}</AlertDescription>
              </Alert>
            ) : null}
            <Tabs
              className="min-h-0 flex-1 gap-0 overflow-hidden"
              onValueChange={(value) =>
                setResultTab(value as "schema" | "result" | "visualization" | "history")
              }
              value={resultTab}
            >
              <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-black/10 px-4 py-2.5">
                <TabsList className="h-8">
                  <TabsTrigger value="schema">Schema</TabsTrigger>
                  <TabsTrigger value="result">Query Result</TabsTrigger>
                  <TabsTrigger value="visualization">Visual Insights</TabsTrigger>
                  <TabsTrigger value="history">History</TabsTrigger>
                </TabsList>
                <div className="flex items-center gap-2">
                  {validation ? (
                    <Badge variant={hasInvalidValidation ? "destructive" : "outline"}>
                      {hasInvalidValidation ? "invalid" : "valid"}
                    </Badge>
                  ) : null}
                  {queryResult ? (
                    <>
                      <Badge variant="outline">{queryResult.query_run_id}</Badge>
                      <Badge variant={queryResult.truncated ? "destructive" : "outline"}>
                        {queryResult.truncated ? "truncated" : `${queryResult.row_count} rows`}
                      </Badge>
                    </>
                  ) : null}
                  <Button
                    className="bg-[#0066cc] text-white hover:bg-[#0057ad]"
                    disabled={mutations.runQuery.isPending || !sqlText.trim()}
                    onClick={handleRun}
                    size="sm"
                    type="button"
                  >
                    {mutations.runQuery.isPending ? <Loader2 className="animate-spin" /> : <Play />}
                    Run Query
                  </Button>
                </div>
              </div>
              <div className="min-h-0 flex-1 overflow-hidden p-4">
                <TabsContent
                  className="h-full min-h-0 data-[state=inactive]:hidden"
                  value="schema"
                >
                  <SchemaInspectorPanel
                    detail={objectDetailQuery.data ?? null}
                    isLoading={objectDetailQuery.isLoading}
                  />
                </TabsContent>
                <TabsContent
                  className="h-full min-h-0 data-[state=inactive]:hidden"
                  value="result"
                >
                  <QueryResultTable result={queryResult} />
                </TabsContent>
                <TabsContent
                  className="h-full min-h-0 data-[state=inactive]:hidden"
                  value="visualization"
                >
                  <VisualizationPanel result={queryResult} />
                </TabsContent>
                <TabsContent
                  className="h-full min-h-0 data-[state=inactive]:hidden"
                  value="history"
                >
                  <QueryHistoryList
                    onSelectRun={handleSelectQueryRun}
                    runs={queryRunsQuery.data?.query_runs ?? []}
                  />
                </TabsContent>
              </div>
            </Tabs>
          </section>
        </main>

        <div className="relative min-h-0 min-w-0">
          <DataExplorerResizeHandle
            ariaLabel="AI 패널 너비 조절"
            onDoubleClick={resetChatPanelWidth}
            onPointerDown={handleChatResizeStart}
            side="left"
          />
          <ChatKitQueryPanel
            message={message}
            messages={chatMessages}
            onMessageChange={setMessage}
            onSubmit={handleChatSubmit}
            pending={mutations.chat.isPending || mutations.createPlan.isPending}
          />
        </div>
      </div>
    </div>
  );
}

function DataExplorerResizeHandle({
  ariaLabel,
  onDoubleClick,
  onPointerDown,
  side
}: {
  ariaLabel: string;
  onDoubleClick: () => void;
  onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  side: "left" | "right";
}) {
  return (
    <button
      aria-label={ariaLabel}
      className={`absolute inset-y-2 z-20 hidden w-3 cursor-col-resize items-center justify-center rounded-sm transition-colors hover:bg-muted md:flex ${
        side === "left" ? "-left-1.5" : "-right-1.5"
      }`}
      onDoubleClick={onDoubleClick}
      onPointerDown={onPointerDown}
      type="button"
    >
      <span className="h-8 w-1 rounded-full bg-border" />
    </button>
  );
}

function useResizableDataExplorerPanels() {
  const [schemaPanelWidth, setSchemaPanelWidth] = useState(() => {
    if (typeof window === "undefined") {
      return DEFAULT_SCHEMA_PANEL_WIDTH;
    }

    const stored = readStoredPanelWidths();
    return clampPanelWidth(
      stored?.schemaPanelWidth ?? DEFAULT_SCHEMA_PANEL_WIDTH,
      MIN_SCHEMA_PANEL_WIDTH,
      MAX_SCHEMA_PANEL_WIDTH
    );
  });
  const [chatPanelWidth, setChatPanelWidth] = useState(() => {
    if (typeof window === "undefined") {
      return DEFAULT_CHAT_PANEL_WIDTH;
    }

    const stored = readStoredPanelWidths();
    return clampPanelWidth(
      stored?.chatPanelWidth ?? DEFAULT_CHAT_PANEL_WIDTH,
      MIN_CHAT_PANEL_WIDTH,
      MAX_CHAT_PANEL_WIDTH
    );
  });

  useEffect(() => {
    window.localStorage.setItem(
      PANEL_WIDTH_STORAGE_KEY,
      JSON.stringify({ chatPanelWidth, schemaPanelWidth })
    );
  }, [chatPanelWidth, schemaPanelWidth]);

  const resetSchemaPanelWidth = useCallback(() => {
    setSchemaPanelWidth(DEFAULT_SCHEMA_PANEL_WIDTH);
  }, []);
  const resetChatPanelWidth = useCallback(() => {
    setChatPanelWidth(DEFAULT_CHAT_PANEL_WIDTH);
  }, []);
  const handleSchemaResizeStart = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      startPanelResize({
        event,
        initialWidth: schemaPanelWidth,
        maxWidth: MAX_SCHEMA_PANEL_WIDTH,
        minWidth: MIN_SCHEMA_PANEL_WIDTH,
        setWidth: setSchemaPanelWidth,
        side: "left"
      });
    },
    [schemaPanelWidth]
  );
  const handleChatResizeStart = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      startPanelResize({
        event,
        initialWidth: chatPanelWidth,
        maxWidth: MAX_CHAT_PANEL_WIDTH,
        minWidth: MIN_CHAT_PANEL_WIDTH,
        setWidth: setChatPanelWidth,
        side: "right"
      });
    },
    [chatPanelWidth]
  );

  return {
    chatPanelWidth,
    handleChatResizeStart,
    handleSchemaResizeStart,
    resetChatPanelWidth,
    resetSchemaPanelWidth,
    schemaPanelWidth
  };
}

function startPanelResize({
  event,
  initialWidth,
  maxWidth,
  minWidth,
  setWidth,
  side
}: {
  event: ReactPointerEvent<HTMLButtonElement>;
  initialWidth: number;
  maxWidth: number;
  minWidth: number;
  setWidth: (width: number) => void;
  side: "left" | "right";
}) {
  if (event.button !== 0) {
    return;
  }

  event.preventDefault();
  const initialClientX = event.clientX;
  const originalCursor = document.body.style.cursor;
  const originalUserSelect = document.body.style.userSelect;

  document.body.style.cursor = "col-resize";
  document.body.style.userSelect = "none";

  function handlePointerMove(moveEvent: globalThis.PointerEvent) {
    const delta = moveEvent.clientX - initialClientX;
    const nextWidth = side === "left" ? initialWidth + delta : initialWidth - delta;
    setWidth(clampPanelWidth(nextWidth, minWidth, maxWidth));
  }

  function stopResize() {
    document.body.style.cursor = originalCursor;
    document.body.style.userSelect = originalUserSelect;
    window.removeEventListener("pointermove", handlePointerMove);
    window.removeEventListener("pointerup", stopResize);
  }

  window.addEventListener("pointermove", handlePointerMove);
  window.addEventListener("pointerup", stopResize);
}

function clampPanelWidth(width: number, minWidth: number, maxWidth: number) {
  return Math.min(maxWidth, Math.max(minWidth, Math.round(width)));
}

function readStoredPanelWidths() {
  try {
    const stored = window.localStorage.getItem(PANEL_WIDTH_STORAGE_KEY);
    if (!stored) {
      return null;
    }
    const parsed = JSON.parse(stored) as {
      chatPanelWidth?: unknown;
      schemaPanelWidth?: unknown;
    };
    return {
      chatPanelWidth:
        typeof parsed.chatPanelWidth === "number" ? parsed.chatPanelWidth : undefined,
      schemaPanelWidth:
        typeof parsed.schemaPanelWidth === "number" ? parsed.schemaPanelWidth : undefined
    };
  } catch {
    return null;
  }
}

function objectKey(object: DataExplorerObjectSummary) {
  return [
    object.source_id,
    object.database_name ?? "",
    object.schema_name ?? "",
    object.object_type,
    object.object_name
  ].join(".");
}

function preferredObject(
  objects: DataExplorerObjectSummary[],
  sourceId: DataExplorerSourceId
): DataExplorerObjectSummary | null {
  if (sourceId === "clickhouse_events") {
    return objects.find((object) => object.object_name === "raw_events") ?? objects[0] ?? null;
  }

  return objects[0] ?? null;
}

function QueryHistoryList({
  onSelectRun,
  runs
}: {
  onSelectRun: (run: DataExplorerQueryRunMetadata) => void;
  runs: DataExplorerQueryRunMetadata[];
}) {
  if (!runs.length) {
    return <div className="text-sm text-muted-foreground">아직 실행 metadata가 없습니다.</div>;
  }

  return (
    <ScrollArea className="h-full rounded-lg border border-black/10">
      <div className="min-w-0">
        {runs.map((run) => (
          <button
            className="grid w-full gap-1 border-b border-black/5 px-3 py-2 text-left text-sm transition-colors last:border-b-0 hover:bg-black/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066cc]"
            key={run.query_run_id}
            onClick={() => onSelectRun(run)}
            type="button"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="truncate font-mono text-xs">{run.query_run_id}</span>
              <Badge variant={run.status === "succeeded" ? "outline" : "destructive"}>
                {run.status}
              </Badge>
            </div>
            <div className="truncate text-xs text-muted-foreground">
              {run.row_count} rows · {run.duration_ms}ms · {run.origin}
            </div>
          </button>
        ))}
      </div>
    </ScrollArea>
  );
}

function toCurrentResult(result: DataExplorerQueryRunResponse): DataExplorerAiChatCurrentResult {
  return {
    columns: result.columns,
    query_run_id: result.query_run_id,
    row_count: result.row_count,
    rows: result.rows.slice(0, 100),
    truncated: result.truncated
  };
}

function appendChatMessage(
  setChatMessages: Dispatch<SetStateAction<ChatKitMessage[]>>,
  role: ChatKitMessage["role"],
  content: string
) {
  setChatMessages((current) => [
    ...current,
    { content, id: `${Date.now()}-${current.length}`, role }
  ]);
}

function shouldAnalyzeCurrentResult(message: string) {
  const normalized = message.toLowerCase();
  return ["해석", "분석", "설명", "요약", "insight", "interpret", "analyze", "summarize"].some(
    (keyword) => normalized.includes(keyword)
  );
}

function defaultSqlText(projectId: string) {
  return [
    "SELECT",
    "  toDate(event_time) AS event_date,",
    "  event_name,",
    "  count() AS event_count",
    "FROM raw_events",
    `WHERE project_id = ${sqlLiteral(projectId)}`,
    "GROUP BY event_date, event_name",
    "ORDER BY event_date DESC, event_count DESC",
    "LIMIT 100"
  ].join("\n");
}

function inlineSqlParams(sql: string, params: Record<string, unknown>) {
  const clickHouseInlined = sql.replace(/\{([A-Za-z_]\w*):[^}]+\}/g, (match, key: string) => {
    if (!Object.prototype.hasOwnProperty.call(params, key)) {
      return match;
    }

    return sqlLiteral(params[key]);
  });

  return clickHouseInlined.replace(
    /(^|[^:]):([A-Za-z_]\w*)\b/g,
    (match, prefix: string, key: string) => {
      if (!Object.prototype.hasOwnProperty.call(params, key)) {
        return match;
      }

      return `${prefix}${sqlLiteral(params[key])}`;
    }
  );
}

function sqlLiteral(value: unknown) {
  if (value === null || value === undefined) {
    return "NULL";
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "NULL";
  }

  if (typeof value === "boolean") {
    return value ? "TRUE" : "FALSE";
  }

  return `'${String(value).replaceAll("'", "''")}'`;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unexpected Data Explorer error.";
}
