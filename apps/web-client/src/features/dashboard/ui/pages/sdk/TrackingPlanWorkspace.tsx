import type {
  SdkPublishedSchema,
  TrackingPlan,
  TrackingPlanEvent,
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
import { Button } from "@loopad/ui/shadcn/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@loopad/ui/shadcn/card";
import { Checkbox } from "@loopad/ui/shadcn/checkbox";
import { Field, FieldLabel } from "@loopad/ui/shadcn/field";
import { Input } from "@loopad/ui/shadcn/input";
import { NativeSelect, NativeSelectOption } from "@loopad/ui/shadcn/native-select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@loopad/ui/shadcn/tabs";
import { Textarea } from "@loopad/ui/shadcn/textarea";
import { Link } from "@tanstack/react-router";
import { XIcon } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import {
  describeEventSchemaVersion,
  eventSdkInitCode,
  eventSdkInstallCode,
  eventSdkTrackCode
} from "../../../model/sdk-guide.js";
import {
  addTrackingPlanEvent,
  createTrackingPlan,
  createTrackingPlanFromObservedEvents,
  deleteTrackingPlanEvent,
  getPublishedTrackingPlanSchema,
  getTrackingPlan,
  publishTrackingPlan,
  updateTrackingPlanEvent
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

const DEFAULT_DEMO_ORIGIN = "https://demo-shoppingmall.dev.loop-ad.org";
let nextPropertyDraftId = 0;

export function TrackingPlanWorkspace({ projectId }: { projectId: string }) {
  const [plan, setPlan] = useState<TrackingPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creationMode, setCreationMode] = useState<"basic" | "observed" | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void getTrackingPlan(projectId)
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
  }, [projectId]);

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
        await run(() => createTrackingPlanFromObservedEvents(projectId));
        return;
      }
      await run(() =>
        createTrackingPlan(projectId, {
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
          <h1 className="text-2xl font-semibold">이벤트 관리</h1>
          <p className="text-sm text-muted-foreground">
            마케팅에 사용할 이벤트 이름과 속성 규칙을 관리해요.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link params={{ projectId }} to="/developer/$projectId">
            개발자 페이지
          </Link>
        </Button>
      </div>
      {error ? (
        <p className="rounded-md border border-destructive/30 p-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <EventDesigner plan={plan} run={run} />
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
    void getTrackingPlan(projectId)
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
      const nextSchema = await getPublishedTrackingPlanSchema(projectId);
      const previous =
        publishedSchema ??
        (nextSchema.revision > 1
          ? await getPublishedTrackingPlanSchema(projectId, nextSchema.revision - 1)
          : null);
      setPlan(nextPlan);
      setPublishedSchema(nextSchema);
      setPreviousSchema(previous);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "새 이벤트 버전을 확정하지 못했어요.");
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
      <header className="grid gap-2 border-b border-black/10 pb-6">
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
          disabled={!hasPendingChanges || plan.events.length === 0 || confirming}
          onClick={onConfirm}
        >
          {confirming
            ? "버전 확정 중…"
            : plan.publishedRevision === null
              ? "첫 버전 확정"
              : "새 버전 확정"}
        </Button>
      </CardContent>
    </Card>
  );
}

function formatEventRevision(revision: number | null) {
  return revision === null ? "아직 확정된 버전 없음" : `v${revision}`;
}

function EventDesigner({
  plan,
  run
}: {
  plan: TrackingPlan;
  run: (action: () => Promise<TrackingPlan>) => Promise<boolean>;
}) {
  const [mode, setMode] = useState<"view" | "create" | "edit">("view");
  const [panelOpen, setPanelOpen] = useState(false);
  const [selected, setSelected] = useState<TrackingPlanEvent | null>(null);
  const [eventName, setEventName] = useState("");
  const [description, setDescription] = useState("");
  const [properties, setProperties] = useState<PropertyDraft[]>([]);
  const propertyIssues = validatePropertyDrafts(properties);

  function closePanel() {
    setPanelOpen(false);
  }

  function showEvent(event: TrackingPlanEvent) {
    setSelected(event);
    setMode("view");
    setPanelOpen(true);
  }

  function startCreate() {
    setSelected(null);
    setEventName("");
    setDescription("");
    setProperties([]);
    setMode("create");
    setPanelOpen(true);
  }

  function startEdit(event: TrackingPlanEvent) {
    setSelected(event);
    setEventName(event.eventName);
    setDescription(event.description);
    setProperties(propertiesFromSchema(event.propertiesSchema));
    setMode("edit");
    setPanelOpen(true);
  }

  async function save() {
    const propertiesSchema = schemaFromProperties(properties);
    if (mode === "edit" && selected) {
      const saved = await run(() =>
        updateTrackingPlanEvent(plan.projectId, selected.eventName, {
          description,
          propertiesSchema
        })
      );
      if (saved) closePanel();
      return;
    }

    const nextEventName = eventName.trim();
    const saved = await run(() =>
      addTrackingPlanEvent(plan.projectId, {
        eventName: nextEventName,
        description,
        propertiesSchema
      })
    );
    if (saved) closePanel();
  }

  async function removeEvent(event: TrackingPlanEvent) {
    const deleted = await run(() => deleteTrackingPlanEvent(plan.projectId, event.eventName));
    if (deleted) closePanel();
  }

  const isEdit = mode === "edit" && selected !== null;

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4">
        <CardTitle className="text-base">이벤트 목록</CardTitle>
        <Button onClick={startCreate}>이벤트 추가</Button>
      </CardHeader>
      <CardContent
        className={`relative overflow-hidden transition-[min-height] duration-200 ${panelOpen ? "min-h-[600px]" : ""}`}
      >
        {plan.events.length > 0 ? (
          <div className="overflow-hidden rounded-md border">
            {plan.events.map((event) => (
              <button
                className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b px-4 py-3 text-left last:border-b-0 hover:bg-muted/50"
                key={event.eventName}
                onClick={() => showEvent(event)}
                type="button"
              >
                <span className="grid gap-1">
                  <strong className="text-sm font-medium">{event.eventName}</strong>
                  <span className="line-clamp-1 text-xs text-muted-foreground">
                    {event.description || "설명 없음"}
                  </span>
                </span>
                <span className="text-xs text-muted-foreground">
                  속성 {propertyContractRows(event.propertiesSchema).length}개
                </span>
              </button>
            ))}
          </div>
        ) : (
          <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
            등록한 이벤트가 없어요.
          </p>
        )}

        <button
          aria-label="이벤트 패널 닫기"
          className={`absolute inset-0 z-10 bg-black/10 transition-opacity duration-200 ${panelOpen ? "opacity-100" : "pointer-events-none opacity-0"}`}
          onClick={closePanel}
          tabIndex={panelOpen ? 0 : -1}
          type="button"
        />
        <aside
          aria-hidden={!panelOpen}
          aria-labelledby="tracking-plan-event-panel-title"
          className={`absolute inset-y-0 right-0 z-20 flex w-full max-w-[650px] flex-col overflow-hidden border-l bg-popover text-sm text-popover-foreground shadow-xl transition-[transform,opacity] duration-200 ease-out ${panelOpen ? "translate-x-0 opacity-100" : "pointer-events-none translate-x-6 opacity-0"}`}
          data-testid="tracking-plan-event-panel"
          inert={!panelOpen}
          role="dialog"
        >
          <Button
            aria-label="닫기"
            className="absolute top-3 right-3 z-10"
            onClick={closePanel}
            size="icon-sm"
            variant="ghost"
          >
            <XIcon />
          </Button>
          {mode === "view" && selected ? (
            <>
              <div className="grid gap-0.5 border-b p-4 pr-14">
                <h2 className="text-xl font-medium" id="tracking-plan-event-panel-title">
                  {selected.eventName}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {selected.description || "설명 없음"}
                </p>
              </div>
              <div className="grid flex-1 content-start gap-5 overflow-y-auto px-4 py-5">
                <div className="grid gap-2">
                  <strong className="text-sm">속성 스키마</strong>
                  <PropertyContract event={selected} />
                </div>
              </div>
              <div className="mt-auto flex flex-col gap-2 border-t p-4 sm:flex-row sm:justify-end">
                <Button variant="outline" onClick={closePanel}>
                  닫기
                </Button>
                <Button onClick={() => startEdit(selected)}>수정</Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive">삭제</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{selected.eventName} 이벤트를 삭제할까요?</AlertDialogTitle>
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
            </>
          ) : null}
          {mode === "create" || (mode === "edit" && selected) ? (
            <>
              <div className="grid gap-0.5 border-b p-4 pr-14">
                <h2 className="text-xl font-medium" id="tracking-plan-event-panel-title">
                  {isEdit ? `${selected?.eventName} 수정` : "이벤트 추가"}
                </h2>
              </div>
              <div className="grid flex-1 content-start gap-4 overflow-y-auto px-4 py-5">
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
                  <PropertyList parentDepth={0} properties={properties} onChange={setProperties} />
                  {propertyIssues.length > 0 ? (
                    <div className="rounded-md border border-destructive/30 p-3 text-sm text-destructive">
                      {propertyIssues.map((issue) => (
                        <p key={issue}>{issue}</p>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="mt-auto flex flex-col gap-2 border-t p-4 sm:flex-row sm:justify-end">
                <Button
                  variant="outline"
                  onClick={() => (isEdit && selected ? showEvent(selected) : closePanel())}
                >
                  취소
                </Button>
                <Button
                  disabled={!eventName.trim() || propertyIssues.length > 0}
                  onClick={() => void save()}
                >
                  저장
                </Button>
              </div>
            </>
          ) : null}
        </aside>
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
  const guideEvents = publishedSchema?.events ?? [];
  const [selectedEventName, setSelectedEventName] = useState(guideEvents[0]?.eventName ?? "");
  const selectedEvent =
    guideEvents.find((event) => event.eventName === selectedEventName) ?? guideEvents[0] ?? null;
  const installCode = eventSdkInstallCode();
  const initCode = eventSdkInitCode(plan.projectId, plan.sdkKey);
  const versionDescription = describeEventSchemaVersion({
    draftEvents: plan.events,
    hasPendingChanges: plan.status === "draft",
    previousSchema,
    publishedSchema
  });

  useEffect(() => {
    setSelectedEventName(guideEvents[0]?.eventName ?? "");
  }, [publishedSchema?.revision]);

  return (
    <article className="grid gap-5">
      <header className="grid gap-2 border-b pb-5">
        <h2 className="text-2xl font-semibold">이벤트 수집 SDK 연동</h2>
      </header>

      <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
        <p>
          이벤트 스키마는 SDK 패키지와 별도로 버전 관리되며, SDK는 최신 확정본을 자동으로
          사용합니다.
        </p>
        <p className="mt-2">{versionDescription}</p>
        {plan.status === "draft" && publishedSchema ? (
          <p className="mt-2">아래 가이드는 마지막 확정본 기준입니다.</p>
        ) : null}
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
    <pre className="overflow-auto rounded-md bg-slate-950 p-4 text-sm leading-6 text-slate-100">
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
