import type {
  DataExplorerAiChatCurrentResult,
  DataExplorerColumn,
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
import { PanelLeft, PanelLeftClose } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { DataExplorerChatKitQueryEffect } from "../components/ChatKitQueryPanel.js";
import { QueryResultTable } from "../components/QueryResultTable.js";
import { SchemaBrowserPanel } from "../components/SchemaBrowserPanel.js";
import { SqlEditorPanel } from "../components/SqlEditorPanel.js";
import { VisualizationPanel } from "../components/VisualizationPanel.js";
import { useDashboardAssistant } from "../../dashboard/layout/DashboardAssistantContext.js";
import {
  dataExplorerEventCatalogQueryOptions,
  dataExplorerObjectDetailQueryOptions,
  dataExplorerObjectsQueryOptions,
  useDataExplorerMutations
} from "../hooks/use-data-explorer.js";
import { buildColumnSampleSql, buildObjectSampleSql } from "../model/data-explorer-sql.js";

const panelToggleButtonClass =
  "size-7 border-0 bg-transparent shadow-none transition-none focus-visible:border-transparent focus-visible:ring-0 active:translate-y-0";

export function DataExplorerPage({ projectId }: { projectId: string }) {
  const [sqlText, setSqlText] = useState(() => defaultSqlText(projectId));
  const [validation, setValidation] = useState<DataExplorerSqlValidation | null>(null);
  const [objectSearch, setObjectSearch] = useState("");
  const [selectedObject, setSelectedObject] = useState<DataExplorerObjectSummary | null>(null);
  const [queryResult, setQueryResult] = useState<DataExplorerQueryRunResponse | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [resultTab, setResultTab] = useState<"result" | "visualization">("result");
  const [isSchemaPanelOpen, setIsSchemaPanelOpen] = useState(shouldOpenSidePanelsByDefault);
  const { publishCurrentResult, subscribeToQueryEffects } = useDashboardAssistant();
  const mutations = useDataExplorerMutations();
  const objectsQuery = useQuery(dataExplorerObjectsQueryOptions({ q: objectSearch }));
  const eventCatalogQuery = useQuery(dataExplorerEventCatalogQueryOptions(projectId));
  const objects = objectsQuery.data?.objects ?? [];
  const events = eventCatalogQuery.data?.events ?? [];
  const objectDetailQuery = useQuery(dataExplorerObjectDetailQueryOptions(selectedObject));
  const hasInvalidValidation = validation?.status === "invalid";
  const schemaPanelDefaultSize = 24;
  const mainPanelDefaultSize = 100 - (isSchemaPanelOpen ? schemaPanelDefaultSize : 0);
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

  const handleBuildObjectQuery = useCallback(
    (object: DataExplorerObjectSummary) => {
      setQueryError(null);
      setValidation(null);
      setSqlText(buildObjectSampleSql(object, projectId));
    },
    [projectId]
  );

  const handleBuildColumnQuery = useCallback(
    (object: DataExplorerObjectSummary, column: DataExplorerColumn) => {
      setQueryError(null);
      setValidation(null);
      setSqlText(buildColumnSampleSql(object, column.column_name, projectId));
    },
    [projectId]
  );

  const handleBuildObjectDdlQuery = useCallback((object: DataExplorerObjectSummary) => {
    setQueryError(null);
    setValidation(null);
    setSqlText(objectDdlSqlText(object.object_name));
  }, []);

  const handleBuildEventQuery = useCallback(
    (eventName: string) => {
      setQueryError(null);
      setValidation(null);
      setSqlText(recentEventSqlText(projectId, eventName));
    },
    [projectId]
  );

  const handleChatKitQueryRun = useCallback((effect: DataExplorerChatKitQueryEffect) => {
    setQueryError(null);
    setSqlText(effect.query_plan.generated_sql);
    setValidation(effect.query_plan.validation);

    if (effect.action === "query_run") {
      setQueryResult(effect.query_result);
      setResultTab("result");
      return;
    }

    setQueryResult(null);
    setResultTab("result");
  }, []);

  useEffect(() => {
    publishCurrentResult(chatKitCurrentResult);
  }, [chatKitCurrentResult, publishCurrentResult]);

  useEffect(
    () => () => {
      publishCurrentResult(null);
    },
    [publishCurrentResult]
  );

  useEffect(
    () => subscribeToQueryEffects(handleChatKitQueryRun),
    [handleChatKitQueryRun, subscribeToQueryEffects]
  );

  if (!projectId.trim()) {
    return (
      <Alert>
        <AlertTitle>프로젝트를 찾지 못했어요</AlertTitle>
        <AlertDescription>프로젝트 목록에서 다시 선택해 주세요.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="h-full min-h-0 min-w-0 overflow-hidden bg-white">
      <ResizablePanelGroup
        className="h-full min-h-0 min-w-0 overflow-hidden border-t border-black/10 bg-white"
        id="loopad-data-explorer-shell"
        orientation="horizontal"
      >
        {isSchemaPanelOpen ? (
          <>
            <ResizablePanel
              className="min-w-0 overflow-hidden"
              defaultSize={`${schemaPanelDefaultSize}%`}
              maxSize="40%"
              minSize="16%"
            >
              <SchemaBrowserPanel
                events={events}
                isEventsLoading={eventCatalogQuery.isLoading}
                isLoading={objectsQuery.isLoading}
                isObjectDetailLoading={objectDetailQuery.isLoading}
                objectSearch={objectSearch}
                objects={objects}
                onBuildColumnQuery={handleBuildColumnQuery}
                onBuildEventQuery={handleBuildEventQuery}
                onBuildObjectDdlQuery={handleBuildObjectDdlQuery}
                onBuildObjectQuery={handleBuildObjectQuery}
                onObjectSearchChange={setObjectSearch}
                onSelectObject={setSelectedObject}
                selectedObjectDetail={objectDetailQuery.data ?? null}
                selectedObjectName={selectedObject?.object_name ?? null}
              />
            </ResizablePanel>
            <ResizableHandle
              className="bg-black/10 transition-colors hover:bg-primary/30"
              withHandle
            />
          </>
        ) : null}

        <ResizablePanel
          className="min-w-0 overflow-hidden"
          defaultSize={`${mainPanelDefaultSize}%`}
          minSize="36%"
        >
          <main className="h-full min-h-0 min-w-0 overflow-hidden bg-white">
            <ResizablePanelGroup
              className="h-full min-h-0 min-w-0"
              id="loopad-data-explorer-workbench"
              orientation="vertical"
            >
              <ResizablePanel className="min-h-0 overflow-hidden" defaultSize="42%" minSize="26%">
                <SqlEditorPanel
                  isRunning={mutations.runQuery.isPending}
                  leftToolbar={
                    <Button
                      aria-label={isSchemaPanelOpen ? "스키마 패널 닫기" : "스키마 패널 열기"}
                      className={panelToggleButtonClass}
                      onClick={() => setIsSchemaPanelOpen((current) => !current)}
                      size="icon-sm"
                      title={isSchemaPanelOpen ? "스키마 패널 닫기" : "스키마 패널 열기"}
                      type="button"
                      variant="ghost"
                    >
                      {isSchemaPanelOpen ? <PanelLeftClose /> : <PanelLeft />}
                    </Button>
                  }
                  onRun={handleRun}
                  onSqlTextChange={handleSqlTextChange}
                  runDisabled={mutations.runQuery.isPending || !sqlText.trim()}
                  sqlText={sqlText}
                  validation={validation}
                />
              </ResizablePanel>

              <ResizableHandle
                className="bg-black/10 transition-colors hover:bg-primary/30"
                withHandle
              />

              <ResizablePanel className="min-h-0 overflow-hidden" defaultSize="58%" minSize="28%">
                <section className="flex h-full min-h-0 min-w-0 flex-col bg-white">
                  {queryError ? (
                    <Alert className="m-3 shrink-0" variant="destructive">
                      <AlertTitle>데이터를 불러오지 못했어요</AlertTitle>
                      <AlertDescription>{queryError}</AlertDescription>
                    </Alert>
                  ) : null}
                  <Tabs
                    className="min-h-0 min-w-0 flex-1 gap-0 overflow-hidden"
                    onValueChange={(value) => setResultTab(value as "result" | "visualization")}
                    value={resultTab}
                  >
                    <div className="flex min-w-0 shrink-0 flex-wrap items-center justify-between gap-3 border-b border-black/10 px-4 py-2.5">
                      <TabsList className="h-8">
                        <TabsTrigger value="result">쿼리 결과</TabsTrigger>
                        <TabsTrigger value="visualization">차트로 보기</TabsTrigger>
                      </TabsList>
                      <div className="flex items-center gap-2">
                        {validation ? (
                          <Badge variant={hasInvalidValidation ? "destructive" : "outline"}>
                            {hasInvalidValidation ? "검증 실패" : "검증 통과"}
                          </Badge>
                        ) : null}
                        {queryResult ? (
                          <Badge variant={queryResult.truncated ? "destructive" : "outline"}>
                            {queryResult.truncated ? "일부만 표시" : `${queryResult.row_count}행`}
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                    <div className="min-h-0 min-w-0 flex-1 overflow-hidden p-4">
                      <TabsContent
                        className="h-full min-h-0 min-w-0 overflow-hidden data-[state=inactive]:hidden"
                        value="result"
                      >
                        {resultTab === "result" ? <QueryResultTable result={queryResult} /> : null}
                      </TabsContent>
                      <TabsContent
                        className="h-full min-h-0 min-w-0 overflow-hidden data-[state=inactive]:hidden"
                        value="visualization"
                      >
                        {resultTab === "visualization" ? (
                          <VisualizationPanel result={queryResult} />
                        ) : null}
                      </TabsContent>
                    </div>
                  </Tabs>
                </section>
              </ResizablePanel>
            </ResizablePanelGroup>
          </main>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

function objectKey(object: DataExplorerObjectSummary) {
  return [object.object_type, object.object_name].join(".");
}

function preferredObject(objects: DataExplorerObjectSummary[]): DataExplorerObjectSummary | null {
  return (
    objects.find((object) => object.object_name === "funnel_step_events") ??
    objects.find((object) => object.object_name === "raw_events") ??
    objects[0] ??
    null
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

function defaultSqlText(projectId: string) {
  const escapedProjectId = escapeSqlLiteral(projectId);

  return [
    "SELECT",
    "  toDate(event_time) AS event_date,",
    "  event_name,",
    "  count() AS event_count",
    "FROM funnel_step_events",
    `WHERE project_id = '${escapedProjectId}'`,
    "GROUP BY event_date, event_name",
    "ORDER BY event_date DESC, event_count DESC",
    "LIMIT 100"
  ].join("\n");
}

function objectDdlSqlText(objectName: string) {
  return [
    "SELECT",
    "  c.position,",
    "  c.name AS column_name,",
    "  c.type AS column_type,",
    "  nullIf(c.default_expression, '') AS default_expression,",
    "  nullIf(c.comment, '') AS comment,",
    "  t.create_table_query AS ddl",
    "FROM system.tables t",
    "INNER JOIN system.columns c",
    "  ON c.database = t.database",
    " AND c.table = t.name",
    "WHERE t.database = currentDatabase()",
    `  AND t.name = '${escapeSqlLiteral(objectName)}'`,
    "ORDER BY c.position"
  ].join("\n");
}

function recentEventSqlText(projectId: string, eventName: string) {
  return [
    "SELECT",
    "  *",
    "FROM funnel_step_events",
    `WHERE project_id = '${escapeSqlLiteral(projectId)}'`,
    `  AND event_name = '${escapeSqlLiteral(eventName)}'`,
    "ORDER BY event_time DESC",
    "LIMIT 100"
  ].join("\n");
}

function escapeSqlLiteral(value: string) {
  return value.replaceAll("'", "''");
}

function shouldOpenSidePanelsByDefault() {
  return (
    typeof window === "undefined" ||
    typeof window.matchMedia !== "function" ||
    !window.matchMedia("(max-width: 767px)").matches
  );
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "문제가 생겼어요. 잠시 후 다시 시도해 주세요.";
}
