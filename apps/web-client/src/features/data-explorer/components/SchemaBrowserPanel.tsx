import type {
  DashboardEventCatalogItem,
  DataExplorerColumn,
  DataExplorerObjectDetail,
  DataExplorerObjectSummary
} from "@loopad/shared";
import { Button } from "@loopad/ui/shadcn/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@loopad/ui/shadcn/dropdown-menu";
import { Input } from "@loopad/ui/shadcn/input";
import { cn } from "@loopad/ui/shadcn/utils";
import {
  Braces,
  Calendar,
  ChevronRight,
  Database,
  Ellipsis,
  FileCode2,
  Folder,
  FolderOpen,
  Hash,
  Search,
  Table2,
  Type,
  Zap
} from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";

const schemaIconButtonClass =
  "size-6 border-0 shadow-none transition-none focus-visible:border-transparent focus-visible:ring-0 active:translate-y-0";

export function SchemaBrowserPanel({
  events,
  isEventsLoading,
  isLoading,
  isObjectDetailLoading,
  objectSearch,
  objects,
  onBuildColumnQuery,
  onBuildEventQuery,
  onBuildObjectDdlQuery,
  onBuildObjectQuery,
  onObjectSearchChange,
  onSelectObject,
  selectedObjectDetail,
  selectedObjectName
}: {
  events: DashboardEventCatalogItem[];
  isEventsLoading: boolean;
  isLoading: boolean;
  isObjectDetailLoading: boolean;
  objectSearch: string;
  objects: DataExplorerObjectSummary[];
  onBuildColumnQuery: (object: DataExplorerObjectSummary, column: DataExplorerColumn) => void;
  onBuildEventQuery: (eventName: string) => void;
  onBuildObjectDdlQuery: (object: DataExplorerObjectSummary) => void;
  onBuildObjectQuery: (object: DataExplorerObjectSummary) => void;
  onObjectSearchChange: (value: string) => void;
  onSelectObject: (object: DataExplorerObjectSummary) => void;
  selectedObjectDetail: DataExplorerObjectDetail | null;
  selectedObjectName: string | null;
}) {
  const [isSchemaFolderOpen, setIsSchemaFolderOpen] = useState(true);
  const [isEventsFolderOpen, setIsEventsFolderOpen] = useState(true);
  const [expandedObjectKey, setExpandedObjectKey] = useState<string | null>(null);
  const filteredEvents = useMemo(() => {
    const q = objectSearch.trim().toLowerCase();
    if (!q) {
      return events;
    }

    return events.filter((event) => event.event_name.toLowerCase().includes(q));
  }, [objectSearch, events]);

  const handleToggleObject = (object: DataExplorerObjectSummary) => {
    const nextKey = objectKey(object);
    onSelectObject(object);
    setExpandedObjectKey((current) => (current === nextKey ? null : nextKey));
  };

  return (
    <aside className="grid h-full min-h-0 grid-rows-[auto_auto_minmax(0,1fr)] overflow-hidden bg-[#fafafc]">
      <div className="flex items-center gap-2 border-b border-black/10 px-4 py-4">
        <Database className="size-4 text-[#0066cc]" />
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">
          데이터 소스
        </div>
      </div>

      <div className="border-b border-black/10 p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
          <Input
            className="h-10 bg-white pl-8"
            onChange={(event) => onObjectSearchChange(event.target.value)}
            placeholder="스키마와 이벤트 검색..."
            value={objectSearch}
          />
        </div>
      </div>

      <div className="min-h-0 overflow-auto p-2.5">
        <div className="grid gap-1 pr-2">
          <FolderSection
            isOpen={isSchemaFolderOpen}
            onToggle={() => setIsSchemaFolderOpen((current) => !current)}
            title="스키마"
          >
            <div className="grid gap-px">
              {objects.map((object) => {
                const key = objectKey(object);
                const isSelected = selectedObjectName === object.object_name;
                const isExpanded = expandedObjectKey === key;
                const showColumns = isExpanded && isSelected;

                return (
                  <div key={key}>
                    <div
                      className={cn(
                        "group flex min-h-7 min-w-0 items-center gap-1 rounded px-1 py-0.5",
                        isSelected ? "bg-[#e8f2ff] text-[#0066cc]" : "hover:bg-white"
                      )}
                    >
                      <Button
                        aria-label={`${object.object_name} 스키마 ${isExpanded ? "숨기기" : "보기"}`}
                        className={schemaIconButtonClass}
                        onClick={() => handleToggleObject(object)}
                        size="icon-xs"
                        title={`${object.object_name} 스키마 ${isExpanded ? "숨기기" : "보기"}`}
                        type="button"
                        variant="ghost"
                      >
                        <ChevronRight
                          className={cn("transition-none", isExpanded ? "rotate-90" : "")}
                        />
                      </Button>
                      <button
                        className="flex min-h-6 min-w-0 flex-1 items-center gap-1.5 text-left text-xs font-normal leading-none"
                        onClick={() => onSelectObject(object)}
                        onDoubleClick={() => onBuildObjectQuery(object)}
                        type="button"
                      >
                        {object.object_type === "view" ? (
                          <Database className="size-3 shrink-0" />
                        ) : (
                          <Table2 className="size-3 shrink-0" />
                        )}
                        <span className="min-w-0 flex-1 truncate leading-none">
                          {object.object_name}
                        </span>
                        {object.engine ? (
                          <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] leading-none text-muted-foreground">
                            {object.engine}
                          </span>
                        ) : null}
                      </button>
                      <ObjectActionMenu
                        object={object}
                        onBuildObjectDdlQuery={onBuildObjectDdlQuery}
                        onBuildObjectQuery={onBuildObjectQuery}
                      />
                    </div>

                    {showColumns ? (
                      <ObjectColumns
                        detail={selectedObjectDetail}
                        isLoading={isObjectDetailLoading}
                        object={object}
                        onBuildColumnQuery={onBuildColumnQuery}
                      />
                    ) : null}
                  </div>
                );
              })}

              {isLoading ? (
                <div className="rounded border border-dashed border-black/10 bg-white p-4 text-sm text-muted-foreground">
                  스키마를 불러오는 중입니다.
                </div>
              ) : null}

              {!isLoading && !objects.length ? (
                <div className="rounded border border-dashed border-black/10 bg-white p-4 text-sm text-muted-foreground">
                  조회된 테이블이 없습니다.
                </div>
              ) : null}
            </div>
          </FolderSection>

          <FolderSection
            isOpen={isEventsFolderOpen}
            onToggle={() => setIsEventsFolderOpen((current) => !current)}
            title="이벤트"
          >
            <div className="grid gap-px">
              {filteredEvents.map((event) => (
                <div
                  className="group flex min-h-7 min-w-0 items-center gap-1 rounded px-1 py-0.5 hover:bg-white"
                  key={event.event_name}
                >
                  <span aria-hidden="true" className="size-6 shrink-0" />
                  <button
                    className="flex min-h-6 min-w-0 flex-1 items-center gap-1.5 text-left text-xs font-normal leading-none"
                    onDoubleClick={() => onBuildEventQuery(event.event_name)}
                    title={event.event_name}
                    type="button"
                  >
                    <Zap className="size-3 shrink-0" />
                    <span className="min-w-0 flex-1 truncate leading-none text-[#1d1d1f]">
                      {event.event_name}
                    </span>
                  </button>
                  <Button
                    className={cn(
                      schemaIconButtonClass,
                      "opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100"
                    )}
                    onClick={() => onBuildEventQuery(event.event_name)}
                    size="icon-xs"
                    title="최근 이벤트 SQL 만들기"
                    type="button"
                    variant="ghost"
                  >
                    <FileCode2 />
                  </Button>
                </div>
              ))}

              {isEventsLoading ? (
                <div className="rounded border border-dashed border-black/10 bg-white p-4 text-sm text-muted-foreground">
                  이벤트를 불러오는 중입니다.
                </div>
              ) : null}

              {!isEventsLoading && !filteredEvents.length ? (
                <div className="rounded border border-dashed border-black/10 bg-white p-4 text-sm text-muted-foreground">
                  조회된 이벤트가 없습니다.
                </div>
              ) : null}
            </div>
          </FolderSection>
        </div>
      </div>
    </aside>
  );
}

function FolderSection({
  children,
  isOpen,
  onToggle,
  title
}: {
  children: ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  title: string;
}) {
  return (
    <section className="min-w-0">
      <button
        className="flex h-8 w-full min-w-0 items-center gap-2 rounded border-0 px-1.5 text-left text-xs font-medium leading-none text-slate-700 shadow-none transition-none hover:bg-white"
        onClick={onToggle}
        type="button"
      >
        <ChevronRight
          className={cn("size-3 shrink-0 transition-none", isOpen ? "rotate-90" : "")}
        />
        {isOpen ? (
          <FolderOpen className="size-3.5 shrink-0 text-[#0066cc]" />
        ) : (
          <Folder className="size-3.5 shrink-0 text-slate-500" />
        )}
        <span className="min-w-0 flex-1 truncate leading-none">{title}</span>
      </button>
      {isOpen ? <div className="mt-1">{children}</div> : null}
    </section>
  );
}

function ObjectActionMenu({
  object,
  onBuildObjectDdlQuery,
  onBuildObjectQuery
}: {
  object: DataExplorerObjectSummary;
  onBuildObjectDdlQuery: (object: DataExplorerObjectSummary) => void;
  onBuildObjectQuery: (object: DataExplorerObjectSummary) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label={`${object.object_name} 객체 작업`}
          className={cn(
            schemaIconButtonClass,
            "opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100"
          )}
          onClick={(event) => event.stopPropagation()}
          size="icon-xs"
          title={`${object.object_name} 객체 작업`}
          type="button"
          variant="ghost"
        >
          <Ellipsis />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>{object.object_name}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onBuildObjectQuery(object)}>
          <FileCode2 />행 조회
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onBuildObjectDdlQuery(object)}>
          <Database />
          DDL
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ObjectColumns({
  detail,
  isLoading,
  object,
  onBuildColumnQuery
}: {
  detail: DataExplorerObjectDetail | null;
  isLoading: boolean;
  object: DataExplorerObjectSummary;
  onBuildColumnQuery: (object: DataExplorerObjectSummary, column: DataExplorerColumn) => void;
}) {
  if (isLoading && !detail) {
    return (
      <div className="ml-6 border-l border-black/10 px-2 py-2 text-xs text-muted-foreground">
        컬럼을 불러오는 중입니다.
      </div>
    );
  }

  if (!detail) {
    return null;
  }

  return (
    <div className="ml-6 grid gap-px border-l border-black/10 py-1 pl-1">
      {detail.columns.map((column) => (
        <button
          className="group/column flex min-h-7 min-w-0 items-center gap-2 rounded px-2 py-1 text-left hover:bg-white"
          key={column.column_name}
          onClick={() => onBuildColumnQuery(object, column)}
          title={column.comment ?? `${column.column_name} ${column.data_type}`}
          type="button"
        >
          {columnIcon(column.data_type)}
          <span className="min-w-0 flex-1 truncate font-mono text-[11px] leading-none text-[#1d1d1f]">
            {column.column_name}
          </span>
          <span className="max-w-28 shrink-0 truncate rounded px-1.5 py-0.5 text-[10px] leading-none text-muted-foreground">
            {column.data_type}
          </span>
        </button>
      ))}
    </div>
  );
}

function columnIcon(dataType: string) {
  const lower = dataType.toLowerCase();
  if (lower.includes("date") || lower.includes("time")) {
    return <Calendar className="size-3 shrink-0 text-amber-600" />;
  }
  if (lower.includes("int") || lower.includes("float") || lower.includes("decimal")) {
    return <Hash className="size-3 shrink-0 text-emerald-600" />;
  }
  if (lower.includes("json") || lower.includes("map") || lower.includes("array")) {
    return <Braces className="size-3 shrink-0 text-teal-600" />;
  }
  return <Type className="size-3 shrink-0 text-sky-600" />;
}

function objectKey(object: DataExplorerObjectSummary) {
  return [object.object_type, object.object_name].join(".");
}
