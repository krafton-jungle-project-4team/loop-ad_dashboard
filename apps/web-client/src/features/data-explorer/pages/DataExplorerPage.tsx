import type {
  DataExplorerAiChatCurrentResult,
  DataExplorerObjectSummary,
  DataExplorerQueryRunResponse,
  DataExplorerSqlValidation
} from "@loopad/shared";
import { Alert, AlertDescription, AlertTitle } from "@loopad/ui/shadcn/alert";
import { Badge } from "@loopad/ui/shadcn/badge";
import { Button } from "@loopad/ui/shadcn/button";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@loopad/ui/shadcn/resizable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@loopad/ui/shadcn/tabs";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Play } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChatKitQueryPanel,
  type DataExplorerChatKitQueryRunEffect
} from "../components/ChatKitQueryPanel.js";
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
  const [queryResult, setQueryResult] = useState<DataExplorerQueryRunResponse | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [resultTab, setResultTab] = useState<"schema" | "result" | "visualization">("schema");
  const mutations = useDataExplorerMutations();
  const objectsQuery = useQuery(dataExplorerObjectsQueryOptions({ q: objectSearch }));
  const objects = objectsQuery.data?.objects ?? [];
  const objectDetailQuery = useQuery(dataExplorerObjectDetailQueryOptions(selectedObject));
  const hasInvalidValidation = validation?.status === "invalid";
  const chatKitCurrentResult = useMemo(
    () => (queryResult ? toCurrentResult(queryResult) : null),
    [queryResult]
  );

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

  const handleChatKitQueryRun = useCallback((effect: DataExplorerChatKitQueryRunEffect) => {
    setQueryError(null);
    setSqlText(effect.query_plan.generated_sql);
    setValidation(effect.query_plan.validation);
    setQueryResult(effect.query_result);
    setResultTab("result");
  }, []);

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
      <ResizablePanelGroup
        className="h-full min-h-0 min-w-[1260px] overflow-hidden border-t border-black/10 bg-white"
        id="loopad-data-explorer-panels"
        orientation="horizontal"
      >
        <ResizablePanel
          className="min-w-[220px]"
          defaultSize="280px"
          groupResizeBehavior="preserve-pixel-size"
          maxSize="460px"
          minSize="220px"
        >
          <SchemaBrowserPanel
            isLoading={objectsQuery.isLoading}
            objectSearch={objectSearch}
            objects={objects}
            onObjectSearchChange={setObjectSearch}
            onSelectObject={setSelectedObject}
            selectedObjectName={selectedObject?.object_name ?? null}
          />
        </ResizablePanel>

        <ResizableHandle
          className="bg-black/10 transition-colors hover:bg-[#0066cc]/30"
          withHandle
        />

        <ResizablePanel className="min-w-[560px]" minSize="560px">
          <main className="grid h-full min-h-0 min-w-0 grid-rows-[auto_minmax(0,1fr)] overflow-hidden border-x border-black/10">
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
                      {mutations.runQuery.isPending ? (
                        <Loader2 className="animate-spin" />
                      ) : (
                        <Play />
                      )}
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
                </div>
              </Tabs>
            </section>
          </main>
        </ResizablePanel>

        <ResizableHandle
          className="bg-black/10 transition-colors hover:bg-[#0066cc]/30"
          withHandle
        />

        <ResizablePanel
          className="min-w-[300px]"
          defaultSize="340px"
          groupResizeBehavior="preserve-pixel-size"
          maxSize="560px"
          minSize="300px"
        >
          <ChatKitQueryPanel
            currentResult={chatKitCurrentResult}
            onError={setQueryError}
            onQueryRun={handleChatKitQueryRun}
            projectId={projectId}
          />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

function objectKey(object: DataExplorerObjectSummary) {
  return [object.object_type, object.object_name].join(".");
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
