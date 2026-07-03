import type {
  DataExplorerObjectDdl,
  DataExplorerObjectSummary,
  DataExplorerSource,
  DataExplorerSourceId
} from "@loopad/shared";
import { Alert, AlertDescription, AlertTitle } from "@loopad/ui/shadcn/alert";
import { Badge } from "@loopad/ui/shadcn/badge";
import { ScrollArea } from "@loopad/ui/shadcn/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@loopad/ui/shadcn/tabs";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { SchemaBrowserPanel } from "../components/SchemaBrowserPanel.js";
import { SchemaInspectorPanel } from "../components/SchemaInspectorPanel.js";
import {
  dataExplorerObjectDdlQueryOptions,
  dataExplorerObjectDetailQueryOptions,
  dataExplorerObjectsQueryOptions,
  useDataExplorerSources
} from "../hooks/use-data-explorer.js";

const DEFAULT_SOURCE_ID: DataExplorerSourceId = "clickhouse_events";
const FALLBACK_SOURCES: DataExplorerSource[] = [
  {
    capabilities: ["schema_browser"],
    display_name: "PostgreSQL Contract DB",
    kind: "postgres",
    purpose: "AI Decision 결과, Dashboard read model, serving assignment, Dashboard metadata",
    source_id: "postgres_contract"
  },
  {
    capabilities: ["schema_browser"],
    display_name: "ClickHouse Event Store",
    kind: "clickhouse",
    purpose: "raw event source, hotel event analytics view",
    source_id: "clickhouse_events"
  }
];

export function DataExplorerPage({ projectId }: { projectId: string }) {
  const [sourceId, setSourceId] = useState<DataExplorerSourceId>(DEFAULT_SOURCE_ID);
  const [objectSearch, setObjectSearch] = useState("");
  const [selectedObject, setSelectedObject] = useState<DataExplorerObjectSummary | null>(null);
  const sourcesQuery = useDataExplorerSources();
  const sources = sourcesQuery.data?.sources ?? FALLBACK_SOURCES;
  const objectsQuery = useQuery(
    dataExplorerObjectsQueryOptions({ projectId, q: objectSearch, sourceId })
  );
  const objects = objectsQuery.data?.objects ?? [];
  const objectDetailQuery = useQuery(dataExplorerObjectDetailQueryOptions(selectedObject));
  const objectDdlQuery = useQuery(dataExplorerObjectDdlQueryOptions(selectedObject));

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

  if (!projectId.trim()) {
    return (
      <Alert>
        <AlertTitle>조회 컨텍스트가 필요합니다</AlertTitle>
        <AlertDescription>대시보드 경로에 projectId를 명시해주세요.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="grid h-full min-h-0 grid-cols-[320px_minmax(0,1fr)] overflow-hidden border-t border-black/10 bg-white">
      <SchemaBrowserPanel
        isLoading={objectsQuery.isLoading}
        objectSearch={objectSearch}
        objects={objects}
        onObjectSearchChange={setObjectSearch}
        onSelectObject={setSelectedObject}
        onSourceIdChange={(nextSourceId) => {
          setSourceId(nextSourceId);
          setSelectedObject(null);
        }}
        selectedObjectName={selectedObject?.object_name ?? null}
        sourceId={sourceId}
        sources={sources}
      />

      <main className="min-h-0 min-w-0 overflow-hidden border-l border-black/10 bg-white">
        <div className="flex h-14 items-center justify-between gap-3 border-b border-black/10 px-5">
          <div className="min-w-0">
            <h2 className="truncate text-[17px] font-semibold text-[#1d1d1f]">Schema Inspector</h2>
            <p className="truncate text-xs text-muted-foreground">
              {selectedObject ? qualifiedObjectName(selectedObject) : "테이블을 선택해주세요"}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Badge variant="outline">{sourceId}</Badge>
            {selectedObject ? <Badge variant="outline">{selectedObject.object_type}</Badge> : null}
          </div>
        </div>

        <Tabs
          className="grid h-[calc(100%-3.5rem)] min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-0"
          defaultValue="columns"
        >
          <div className="border-b border-black/10 px-5 py-2">
            <TabsList className="h-8">
              <TabsTrigger value="columns">Columns</TabsTrigger>
              <TabsTrigger value="ddl">DDL</TabsTrigger>
            </TabsList>
          </div>
          <div className="min-h-0 overflow-hidden p-5">
            <TabsContent className="h-full min-h-0 data-[state=inactive]:hidden" value="columns">
              <SchemaInspectorPanel
                detail={objectDetailQuery.data ?? null}
                isLoading={objectDetailQuery.isLoading}
              />
            </TabsContent>
            <TabsContent className="h-full min-h-0 data-[state=inactive]:hidden" value="ddl">
              <DdlPanel ddl={objectDdlQuery.data ?? null} isLoading={objectDdlQuery.isLoading} />
            </TabsContent>
          </div>
        </Tabs>
      </main>
    </div>
  );
}

function DdlPanel({ ddl, isLoading }: { ddl: DataExplorerObjectDdl | null; isLoading: boolean }) {
  if (isLoading && !ddl) {
    return (
      <div className="rounded border border-dashed border-black/10 bg-[#fafafc] p-6 text-sm text-muted-foreground">
        DDL 정보를 불러오는 중입니다.
      </div>
    );
  }

  if (!ddl) {
    return (
      <div className="rounded border border-dashed border-black/10 bg-[#fafafc] p-6 text-sm text-muted-foreground">
        왼쪽 목록에서 object를 선택해주세요.
      </div>
    );
  }

  return (
    <ScrollArea className="h-full min-h-0 rounded border border-black/10 bg-[#fafafc]">
      <pre className="min-w-max whitespace-pre-wrap p-4 font-mono text-xs leading-5 text-[#1d1d1f]">
        {ddl.ddl}
      </pre>
    </ScrollArea>
  );
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

function qualifiedObjectName(object: DataExplorerObjectSummary) {
  return [object.database_name, object.schema_name, object.object_name].filter(Boolean).join(".");
}
