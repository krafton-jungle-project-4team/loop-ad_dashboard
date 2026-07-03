import type {
  DataExplorerAiChatCurrentResult,
  DataExplorerObjectSummary,
  DataExplorerQueryRunResponse,
  DataExplorerSqlValidation
} from "@loopad/shared";
import { Alert, AlertDescription, AlertTitle } from "@loopad/ui/shadcn/alert";
import { Badge } from "@loopad/ui/shadcn/badge";
import { Button } from "@loopad/ui/shadcn/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@loopad/ui/shadcn/tabs";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Play } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
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
  useDataExplorerMutations
} from "../hooks/use-data-explorer.js";

export function DataExplorerPage({ projectId }: { projectId: string }) {
  const [sqlText, setSqlText] = useState(() => defaultSqlText(projectId));
  const [validation, setValidation] = useState<DataExplorerSqlValidation | null>(null);
  const [objectSearch, setObjectSearch] = useState("");
  const [selectedObject, setSelectedObject] = useState<DataExplorerObjectSummary | null>(null);
  const [message, setMessage] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatKitMessage[]>([
    {
      content: "보고 싶은 데이터를 말하면 SQL을 만들고 실행까지 도와드릴게요.",
      id: "welcome",
      role: "assistant"
    }
  ]);
  const [queryResult, setQueryResult] = useState<DataExplorerQueryRunResponse | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [resultTab, setResultTab] = useState<"schema" | "result" | "visualization">("schema");
  const mutations = useDataExplorerMutations();
  const objectsQuery = useQuery(dataExplorerObjectsQueryOptions({ q: objectSearch }));
  const objects = objectsQuery.data?.objects ?? [];
  const objectDetailQuery = useQuery(dataExplorerObjectDetailQueryOptions(selectedObject));
  const hasInvalidValidation = validation?.status === "invalid";

  useEffect(() => {
    if (!objects.length) {
      setSelectedObject(null);
      return;
    }

    const selectedObjectKey = selectedObject ? objectKey(selectedObject) : null;
    const selectedObjectExists = objects.some((object) => objectKey(object) === selectedObjectKey);
    if (!selectedObjectExists) {
      setSelectedObject(preferredObject(objects));
    }
  }, [objects, selectedObject]);

  const handleRun = useCallback(async () => {
    try {
      setQueryError(null);
      const response = await mutations.runQuery.mutateAsync({
        origin: "manual",
        project_id: projectId,
        row_limit: 500,
        sql_text: sqlText,
        timeout_ms: 10_000
      });

      setValidation(response.validation);
      setQueryResult(response);
      setResultTab("result");
    } catch (error) {
      setQueryError(errorMessage(error));
    }
  }, [mutations.runQuery, projectId, sqlText]);

  const handleSqlTextChange = useCallback((nextSqlText: string) => {
    setSqlText(nextSqlText);
    setValidation(null);
  }, []);

  const handleChatSubmit = useCallback(async () => {
    const normalizedMessage = message.trim();
    if (!normalizedMessage) {
      return;
    }

    setMessage("");
    setQueryError(null);
    appendChatMessage(setChatMessages, "user", normalizedMessage);

    try {
      const response = await mutations.chat.mutateAsync({
        current_result: queryResult ? toCurrentResult(queryResult) : undefined,
        message: normalizedMessage,
        project_id: projectId
      });

      if (response.query_plan) {
        setSqlText(response.query_plan.generated_sql);
        setValidation(response.query_plan.validation);
      }
      if (response.query_result) {
        setQueryResult(response.query_result);
        setResultTab("result");
      }
      appendChatMessage(setChatMessages, "assistant", response.assistant_message);
    } catch (error) {
      const messageText = errorMessage(error);
      setQueryError(messageText);
      appendChatMessage(setChatMessages, "assistant", messageText);
    }
  }, [message, mutations.chat, projectId, queryResult]);

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
      <div className="grid h-full min-h-0 min-w-[1260px] grid-cols-[280px_minmax(640px,1fr)_340px] overflow-hidden border-t border-black/10 bg-white">
        <SchemaBrowserPanel
          isLoading={objectsQuery.isLoading}
          objectSearch={objectSearch}
          objects={objects}
          onObjectSearchChange={setObjectSearch}
          onSelectObject={setSelectedObject}
          selectedObjectName={selectedObject?.object_name ?? null}
        />

        <main className="grid min-h-0 min-w-0 grid-rows-[auto_minmax(0,1fr)] overflow-hidden border-x border-black/10">
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
                setResultTab(value as "schema" | "result" | "visualization")
              }
              value={resultTab}
            >
              <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-black/10 px-4 py-2.5">
                <TabsList className="h-8">
                  <TabsTrigger value="schema">Schema</TabsTrigger>
                  <TabsTrigger value="result">Query Result</TabsTrigger>
                  <TabsTrigger value="visualization">Visual Insights</TabsTrigger>
                </TabsList>
                <div className="flex items-center gap-2">
                  {validation ? (
                    <Badge variant={hasInvalidValidation ? "destructive" : "outline"}>
                      {hasInvalidValidation ? "invalid" : "valid"}
                    </Badge>
                  ) : null}
                  {queryResult ? (
                    <Badge variant={queryResult.truncated ? "destructive" : "outline"}>
                      {queryResult.truncated ? "truncated" : `${queryResult.row_count} rows`}
                    </Badge>
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
                <TabsContent className="h-full min-h-0 data-[state=inactive]:hidden" value="schema">
                  <SchemaInspectorPanel
                    detail={objectDetailQuery.data ?? null}
                    isLoading={objectDetailQuery.isLoading}
                  />
                </TabsContent>
                <TabsContent className="h-full min-h-0 data-[state=inactive]:hidden" value="result">
                  <QueryResultTable result={queryResult} />
                </TabsContent>
                <TabsContent
                  className="h-full min-h-0 data-[state=inactive]:hidden"
                  value="visualization"
                >
                  <VisualizationPanel result={queryResult} />
                </TabsContent>
              </div>
            </Tabs>
          </section>
        </main>

        <ChatKitQueryPanel
          message={message}
          messages={chatMessages}
          onMessageChange={setMessage}
          onSubmit={handleChatSubmit}
          pending={mutations.chat.isPending}
        />
      </div>
    </div>
  );
}

function objectKey(object: DataExplorerObjectSummary) {
  return [
    object.database_name ?? "",
    object.schema_name ?? "",
    object.object_type,
    object.object_name
  ].join(".");
}

function preferredObject(objects: DataExplorerObjectSummary[]): DataExplorerObjectSummary | null {
  return objects.find((object) => object.object_name === "raw_events") ?? objects[0] ?? null;
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

function defaultSqlText(projectId: string) {
  const escapedProjectId = projectId.replaceAll("'", "''");

  return [
    "SELECT",
    "  toDate(event_time) AS event_date,",
    "  event_name,",
    "  count() AS event_count",
    "FROM raw_events",
    `WHERE project_id = '${escapedProjectId}'`,
    "GROUP BY event_date, event_name",
    "ORDER BY event_date DESC, event_count DESC",
    "LIMIT 100"
  ].join("\n");
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unexpected Data Explorer error.";
}
