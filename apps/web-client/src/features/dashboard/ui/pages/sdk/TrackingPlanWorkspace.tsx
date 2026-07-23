import type {
  SdkPublishedSchema,
  TrackingPlan,
  TrackingPlanCreateRequest,
  TrackingPlanEvent,
  TrackingPlanEventInput,
  TrackingPlanEventUpdate,
  TrackingPlanJsonSchema,
  TrackingPlanPropertyType
} from "@loopad/shared";
import {
  TRACKING_PLAN_MAX_SCHEMA_DEPTH,
  TRACKING_PLAN_MAX_SCHEMA_NODES,
  TRACKING_PLAN_RESERVED_ROOT_PROPERTIES,
  TRACKING_PLAN_UNSAFE_PROPERTIES
} from "@loopad/shared";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from "@loopad/ui/shadcn/alert-dialog";
import { Badge } from "@loopad/ui/shadcn/badge";
import { Button } from "@loopad/ui/shadcn/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@loopad/ui/shadcn/card";
import { Checkbox } from "@loopad/ui/shadcn/checkbox";
import { Field, FieldLabel } from "@loopad/ui/shadcn/field";
import { Input } from "@loopad/ui/shadcn/input";
import { NativeSelect, NativeSelectOption } from "@loopad/ui/shadcn/native-select";
import { ScrollArea } from "@loopad/ui/shadcn/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@loopad/ui/shadcn/tabs";
import { Textarea } from "@loopad/ui/shadcn/textarea";
import { cn } from "@loopad/ui/shadcn/utils";
import { Link } from "@tanstack/react-router";
import { SearchIcon } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  describeEventSchemaVersion,
  eventSdkInitCode,
  eventSdkInstallCode,
  eventSdkTrackCode,
  getNewlyPublishedEventNames,
  prioritizeNewlyPublishedEvents
} from "../../../model/sdk-guide.js";
import {
  addTrackingPlanEvent as addStubTrackingPlanEvent,
  createTrackingPlan as createStubTrackingPlan,
  createTrackingPlanFromObservedEvents as createStubTrackingPlanFromObservedEvents,
  deleteTrackingPlanEvent as deleteStubTrackingPlanEvent,
  getTrackingPlan as getStubTrackingPlan,
  updateTrackingPlanEvent as updateStubTrackingPlanEvent
} from "../../../api/tracking-plan-stub.js";
import {
  addTrackingPlanEvent as addConnectedTrackingPlanEvent,
  createTrackingPlan as createConnectedTrackingPlan,
  createTrackingPlanFromObservedEvents as createConnectedTrackingPlanFromObservedEvents,
  deleteTrackingPlanEvent as deleteConnectedTrackingPlanEvent,
  getPublishedTrackingPlanSchema,
  getTrackingPlan as getConnectedTrackingPlan,
  publishTrackingPlan,
  updateTrackingPlanEvent as updateConnectedTrackingPlanEvent
} from "../../../api/tracking-plan-api.js";

type PropertyDraft = {
  id: number;
  name: string;
  required: boolean;
  schema: SchemaDraft;
};

type SchemaDraft = {
  type: TrackingPlanPropertyType;
  properties?: PropertyDraft[];
  items?: SchemaDraft;
};

type TrackingPlanDataSource = {
  addEvent: (projectId: string, event: TrackingPlanEventInput) => Promise<TrackingPlan>;
  create: (projectId: string, request: TrackingPlanCreateRequest) => Promise<TrackingPlan>;
  createFromObservedEvents: (projectId: string) => Promise<TrackingPlan>;
  deleteEvent: (projectId: string, eventName: string) => Promise<TrackingPlan>;
  get: (projectId: string) => Promise<TrackingPlan>;
  updateEvent: (
    projectId: string,
    eventName: string,
    event: TrackingPlanEventUpdate
  ) => Promise<TrackingPlan>;
};

const DEFAULT_DEMO_ORIGIN = "https://demo-shoppingmall.dev.loop-ad.org";
const STUB_TRACKING_PLAN_DATA_SOURCE: TrackingPlanDataSource = {
  addEvent: addStubTrackingPlanEvent,
  create: createStubTrackingPlan,
  createFromObservedEvents: createStubTrackingPlanFromObservedEvents,
  deleteEvent: deleteStubTrackingPlanEvent,
  get: getStubTrackingPlan,
  updateEvent: updateStubTrackingPlanEvent
};
const CONNECTED_TRACKING_PLAN_DATA_SOURCE: TrackingPlanDataSource = {
  addEvent: addConnectedTrackingPlanEvent,
  create: createConnectedTrackingPlan,
  createFromObservedEvents: createConnectedTrackingPlanFromObservedEvents,
  deleteEvent: deleteConnectedTrackingPlanEvent,
  get: getConnectedTrackingPlan,
  updateEvent: updateConnectedTrackingPlanEvent
};
let nextPropertyDraftId = 0;

export function TrackingPlanWorkspace({ projectId }: { projectId: string }) {
  return (
    <TrackingPlanEditorWorkspace
      dataSource={STUB_TRACKING_PLAN_DATA_SOURCE}
      description="마케팅에 사용할 이벤트 이름과 주요 속성 규칙을 관리해요."
      projectId={projectId}
      title="이벤트 관리"
    />
  );
}

export function ConnectedTrackingPlanWorkspace({ projectId }: { projectId: string }) {
  return (
    <TrackingPlanEditorWorkspace
      dataSource={CONNECTED_TRACKING_PLAN_DATA_SOURCE}
      description="이벤트 수집에 사용할 전체 속성 구조와 형식을 세부적으로 조정해요."
      projectId={projectId}
      title="이벤트 세부 조정"
    />
  );
}

function TrackingPlanEditorWorkspace({
  dataSource,
  description,
  projectId,
  title
}: {
  dataSource: TrackingPlanDataSource;
  description: string;
  projectId: string;
  title: string;
}) {
  const [plan, setPlan] = useState<TrackingPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creationMode, setCreationMode] = useState<"basic" | "observed" | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void dataSource
      .get(projectId)
      .then((value) => {
        if (!cancelled) setPlan(value);
      })
      .catch(() => {
        if (!cancelled) setPlan(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [dataSource, projectId]);

  async function run(action: () => Promise<TrackingPlan>) {
    setError(null);
    try {
      setPlan(await action());
      return true;
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "요청을 처리하지 못했어요. 다시 시도해 주세요."
      );
      return false;
    }
  }

  async function createInitialPlan(mode: "basic" | "observed") {
    setCreationMode(mode);
    try {
      if (mode === "observed") {
        await run(() => dataSource.createFromObservedEvents(projectId));
        return;
      }
      await run(() =>
        dataSource.create(projectId, {
          name: "Default Tracking Plan",
          allowedOrigins: [DEFAULT_DEMO_ORIGIN]
        })
      );
    } finally {
      setCreationMode(null);
    }
  }

  if (loading)
    return <p className="text-sm text-muted-foreground">이벤트 설정을 불러오고 있어요.</p>;

  if (!plan) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>아직 이벤트 설정이 없어요</CardTitle>
          <CardDescription>
            데모 사이트가 최근 30일 동안 보낸 이벤트 이름과 속성 타입으로 초안을 만들 수 있어요.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={creationMode !== null}
              onClick={() => void createInitialPlan("observed")}
            >
              {creationMode === "observed"
                ? "이벤트 형식 확인 중…"
                : "수집 중인 이벤트로 자동 생성"}
            </Button>
            <Button
              disabled={creationMode !== null}
              onClick={() => void createInitialPlan("basic")}
              variant="outline"
            >
              {creationMode === "basic" ? "기본 플랜 만드는 중…" : "기본 플랜 만들기"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            자동 생성은 최근 수집 데이터에서 이벤트별 속성 타입과 필수 필드를 추론해요. 생성 후
            내용을 확인하고 게시해 주세요.
          </p>
          {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{title}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link params={{ projectId }} to="/developer/$projectId">
              개발자 페이지
            </Link>
          </Button>
        </div>
      </div>
      {error ? (
        <p className="rounded-md border border-destructive/30 p-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <EventDesigner
        clearError={() => setError(null)}
        dataSource={dataSource}
        plan={plan}
        run={run}
      />
    </div>
  );
}

export function DeveloperWorkspace({
  advertisementGuide,
  projectId
}: {
  advertisementGuide: ReactNode;
  projectId: string;
}) {
  const [plan, setPlan] = useState<TrackingPlan | null>(null);
  const [publishedSchema, setPublishedSchema] = useState<SdkPublishedSchema | null>(null);
  const [previousSchema, setPreviousSchema] = useState<SdkPublishedSchema | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmingVersion, setConfirmingVersion] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void getConnectedTrackingPlan(projectId)
      .then(async (value) => {
        const schema =
          value.publishedRevision === null ? null : await getPublishedTrackingPlanSchema(projectId);
        const previous =
          schema && schema.revision > 1
            ? await getPublishedTrackingPlanSchema(projectId, schema.revision - 1)
            : null;
        if (!cancelled) {
          setPlan(value);
          setPublishedSchema(schema);
          setPreviousSchema(previous);
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setPlan(null);
          setError(cause instanceof Error ? cause.message : "SDK 설정을 불러오지 못했어요.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  async function confirmEventVersion() {
    setConfirmingVersion(true);
    setError(null);
    try {
      const nextPlan = await publishTrackingPlan(projectId);
      setPlan(nextPlan);
      try {
        const nextSchema = await getPublishedTrackingPlanSchema(projectId);
        const previous =
          publishedSchema ??
          (nextSchema.revision > 1
            ? await getPublishedTrackingPlanSchema(projectId, nextSchema.revision - 1)
            : null);
        setPublishedSchema(nextSchema);
        setPreviousSchema(previous);
      } catch {
        setError("발급은 완료됐지만 연동 가이드를 갱신하지 못했어요. 페이지를 새로고침해 주세요.");
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "이벤트 스키마를 발급하지 못했어요.");
    } finally {
      setConfirmingVersion(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">개발자 설정을 불러오고 있어요.</p>;
  }

  if (!plan) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>이벤트 설정이 필요해요</CardTitle>
          <CardDescription>
            마케팅 이벤트 관리 화면에서 이벤트 규칙을 먼저 만들어 주세요.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link params={{ projectId, tabPath: "sdk" }} to="/dashboard/$projectId/$tabPath">
              이벤트 관리로 이동
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6">
      <header className="grid gap-2 border-b border-border pb-6">
        <h1 className="text-3xl font-semibold tracking-tight">개발자 페이지</h1>
        <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
          버전이 명시된 SDK 설치 코드와 이벤트·광고 연동 절차를 확인합니다.
        </p>
      </header>
      {error ? (
        <p className="rounded-md border border-destructive/30 p-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <EventVersionPanel
        confirming={confirmingVersion}
        onConfirm={() => void confirmEventVersion()}
        plan={plan}
      />
      <DeveloperGuide
        advertisementGuide={advertisementGuide}
        plan={plan}
        previousSchema={previousSchema}
        publishedSchema={publishedSchema}
      />
    </div>
  );
}

function EventVersionPanel({
  confirming,
  onConfirm,
  plan
}: {
  confirming: boolean;
  onConfirm: () => void;
  plan: TrackingPlan;
}) {
  const hasPendingChanges = plan.status === "draft";
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">이벤트 스키마 버전</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center justify-between gap-4">
        <div className="grid gap-1">
          <span className="text-xs text-muted-foreground">현재 확정 버전</span>
          <strong className="text-lg">
            이벤트 스키마 {formatEventRevision(plan.publishedRevision)}
          </strong>
        </div>
        <Button
          aria-busy={confirming}
          disabled={!hasPendingChanges || plan.events.length === 0 || confirming}
          onClick={onConfirm}
        >
          {confirming ? "발급 중…" : "발급"}
        </Button>
      </CardContent>
    </Card>
  );
}

function formatEventRevision(revision: number | null) {
  return revision === null ? "아직 확정된 버전 없음" : `v${revision}`;
}

function EventDesigner({
  clearError,
  dataSource,
  plan,
  run
}: {
  clearError: () => void;
  dataSource: TrackingPlanDataSource;
  plan: TrackingPlan;
  run: (action: () => Promise<TrackingPlan>) => Promise<boolean>;
}) {
  const [mode, setMode] = useState<"view" | "create" | "edit">("view");
  const [selectedEventName, setSelectedEventName] = useState<string | null>(
    plan.events[0]?.eventName ?? null
  );
  const [query, setQuery] = useState("");
  const [eventName, setEventName] = useState("");
  const [description, setDescription] = useState("");
  const [properties, setProperties] = useState<PropertyDraft[]>([]);
  const [autoGenerating, setAutoGenerating] = useState(false);
  const [initialDraftSignature, setInitialDraftSignature] = useState(() =>
    trackingPlanEventDraftSignature("", "", [])
  );
  const [pendingEventName, setPendingEventName] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const selected =
    plan.events.find((event) => event.eventName === selectedEventName) ?? plan.events[0] ?? null;
  const normalizedQuery = query.trim().toLowerCase();
  const visibleEvents = plan.events.filter((event) => {
    if (!normalizedQuery) return true;
    return `${event.eventName} ${event.description}`.toLowerCase().includes(normalizedQuery);
  });
  const propertyIssues = validatePropertyDrafts(properties);
  const hasUnsavedChanges =
    mode !== "view" &&
    initialDraftSignature !== trackingPlanEventDraftSignature(eventName, description, properties);

  function resetDraft() {
    setEventName("");
    setDescription("");
    setProperties([]);
    setInitialDraftSignature(trackingPlanEventDraftSignature("", "", []));
  }

  function switchToEvent(event: TrackingPlanEvent) {
    clearError();
    resetDraft();
    setSelectedEventName(event.eventName);
    setMode("view");
  }

  function showEvent(event: TrackingPlanEvent) {
    if (hasUnsavedChanges) {
      setPendingEventName(event.eventName);
      return;
    }
    switchToEvent(event);
  }

  function discardDraftAndShowPendingEvent() {
    const event = plan.events.find((candidate) => candidate.eventName === pendingEventName);
    setPendingEventName(null);
    if (event) switchToEvent(event);
  }

  function startCreate() {
    clearError();
    resetDraft();
    setMode("create");
  }

  function startEdit(event: TrackingPlanEvent) {
    clearError();
    const nextProperties = propertiesFromSchema(event.propertiesSchema);
    setSelectedEventName(event.eventName);
    setEventName(event.eventName);
    setDescription(event.description);
    setProperties(nextProperties);
    setInitialDraftSignature(
      trackingPlanEventDraftSignature(event.eventName, event.description, nextProperties)
    );
    setMode("edit");
  }

  function cancelEditing() {
    clearError();
    resetDraft();
    setMode("view");
  }

  async function save() {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    const propertiesSchema = schemaFromProperties(properties);
    try {
      if (mode === "edit" && selected) {
        const saved = await run(() =>
          dataSource.updateEvent(plan.projectId, selected.eventName, {
            description,
            propertiesSchema
          })
        );
        if (saved) {
          resetDraft();
          setMode("view");
        }
        return;
      }

      const nextEventName = eventName.trim();
      const saved = await run(() =>
        dataSource.addEvent(plan.projectId, {
          eventName: nextEventName,
          description,
          propertiesSchema
        })
      );
      if (saved) {
        resetDraft();
        setSelectedEventName(nextEventName);
        setMode("view");
      }
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  async function removeEvent(event: TrackingPlanEvent) {
    const deleted = await run(() => dataSource.deleteEvent(plan.projectId, event.eventName));
    if (deleted) setMode("view");
  }

  async function autoGenerateEvents() {
    setAutoGenerating(true);
    try {
      await run(() => dataSource.createFromObservedEvents(plan.projectId));
    } finally {
      setAutoGenerating(false);
    }
  }

  const isEdit = mode === "edit" && selected !== null;
  const selectedPropertyCount = selected
    ? propertyContractRows(selected.propertiesSchema).length
    : 0;

  return (
    <Card className="overflow-hidden py-0">
      <CardContent className="p-0">
        <div className="grid lg:min-h-[640px] lg:grid-cols-[minmax(280px,1fr)_minmax(0,2fr)]">
          <section className="flex min-h-0 flex-col border-b bg-muted/20 lg:border-r lg:border-b-0">
            <div className="grid gap-3 border-b p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold">이벤트 목록</h2>
                  <Badge variant="secondary">{plan.events.length}</Badge>
                </div>
                <Button disabled={mode !== "view" || saving} onClick={startCreate} size="sm">
                  이벤트 추가
                </Button>
              </div>
              {plan.events.length > 0 ? (
                <div className="relative">
                  <SearchIcon
                    aria-hidden="true"
                    className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                  />
                  <Input
                    aria-label="이벤트 검색"
                    className="bg-background pl-9"
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="이벤트 검색"
                    value={query}
                  />
                </div>
              ) : null}
            </div>

            {plan.events.length > 0 ? (
              <ScrollArea className="h-[320px] lg:h-[560px]">
                <div className="grid gap-1 p-2">
                  {visibleEvents.map((event) => {
                    const propertyCount = propertyContractRows(event.propertiesSchema).length;
                    const isSelected = selected?.eventName === event.eventName && mode !== "create";
                    return (
                      <button
                        aria-current={isSelected ? "true" : undefined}
                        className={cn(
                          "grid w-full gap-1 rounded-md border border-transparent px-3 py-2.5 text-left transition-colors",
                          isSelected
                            ? "border-primary/25 bg-primary/10 text-foreground"
                            : "hover:border-border hover:bg-background"
                        )}
                        disabled={saving}
                        key={event.eventName}
                        onClick={() => showEvent(event)}
                        type="button"
                      >
                        <span className="flex min-w-0 items-center justify-between gap-3">
                          <strong className="truncate text-sm font-medium">
                            {event.eventName}
                          </strong>
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {propertyCount}개
                          </span>
                        </span>
                        <span className="line-clamp-1 text-xs text-muted-foreground">
                          {event.description || "설명 없음"}
                        </span>
                      </button>
                    );
                  })}
                  {visibleEvents.length === 0 ? (
                    <p className="p-6 text-center text-sm text-muted-foreground">
                      검색 결과가 없어요.
                    </p>
                  ) : null}
                </div>
              </ScrollArea>
            ) : (
              <div className="grid flex-1 place-items-center p-6 text-center">
                <div className="grid justify-items-center gap-3">
                  <div className="grid gap-1">
                    <p className="text-sm font-medium">등록한 이벤트가 없어요.</p>
                    <p className="text-xs text-muted-foreground">
                      수집 데이터를 바탕으로 만들거나 직접 추가해 주세요.
                    </p>
                  </div>
                  <Button
                    disabled={autoGenerating}
                    onClick={() => void autoGenerateEvents()}
                    size="sm"
                    variant="outline"
                  >
                    {autoGenerating ? "이벤트 형식 확인 중…" : "수집 이벤트로 자동 생성"}
                  </Button>
                </div>
              </div>
            )}
          </section>

          <section className="flex min-h-[420px] min-w-0 flex-col bg-background">
            {mode === "view" && selected ? (
              <>
                <div className="flex flex-col gap-4 border-b p-5 sm:flex-row sm:items-start sm:justify-between">
                  <div className="grid min-w-0 gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="break-all text-xl font-semibold">{selected.eventName}</h2>
                      <Badge variant="outline">속성 {selectedPropertyCount}개</Badge>
                    </div>
                    <p className="text-sm leading-6 text-muted-foreground">
                      {selected.description || "설명 없음"}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button onClick={() => startEdit(selected)} size="sm" variant="outline">
                      수정
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="ghost">
                          삭제
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            {selected.eventName} 이벤트를 삭제할까요?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            이벤트 규칙이 목록에서 제거됩니다. 삭제 후에는 되돌릴 수 없어요.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>취소</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={(event) => {
                              event.preventDefault();
                              void removeEvent(selected);
                            }}
                            variant="destructive"
                          >
                            이벤트 삭제
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
                <ScrollArea className="min-h-0 flex-1 lg:h-[550px]">
                  <div className="grid gap-3 p-5">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-sm font-semibold">속성 구조</h3>
                      <span className="text-xs text-muted-foreground">이름 · 형식 · 필수 여부</span>
                    </div>
                    <PropertyContract event={selected} />
                  </div>
                </ScrollArea>
              </>
            ) : null}

            {mode === "view" && !selected ? (
              <div className="grid flex-1 place-items-center p-8 text-center">
                <div className="grid gap-2">
                  <p className="font-medium">이벤트를 선택해 주세요.</p>
                  <p className="text-sm text-muted-foreground">
                    선택한 이벤트의 설명과 속성 구조가 여기에 표시됩니다.
                  </p>
                </div>
              </div>
            ) : null}

            {mode === "create" || (mode === "edit" && selected) ? (
              <>
                <div className="grid gap-1 border-b p-5">
                  <h2 className="text-xl font-semibold">
                    {isEdit ? `${selected?.eventName} 수정` : "이벤트 추가"}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    이벤트 설명과 수집할 속성 구조를 설정해 주세요.
                  </p>
                </div>
                <ScrollArea className="min-h-0 flex-1 lg:h-[480px]">
                  <div className="grid content-start gap-4 p-5">
                    <Field>
                      <FieldLabel htmlFor="tracking-plan-event-name">이벤트명</FieldLabel>
                      <Input
                        disabled={isEdit}
                        id="tracking-plan-event-name"
                        value={eventName}
                        onChange={(event) => setEventName(event.target.value)}
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="tracking-plan-event-description">설명</FieldLabel>
                      <Textarea
                        className="min-h-20"
                        id="tracking-plan-event-description"
                        value={description}
                        onChange={(event) => setDescription(event.target.value)}
                      />
                    </Field>
                    <div className="grid gap-2">
                      <PropertyList
                        parentDepth={0}
                        properties={properties}
                        onChange={setProperties}
                      />
                      {propertyIssues.length > 0 ? (
                        <div className="rounded-md border border-destructive/30 p-3 text-sm text-destructive">
                          {propertyIssues.map((issue) => (
                            <p key={issue}>{issue}</p>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </ScrollArea>
                <div className="flex flex-col gap-2 border-t p-4 sm:flex-row sm:justify-end">
                  <Button disabled={saving} variant="outline" onClick={cancelEditing}>
                    취소
                  </Button>
                  <Button
                    aria-busy={saving}
                    disabled={saving || !eventName.trim() || propertyIssues.length > 0}
                    onClick={() => void save()}
                  >
                    {saving ? "저장 중…" : "저장"}
                  </Button>
                </div>
              </>
            ) : null}
          </section>
        </div>
        <AlertDialog
          open={pendingEventName !== null}
          onOpenChange={(open) => {
            if (!open) setPendingEventName(null);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>변경사항을 버릴까요?</AlertDialogTitle>
              <AlertDialogDescription>
                저장하지 않은 이벤트 내용은 사라져요. 계속 작성하거나 변경사항을 버리고 다른
                이벤트로 이동할 수 있어요.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>계속 작성</AlertDialogCancel>
              <AlertDialogAction onClick={discardDraftAndShowPendingEvent}>
                변경사항 버리기
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}

function PropertyList({
  onChange,
  parentDepth,
  properties
}: {
  onChange: (properties: PropertyDraft[]) => void;
  parentDepth: number;
  properties: PropertyDraft[];
}) {
  const canAdd = parentDepth < TRACKING_PLAN_MAX_SCHEMA_DEPTH;
  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between">
        <strong className="text-sm">
          {parentDepth === 0 ? "속성" : `하위 속성 · depth ${parentDepth + 1}`}
        </strong>
        <Button
          disabled={!canAdd}
          size="sm"
          variant="outline"
          onClick={() => onChange([...properties, newPropertyDraft()])}
        >
          속성 추가
        </Button>
      </div>
      {!canAdd ? (
        <p className="text-xs text-muted-foreground">
          속성은 {TRACKING_PLAN_MAX_SCHEMA_DEPTH}단계까지만 추가할 수 있어요.
        </p>
      ) : null}
      {properties.map((property, index) => {
        const schemaDepth = parentDepth + 1;
        return (
          <div className="grid gap-3 rounded-md border p-3" key={property.id}>
            <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_160px_auto_auto]">
              <Input
                placeholder="property_name"
                value={property.name}
                onChange={(event) =>
                  onChange(replaceAt(properties, index, { ...property, name: event.target.value }))
                }
              />
              <SchemaTypeSelect
                depth={schemaDepth}
                schema={property.schema}
                onChange={(schema) =>
                  onChange(replaceAt(properties, index, { ...property, schema }))
                }
              />
              <Field orientation="horizontal">
                <Checkbox
                  checked={property.required}
                  id={`property-required-${property.id}`}
                  onCheckedChange={(checked) =>
                    onChange(
                      replaceAt(properties, index, {
                        ...property,
                        required: checked === true
                      })
                    )
                  }
                />
                <FieldLabel htmlFor={`property-required-${property.id}`}>필수</FieldLabel>
              </Field>
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  onChange(properties.filter((_, propertyIndex) => propertyIndex !== index))
                }
              >
                삭제
              </Button>
            </div>
            <NestedSchemaEditor
              depth={schemaDepth}
              schema={property.schema}
              onChange={(schema) => onChange(replaceAt(properties, index, { ...property, schema }))}
            />
          </div>
        );
      })}
    </div>
  );
}

function SchemaTypeSelect({
  depth,
  onChange,
  schema
}: {
  depth: number;
  onChange: (schema: SchemaDraft) => void;
  schema: SchemaDraft;
}) {
  const types = (
    ["string", "number", "integer", "boolean", "object", "array"] as TrackingPlanPropertyType[]
  ).filter((type) => type !== "array" || depth < TRACKING_PLAN_MAX_SCHEMA_DEPTH);
  return (
    <NativeSelect
      size="sm"
      value={schema.type}
      onChange={(event) => onChange(newSchemaDraft(event.target.value as TrackingPlanPropertyType))}
    >
      {types.map((type) => (
        <NativeSelectOption key={type}>{type}</NativeSelectOption>
      ))}
    </NativeSelect>
  );
}

function NestedSchemaEditor({
  depth,
  onChange,
  schema
}: {
  depth: number;
  onChange: (schema: SchemaDraft) => void;
  schema: SchemaDraft;
}) {
  if (schema.type === "object") {
    return (
      <div className="ml-3 border-l pl-3">
        <PropertyList
          parentDepth={depth}
          properties={schema.properties ?? []}
          onChange={(properties) => onChange({ type: "object", properties })}
        />
      </div>
    );
  }
  if (schema.type === "array") {
    const items = schema.items ?? newSchemaDraft("string");
    return (
      <div className="ml-3 grid gap-2 border-l pl-3">
        <span className="text-xs font-medium text-muted-foreground">
          배열 item · depth {depth + 1}
        </span>
        <SchemaTypeSelect
          depth={depth + 1}
          schema={items}
          onChange={(nextItems) => onChange({ type: "array", items: nextItems })}
        />
        <NestedSchemaEditor
          depth={depth + 1}
          schema={items}
          onChange={(nextItems) => onChange({ type: "array", items: nextItems })}
        />
      </div>
    );
  }
  return null;
}

function DeveloperGuide({
  advertisementGuide,
  plan,
  previousSchema,
  publishedSchema
}: {
  advertisementGuide: ReactNode;
  plan: TrackingPlan;
  previousSchema: SdkPublishedSchema | null;
  publishedSchema: SdkPublishedSchema | null;
}) {
  return (
    <section className="grid gap-4">
      <div className="grid gap-1">
        <h2 className="text-xl font-semibold">연동 가이드</h2>
        <p className="text-sm text-muted-foreground">
          이벤트 수집과 광고 지면 연동 코드를 프로젝트에 적용합니다.
        </p>
      </div>
      <Tabs defaultValue="collection">
        <TabsList>
          <TabsTrigger value="collection">이벤트 수집</TabsTrigger>
          <TabsTrigger value="advertisement">광고 연동</TabsTrigger>
        </TabsList>
        <TabsContent value="collection">
          <CollectionGuide
            key={publishedSchema?.revision ?? "unpublished"}
            plan={plan}
            previousSchema={previousSchema}
            publishedSchema={publishedSchema}
          />
        </TabsContent>
        <TabsContent value="advertisement">{advertisementGuide}</TabsContent>
      </Tabs>
    </section>
  );
}

function CollectionGuide({
  plan,
  previousSchema,
  publishedSchema
}: {
  plan: TrackingPlan;
  previousSchema: SdkPublishedSchema | null;
  publishedSchema: SdkPublishedSchema | null;
}) {
  const hasPendingChanges = plan.status === "draft";
  const isPublishedGuideReady =
    !hasPendingChanges && publishedSchema?.revision === plan.publishedRevision;
  const newEventNames = getNewlyPublishedEventNames({ previousSchema, publishedSchema });
  const guideEvents = prioritizeNewlyPublishedEvents(publishedSchema?.events ?? [], newEventNames);
  const [selectedEventName, setSelectedEventName] = useState(guideEvents[0]?.eventName ?? "");
  const selectedEvent =
    guideEvents.find((event) => event.eventName === selectedEventName) ?? guideEvents[0] ?? null;
  const installCode = eventSdkInstallCode();
  const initCode = eventSdkInitCode(plan.projectId, plan.sdkKey);
  const versionDescription = describeEventSchemaVersion({
    draftEvents: plan.events,
    hasPendingChanges,
    previousSchema,
    publishedSchema
  });

  return (
    <article className="grid gap-5">
      <header className="grid gap-2 border-b pb-5">
        <h2 className="text-2xl font-semibold">이벤트 수집 SDK 연동</h2>
      </header>

      {isPublishedGuideReady ? (
        <>
          <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
            <p>
              이벤트 스키마는 SDK 패키지와 별도로 버전 관리되며, SDK는 최신 확정본을 자동으로
              사용합니다.
            </p>
            <p className="mt-2">{versionDescription}</p>
          </div>

          <GuideSection
            description="현재 배포된 SDK 패키지 파일을 연결합니다. SDK 패키지 자체를 업데이트할 때만 스크립트 URL의 패키지 버전을 변경하세요."
            title="1. 수집 SDK 설치"
          >
            <GuideCode code={installCode} />
          </GuideSection>

          <GuideSection
            description="프로젝트 ID와 공개 write key로 SDK를 시작합니다. 별도 연결 설정이나 DB 변경은 필요하지 않습니다."
            title="2. 프로젝트 연결"
          >
            <GuideCode code={initCode} />
          </GuideSection>

          <GuideSection
            description="개발 빌드의 오른쪽 아래 LoopAd 버튼에서 SDK 상태를 확인해요."
            title="3. SDK DevTools"
          >
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <DebugFeature label="개요" value="프로젝트 · identity · 버전" />
              <DebugFeature label="이벤트" value="이름 · 속성 · 발생 시각" />
              <DebugFeature label="로그" value="수집 · 전송 · 실패 사유" />
              <DebugFeature label="요청" value="상태 · HTTP · 크기" />
            </div>
          </GuideSection>

          <GuideSection
            description="마케터가 관리하는 이벤트를 고르면 속성과 전송 예제가 함께 바뀝니다."
            title="4. 이벤트 전송"
          >
            {selectedEvent ? (
              <div className="grid gap-4">
                <Field>
                  <FieldLabel htmlFor="tracking-plan-guide-event">이벤트</FieldLabel>
                  <NativeSelect
                    id="tracking-plan-guide-event"
                    value={selectedEvent.eventName}
                    onChange={(event) => setSelectedEventName(event.target.value)}
                  >
                    {guideEvents.map((event) => (
                      <NativeSelectOption key={event.eventName} value={event.eventName}>
                        {event.eventName}
                        {newEventNames.has(event.eventName) ? " · NEW" : ""}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </Field>
                <p className="text-sm text-muted-foreground">
                  {selectedEvent.description || "아직 등록한 설명이 없어요."}
                </p>
                <PropertyContract event={selectedEvent} />
                <GuideCode code={eventSdkTrackCode(selectedEvent)} />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                확정된 이벤트가 없습니다. 이벤트 스키마 버전을 먼저 확정해 주세요.
              </p>
            )}
          </GuideSection>
        </>
      ) : null}
    </article>
  );
}

function DebugFeature({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 rounded-md border p-3">
      <strong className="text-sm">{label}</strong>
      <span className="text-xs text-muted-foreground">{value}</span>
    </div>
  );
}

function GuideSection({
  children,
  description,
  title
}: {
  children: ReactNode;
  description: string;
  title: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription className="leading-6">{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function GuideCode({ code }: { code: string }) {
  return (
    <pre className="overflow-auto rounded-md bg-brand-ink-deep p-4 text-sm leading-6 text-white">
      <code>{code}</code>
    </pre>
  );
}

function PropertyContract({ event }: { event: TrackingPlanEvent }) {
  const rows = propertyContractRows(event.propertiesSchema);
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">추가 속성 없음</p>;
  }
  return (
    <div className="overflow-hidden rounded-md border">
      {rows.map((row) => (
        <div
          className="grid grid-cols-[minmax(0,1fr)_100px_60px] gap-3 border-b px-3 py-2 text-sm last:border-b-0"
          key={row.path}
        >
          <code className="break-all">{row.path}</code>
          <span>{row.type}</span>
          <span>{row.required ? "필수" : "선택"}</span>
        </div>
      ))}
    </div>
  );
}

function replaceAt<T>(values: T[], index: number, value: T) {
  return values.map((item, itemIndex) => (itemIndex === index ? value : item));
}

function schemaFromProperties(properties: PropertyDraft[]): TrackingPlanJsonSchema {
  return {
    type: "object",
    properties: Object.fromEntries(
      properties.map((property) => [property.name.trim(), schemaFromDraft(property.schema)])
    ),
    required: properties
      .filter((property) => property.required)
      .map((property) => property.name.trim())
  };
}

function trackingPlanEventDraftSignature(
  eventName: string,
  description: string,
  properties: PropertyDraft[]
) {
  return JSON.stringify({
    description,
    eventName,
    propertiesSchema: schemaFromProperties(properties)
  });
}

function propertiesFromSchema(schema: TrackingPlanJsonSchema): PropertyDraft[] {
  const required = new Set(schema.required ?? []);
  return Object.entries(schema.properties ?? {}).map(([name, property]) => ({
    id: nextPropertyDraftId++,
    name,
    required: required.has(name),
    schema: draftFromSchema(property)
  }));
}

function newPropertyDraft(): PropertyDraft {
  return {
    id: nextPropertyDraftId++,
    name: "",
    required: false,
    schema: newSchemaDraft("string")
  };
}

function newSchemaDraft(type: TrackingPlanPropertyType): SchemaDraft {
  if (type === "object") return { type, properties: [] };
  if (type === "array") return { type, items: { type: "string" } };
  return { type };
}

function draftFromSchema(schema: TrackingPlanJsonSchema): SchemaDraft {
  if (schema.type === "object") {
    return { type: "object", properties: propertiesFromSchema(schema) };
  }
  if (schema.type === "array") {
    return {
      type: "array",
      items: schema.items ? draftFromSchema(schema.items) : newSchemaDraft("string")
    };
  }
  return { type: schema.type };
}

function schemaFromDraft(schema: SchemaDraft): TrackingPlanJsonSchema {
  if (schema.type === "object") {
    return schemaFromProperties(schema.properties ?? []);
  }
  if (schema.type === "array") {
    return {
      type: "array",
      items: schemaFromDraft(schema.items ?? newSchemaDraft("string"))
    };
  }
  return { type: schema.type };
}

function validatePropertyDrafts(properties: PropertyDraft[]): string[] {
  const issues: string[] = [];
  const state = { nodes: 1, nodeLimitReported: false };
  const unsafe = new Set<string>(TRACKING_PLAN_UNSAFE_PROPERTIES);
  const reserved = new Set<string>(TRACKING_PLAN_RESERVED_ROOT_PROPERTIES);

  function visitProperties(current: PropertyDraft[], parentDepth: number, path: string) {
    const names = new Set<string>();
    for (const property of current) {
      const name = property.name.trim();
      const propertyPath = name ? `${path}.${name}` : `${path}.<이름 없음>`;
      if (!name) issues.push(`${path}: 속성 이름을 입력해 주세요.`);
      if (property.name !== name) issues.push(`${propertyPath}: 앞뒤 공백을 지워 주세요.`);
      if (names.has(name)) issues.push(`${propertyPath}: 같은 객체에 중복된 속성명입니다.`);
      names.add(name);
      if (unsafe.has(name)) issues.push(`${propertyPath}: 사용할 수 없는 속성명입니다.`);
      if (parentDepth === 0 && reserved.has(name)) {
        issues.push(`${propertyPath}: SDK가 예약한 최상위 속성명입니다.`);
      }
      visitSchema(property.schema, parentDepth + 1, propertyPath);
    }
  }

  function visitSchema(schema: SchemaDraft, depth: number, path: string) {
    state.nodes += 1;
    if (state.nodes > TRACKING_PLAN_MAX_SCHEMA_NODES && !state.nodeLimitReported) {
      issues.push(`schema node는 최대 ${TRACKING_PLAN_MAX_SCHEMA_NODES}개입니다.`);
      state.nodeLimitReported = true;
    }
    if (depth > TRACKING_PLAN_MAX_SCHEMA_DEPTH) {
      issues.push(`${path}: 속성은 ${TRACKING_PLAN_MAX_SCHEMA_DEPTH}단계까지만 추가할 수 있어요.`);
      return;
    }
    if (schema.type === "object") {
      visitProperties(schema.properties ?? [], depth, path);
    } else if (schema.type === "array") {
      visitSchema(schema.items ?? newSchemaDraft("string"), depth + 1, `${path}[]`);
    }
  }

  visitProperties(properties, 0, "properties");
  return [...new Set(issues)];
}

function propertyContractRows(
  schema: TrackingPlanJsonSchema,
  prefix = ""
): Array<{ path: string; type: TrackingPlanPropertyType; required: boolean }> {
  if (schema.type !== "object") return [];
  const required = new Set(schema.required ?? []);
  return Object.entries(schema.properties ?? {}).flatMap(([name, child]) => {
    const path = prefix ? `${prefix}.${name}` : name;
    const row = { path, type: child.type, required: required.has(name) };
    if (child.type === "object") {
      return [row, ...propertyContractRows(child, path)];
    }
    if (child.type === "array" && child.items?.type === "object") {
      return [row, ...propertyContractRows(child.items, `${path}[]`)];
    }
    return [row];
  });
}
