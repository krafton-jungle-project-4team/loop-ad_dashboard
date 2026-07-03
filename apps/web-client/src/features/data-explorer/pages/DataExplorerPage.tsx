import type {
  DataExplorerAiChatCurrentResult,
  DataExplorerQueryRunMetadata,
  DataExplorerQueryRunResponse,
  DataExplorerSource,
  DataExplorerSourceId,
  DataExplorerSqlValidation
} from "@loopad/shared";
import { Alert, AlertDescription, AlertTitle } from "@loopad/ui/shadcn/alert";
import { Badge } from "@loopad/ui/shadcn/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@loopad/ui/shadcn/tabs";
import { useQuery } from "@tanstack/react-query";
import type { Dispatch, SetStateAction } from "react";
import { useCallback, useState } from "react";
import { ChatKitQueryPanel, type ChatKitMessage } from "../components/ChatKitQueryPanel.js";
import { QueryResultTable } from "../components/QueryResultTable.js";
import { SqlEditorPanel } from "../components/SqlEditorPanel.js";
import { VisualizationPanel } from "../components/VisualizationPanel.js";
import {
  dataExplorerQueryRunsQueryOptions,
  useDataExplorerMutations,
  useDataExplorerSources
} from "../hooks/use-data-explorer.js";
import { Section } from "../../dashboard/ui/Section.js";

const DEFAULT_SOURCE_ID: DataExplorerSourceId = "clickhouse_events";
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
  const [sourceId, setSourceId] = useState<DataExplorerSourceId>(DEFAULT_SOURCE_ID);
  const [sqlText, setSqlText] = useState(() => defaultSqlText(projectId));
  const [queryParams, setQueryParams] = useState<Record<string, unknown>>({
    project_id: projectId
  });
  const [validation, setValidation] = useState<DataExplorerSqlValidation | null>(null);
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
  const [resultTab, setResultTab] = useState<"table" | "visualization" | "history">("table");
  const mutations = useDataExplorerMutations();
  const sourcesQuery = useDataExplorerSources();
  const queryRunsQuery = useQuery(dataExplorerQueryRunsQueryOptions({ projectId, sourceId }));

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
      setResultTab("table");
      void queryRunsQuery.refetch();
    } catch (error) {
      setQueryError(errorMessage(error));
    }
  }, [mutations.runQuery, projectId, queryParams, queryRunsQuery, sourceId, sqlText]);

  const handleSourceIdChange = useCallback((nextSourceId: DataExplorerSourceId) => {
    setSourceId(nextSourceId);
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
    <div className="grid gap-6">
      <div className="grid gap-1">
        <h1 className="text-3xl font-semibold tracking-tight text-[#1d1d1f]">Data Explorer</h1>
        <div className="text-sm text-muted-foreground">{projectId}</div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px] xl:items-start">
        <div className="grid min-w-0 gap-6">
          <SqlEditorPanel
            onRun={handleRun}
            onSourceIdChange={handleSourceIdChange}
            onSqlTextChange={handleSqlTextChange}
            pending={mutations.runQuery.isPending}
            sourceId={sourceId}
            sources={sourcesQuery.data?.sources ?? FALLBACK_SOURCES}
            sqlText={sqlText}
            validation={validation}
          />

          {queryError ? (
            <Alert variant="destructive">
              <AlertTitle>Data Explorer 요청 실패</AlertTitle>
              <AlertDescription>{queryError}</AlertDescription>
            </Alert>
          ) : null}

          <Section
            action={
              queryResult ? (
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{queryResult.query_run_id}</Badge>
                  <Badge variant={queryResult.truncated ? "destructive" : "outline"}>
                    {queryResult.truncated ? "truncated" : `${queryResult.row_count} rows`}
                  </Badge>
                </div>
              ) : null
            }
            contentClassName="grid gap-4"
            title="결과"
          >
            <Tabs
              onValueChange={(value) =>
                setResultTab(value as "table" | "visualization" | "history")
              }
              value={resultTab}
            >
              <TabsList>
                <TabsTrigger value="table">테이블</TabsTrigger>
                <TabsTrigger value="visualization">시각화</TabsTrigger>
                <TabsTrigger value="history">쿼리 히스토리</TabsTrigger>
              </TabsList>
              <TabsContent value="table">
                <QueryResultTable result={queryResult} />
              </TabsContent>
              <TabsContent value="visualization">
                <VisualizationPanel result={queryResult} />
              </TabsContent>
              <TabsContent value="history">
                <QueryHistoryList
                  onSelectRun={handleSelectQueryRun}
                  runs={queryRunsQuery.data?.query_runs ?? []}
                />
              </TabsContent>
            </Tabs>
          </Section>
        </div>

        <div className="min-w-0 xl:sticky xl:top-6">
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
    <div className="max-h-80 overflow-auto rounded-lg border border-black/10">
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
