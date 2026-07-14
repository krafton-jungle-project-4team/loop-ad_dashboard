import type {
  TrackingPlan,
  TrackingPlanEvent,
  TrackingPlanJsonSchema,
  TrackingPlanPropertyType,
  TrackingPlanValidation
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle
} from "@loopad/ui/shadcn/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@loopad/ui/shadcn/tabs";
import { Textarea } from "@loopad/ui/shadcn/textarea";
import { Link } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  eventSdkInitCode,
  eventSdkInstallCode,
  eventSdkTrackCode
} from "../../../model/sdk-guide.js";
import {
  addTrackingPlanEvent,
  createTrackingPlan,
  createTrackingPlanFromObservedEvents,
  deleteTrackingPlanEvent,
  getTrackingPlan,
  publishTrackingPlan,
  updateSdkSettings,
  updateTrackingPlanEvent,
  validateTrackingPlan
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
    return <p className="text-sm text-muted-foreground">트래킹 플랜을 불러오고 있어요.</p>;

  if (!plan) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>아직 트래킹 플랜이 없어요</CardTitle>
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
          <h1 className="text-2xl font-semibold">SDK 관리</h1>
          <p className="text-sm text-muted-foreground">
            마케팅에 사용할 이벤트 이름과 속성 규칙을 관리해요.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline">
            <Link params={{ projectId }} to="/developer/$projectId">
              개발자 페이지 열기
            </Link>
          </Button>
          <Badge variant="outline">{plan.status}</Badge>
        </div>
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [validation, setValidation] = useState<TrackingPlanValidation | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void getTrackingPlan(projectId)
      .then((value) => {
        if (!cancelled) setPlan(value);
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

  async function run(action: () => Promise<TrackingPlan>) {
    setError(null);
    try {
      setPlan(await action());
      setValidation(null);
      return true;
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "요청을 처리하지 못했어요. 다시 시도해 주세요."
      );
      return false;
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">개발자 설정을 불러오고 있어요.</p>;
  }

  if (!plan) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>SDK 관리 설정이 필요해요</CardTitle>
          <CardDescription>
            마케팅 SDK 관리 화면에서 이벤트 규칙을 먼저 생성해 주세요.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link params={{ projectId, tabPath: "sdk" }} to="/dashboard/$projectId/$tabPath">
              SDK 관리로 이동
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6">
      <header className="grid gap-2 border-b border-black/10 pb-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">Developer</Badge>
          <Badge variant="secondary">revision {plan.currentRevision}</Badge>
          <Badge variant="secondary">이벤트 {plan.events.length}개</Badge>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">개발자 페이지</h1>
        <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
          SDK 연결 설정과 이벤트·광고 연동 절차를 한곳에서 확인합니다.
        </p>
      </header>
      {error ? (
        <p className="rounded-md border border-destructive/30 p-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <DeveloperGuide
        advertisementGuide={advertisementGuide}
        plan={plan}
        run={run}
        setValidation={setValidation}
        validation={validation}
      />
    </div>
  );
}

function EventDesigner({
  plan,
  run
}: {
  plan: TrackingPlan;
  run: (action: () => Promise<TrackingPlan>) => Promise<boolean>;
}) {
  const [mode, setMode] = useState<"list" | "view" | "create" | "edit">("list");
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [eventName, setEventName] = useState("");
  const [description, setDescription] = useState("");
  const [properties, setProperties] = useState<PropertyDraft[]>([]);
  const selected = plan.events.find((event) => event.eventName === selectedName) ?? null;
  const propertyIssues = validatePropertyDrafts(properties);
  const panelOpen =
    mode === "create" || ((mode === "view" || mode === "edit") && selected !== null);

  function showList() {
    setMode("list");
    setSelectedName(null);
  }

  function showEvent(event: TrackingPlanEvent) {
    setSelectedName(event.eventName);
    setMode("view");
  }

  function startCreate() {
    setSelectedName(null);
    setEventName("");
    setDescription("");
    setProperties([]);
    setMode("create");
  }

  function startEdit(event: TrackingPlanEvent) {
    setSelectedName(event.eventName);
    setEventName(event.eventName);
    setDescription(event.description);
    setProperties(propertiesFromSchema(event.propertiesSchema));
    setMode("edit");
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
      if (saved) showList();
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
    if (saved) showList();
  }

  async function removeEvent(event: TrackingPlanEvent) {
    const deleted = await run(() => deleteTrackingPlanEvent(plan.projectId, event.eventName));
    if (deleted) showList();
  }

  const isEdit = mode === "edit" && selected !== null;

  return (
    <>
      <Card>
        <CardHeader className="flex-row items-start justify-between gap-4">
          <div className="grid gap-1.5">
            <CardTitle className="text-base">이벤트 목록</CardTitle>
            <CardDescription>이벤트를 선택하면 상세 정보와 관리 기능이 열려요.</CardDescription>
          </div>
          <Button onClick={startCreate}>이벤트 추가</Button>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>

      <Sheet
        onOpenChange={(open) => {
          if (!open) showList();
        }}
        open={panelOpen}
      >
        <SheetContent
          className="w-full gap-0 overflow-hidden sm:max-w-2xl"
          data-testid="tracking-plan-event-panel"
          side="right"
        >
          {mode === "view" && selected ? (
            <>
              <SheetHeader className="border-b pr-14">
                <Badge className="mb-2 w-fit" variant="outline">
                  이벤트 상세
                </Badge>
                <SheetTitle className="text-xl">{selected.eventName}</SheetTitle>
                <SheetDescription>{selected.description || "설명 없음"}</SheetDescription>
              </SheetHeader>
              <div className="grid flex-1 content-start gap-5 overflow-y-auto px-4 py-5">
                <div className="grid gap-2">
                  <strong className="text-sm">속성 스키마</strong>
                  <PropertyContract event={selected} />
                </div>
              </div>
              <SheetFooter className="border-t sm:flex-row sm:justify-end">
                <Button variant="outline" onClick={showList}>
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
                        이벤트 규칙이 목록과 다음 게시 버전에서 제거됩니다. 삭제 후에는 되돌릴 수
                        없어요.
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
              </SheetFooter>
            </>
          ) : (
            <>
              <SheetHeader className="border-b pr-14">
                <Badge className="mb-2 w-fit">{isEdit ? "이벤트 수정" : "이벤트 생성"}</Badge>
                <SheetTitle className="text-xl">
                  {isEdit ? selected.eventName : "이벤트 추가"}
                </SheetTitle>
                <SheetDescription>
                  JSON을 직접 고치지 않고 속성 이름, 타입, 필수 여부를 정할 수 있어요.
                </SheetDescription>
              </SheetHeader>
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
              <SheetFooter className="border-t sm:flex-row sm:justify-end">
                <Button
                  variant="outline"
                  onClick={() => (isEdit && selected ? showEvent(selected) : showList())}
                >
                  취소
                </Button>
                <Button
                  disabled={!eventName.trim() || propertyIssues.length > 0}
                  onClick={() => void save()}
                >
                  저장
                </Button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
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

function ConnectionPanel({
  plan,
  run,
  validation,
  setValidation
}: {
  plan: TrackingPlan;
  run: (action: () => Promise<TrackingPlan>) => Promise<boolean>;
  validation: TrackingPlanValidation | null;
  setValidation: (value: TrackingPlanValidation | null) => void;
}) {
  const [originText, setOriginText] = useState(plan.allowedOrigins.join("\n"));
  const connectionUrl = `https://dashboard.api.dev.loop-ad.org/api/public/v1/sdk/connections/${plan.sdkKey}`;
  const schemaUrl = `${connectionUrl}/schema`;
  async function check() {
    try {
      setValidation(await validateTrackingPlan(plan.projectId));
    } catch {
      setValidation({ valid: false, issues: ["Validation API request failed."] });
    }
  }
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">허용 Origin</CardTitle>
          <CardDescription>
            줄바꿈으로 구분한 Origin에서만 공개 스키마를 볼 수 있어요.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <Textarea
            aria-label="허용 Origin"
            className="min-h-32"
            value={originText}
            onChange={(event) => setOriginText(event.target.value)}
          />
          <Button
            onClick={() =>
              void run(() =>
                updateSdkSettings(plan.projectId, {
                  allowedOrigins: originText
                    .split(/[\n,]/)
                    .map((value) => value.trim())
                    .filter(Boolean)
                })
              )
            }
          >
            Origin 저장
          </Button>
          <p className="text-xs text-muted-foreground">
            Origin은 접근 범위를 정할 뿐, 인증 수단은 아니에요.
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">게시</CardTitle>
          <CardDescription>
            게시하면 현재 버전을 저장하고 바로 사용 중인 버전으로 바꿔요.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <ReadOnlyValue label="Connection URL" value={connectionUrl} />
          <ReadOnlyValue label="Schema URL" value={schemaUrl} />
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => void check()}>
              검증
            </Button>
            <Button onClick={() => void run(() => publishTrackingPlan(plan.projectId))}>
              게시
            </Button>
          </div>
          {validation ? (
            <div className="text-sm">
              <strong>{validation.valid ? "검증 통과" : "검증 실패"}</strong>
              {validation.issues.map((issue) => (
                <p key={issue}>{issue}</p>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function DeveloperGuide({
  advertisementGuide,
  plan,
  run,
  setValidation,
  validation
}: {
  advertisementGuide: ReactNode;
  plan: TrackingPlan;
  run: (action: () => Promise<TrackingPlan>) => Promise<boolean>;
  setValidation: (value: TrackingPlanValidation | null) => void;
  validation: TrackingPlanValidation | null;
}) {
  return (
    <div className="grid gap-10">
      <section className="grid gap-4">
        <div className="grid gap-1">
          <h2 className="text-xl font-semibold">SDK 연결 설정</h2>
          <p className="text-sm text-muted-foreground">
            허용 Origin을 저장하고 검증한 규약을 SDK에 게시합니다.
          </p>
        </div>
        <ConnectionPanel
          plan={plan}
          run={run}
          setValidation={setValidation}
          validation={validation}
        />
      </section>

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
            <CollectionGuide plan={plan} />
          </TabsContent>
          <TabsContent value="advertisement">{advertisementGuide}</TabsContent>
        </Tabs>
      </section>
    </div>
  );
}

function CollectionGuide({ plan }: { plan: TrackingPlan }) {
  const [selectedEventName, setSelectedEventName] = useState(plan.events[0]?.eventName ?? "");
  const selectedEvent =
    plan.events.find((event) => event.eventName === selectedEventName) ?? plan.events[0] ?? null;
  const connectionUrl = `https://dashboard.api.dev.loop-ad.org/api/public/v1/sdk/connections/${plan.sdkKey}`;
  const installCode = eventSdkInstallCode();
  const initCode = eventSdkInitCode(connectionUrl);

  return (
    <article className="grid gap-5">
      <header className="grid gap-2 border-b pb-5">
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">How-to guide</Badge>
          <Badge variant="secondary">{plan.status}</Badge>
          <Badge variant="secondary">revision {plan.currentRevision}</Badge>
          <Badge variant="secondary">이벤트 {plan.events.length}개</Badge>
        </div>
        <h2 className="text-2xl font-semibold">이벤트 수집 SDK 연동</h2>
        <p className="text-sm leading-6 text-muted-foreground">
          현재 트래킹 플랜의 Origin, 이벤트 이름, 필수 속성, 타입을 기준으로 만든 가이드예요.
          게시하면 SDK에 적용돼요.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <GuideSection
          description="공개 GitHub Pages IIFE를 HTML에 연결합니다. npm registry나 패키지 토큰은 필요하지 않습니다."
          title="1. 수집 SDK 연결"
        >
          <GuideCode code={installCode} />
        </GuideSection>
        <GuideSection
          description="아래 Origin에서만 연결 정보와 스키마를 볼 수 있어요. 바꾼 뒤 트래킹 플랜을 게시해 주세요."
          title="2. 허용 Origin 확인"
        >
          <div className="grid gap-2">
            {plan.allowedOrigins.length > 0 ? (
              plan.allowedOrigins.map((origin) => (
                <code className="break-all rounded-md border p-2 text-xs" key={origin}>
                  {origin}
                </code>
              ))
            ) : (
              <p className="text-sm text-destructive">아직 등록한 Origin이 없어요.</p>
            )}
          </div>
        </GuideSection>
      </div>

      <GuideSection
        description="앱을 시작할 때 연결 정보와 스키마를 불러와요. 로그인 전에도 DevTools를 쓸 수 있어요."
        title="3. Tracking Plan 연결"
      >
        <GuideCode code={initCode} />
      </GuideSection>

      <GuideSection
        description="개발 빌드의 오른쪽 아래 LoopAd 버튼에서 SDK 상태를 확인해요."
        title="4. SDK DevTools"
      >
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <DebugFeature label="개요" value="연결 · identity · 버전" />
          <DebugFeature label="스키마" value="필드 · 타입 · 필수값" />
          <DebugFeature label="검증" value="차단 사유 · 수정 항목" />
          <DebugFeature label="요청" value="상태 · HTTP · 크기" />
        </div>
      </GuideSection>

      <GuideSection
        description="이벤트를 고르면 속성과 전송 예제가 함께 바뀌어요. 규약에 없거나 타입이 맞지 않는 값은 보내지 않아요."
        title="5. 규약에 맞춰 이벤트 전송"
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
                {plan.events.map((event) => (
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
          <p className="text-sm text-destructive">트래킹 플랜에 등록한 이벤트가 없어요.</p>
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

function ReadOnlyValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <code className="break-all rounded-md border p-2 text-xs">{value}</code>
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
