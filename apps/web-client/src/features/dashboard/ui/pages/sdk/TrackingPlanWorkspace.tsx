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
import { Badge } from "@loopad/ui/shadcn/badge";
import { Button } from "@loopad/ui/shadcn/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@loopad/ui/shadcn/card";
import { Checkbox } from "@loopad/ui/shadcn/checkbox";
import { Field, FieldLabel } from "@loopad/ui/shadcn/field";
import { Input } from "@loopad/ui/shadcn/input";
import { NativeSelect, NativeSelectOption } from "@loopad/ui/shadcn/native-select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@loopad/ui/shadcn/tabs";
import { Textarea } from "@loopad/ui/shadcn/textarea";
import { useEffect, useState, type ReactNode } from "react";
import {
  eventSdkInitCode,
  eventSdkInstallCode,
  eventSdkTrackCode
} from "../../../model/sdk-guide.js";
import {
  addTrackingPlanEvent,
  createTrackingPlan,
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

export function TrackingPlanWorkspace({
  projectId,
  advertisementGuide
}: {
  projectId: string;
  advertisementGuide: ReactNode;
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
      setValidation(null);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "요청을 처리하지 못했어요. 다시 시도해 주세요."
      );
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
            자동 페이지 조회에 필요한 기본 이벤트와 초안을 만들어요.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={() =>
              void run(() =>
                createTrackingPlan(projectId, {
                  name: "Default Tracking Plan",
                  allowedOrigins: [DEFAULT_DEMO_ORIGIN]
                })
              )
            }
          >
            기본 트래킹 플랜 만들기
          </Button>
          {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">SDK Tracking Plan</h1>
          <p className="text-sm text-muted-foreground">
            입력 항목을 채워 이벤트 규칙을 만들고 게시해요.
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline">{plan.status}</Badge>
          <Badge variant="secondary">revision {plan.currentRevision}</Badge>
        </div>
      </div>
      {error ? (
        <p className="rounded-md border border-destructive/30 p-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <Tabs defaultValue="design">
        <TabsList className="flex h-auto flex-wrap">
          <TabsTrigger value="design">이벤트 설계</TabsTrigger>
          <TabsTrigger value="connection">SDK 연결</TabsTrigger>
          <TabsTrigger value="guide">개발자 가이드</TabsTrigger>
        </TabsList>
        <TabsContent value="design">
          <EventDesigner plan={plan} run={run} />
        </TabsContent>
        <TabsContent value="connection">
          <ConnectionPanel
            plan={plan}
            run={run}
            validation={validation}
            setValidation={setValidation}
          />
        </TabsContent>
        <TabsContent value="guide">
          <DeveloperGuide advertisementGuide={advertisementGuide} plan={plan} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EventDesigner({
  plan,
  run
}: {
  plan: TrackingPlan;
  run: (action: () => Promise<TrackingPlan>) => Promise<void>;
}) {
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [eventName, setEventName] = useState("");
  const [description, setDescription] = useState("");
  const [properties, setProperties] = useState<PropertyDraft[]>([]);
  const selected = plan.events.find((event) => event.eventName === selectedName) ?? null;
  const propertyIssues = validatePropertyDrafts(properties);

  function selectEvent(event: TrackingPlanEvent | null) {
    setSelectedName(event?.eventName ?? null);
    setEventName(event?.eventName ?? "");
    setDescription(event?.description ?? "");
    setProperties(event ? propertiesFromSchema(event.propertiesSchema) : []);
  }

  async function save() {
    const propertiesSchema = schemaFromProperties(properties);
    if (selected) {
      await run(() =>
        updateTrackingPlanEvent(plan.projectId, selected.eventName, {
          description,
          propertiesSchema
        })
      );
    } else {
      await run(() =>
        addTrackingPlanEvent(plan.projectId, { eventName, description, propertiesSchema })
      );
      selectEvent(null);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">이벤트</CardTitle>
          <CardDescription>SDK가 자동 수집하는 이벤트는 시스템 이벤트로 유지돼요.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2">
          <Button variant="outline" onClick={() => selectEvent(null)}>
            새 이벤트
          </Button>
          {plan.events.map((event) => (
            <Button
              className="justify-between"
              key={event.eventName}
              onClick={() => selectEvent(event)}
              type="button"
              variant={selectedName === event.eventName ? "secondary" : "outline"}
            >
              <span>{event.eventName}</span>
              <Badge variant="outline">{event.status}</Badge>
            </Button>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{selected ? selected.eventName : "새 이벤트"}</CardTitle>
          <CardDescription>
            JSON을 직접 고치지 않고 속성 이름, 타입, 필수 여부를 정할 수 있어요.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Field>
            <FieldLabel htmlFor="tracking-plan-event-name">이벤트명</FieldLabel>
            <Input
              disabled={Boolean(selected)}
              id="tracking-plan-event-name"
              value={eventName}
              onChange={(event) => setEventName(event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="tracking-plan-event-description">설명</FieldLabel>
            <Textarea
              id="tracking-plan-event-description"
              className="min-h-20"
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
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={!eventName.trim() || propertyIssues.length > 0}
              onClick={() => void save()}
            >
              저장
            </Button>
            {selected && selected.status !== "system" ? (
              <Button
                variant="destructive"
                onClick={() =>
                  void run(() => deleteTrackingPlanEvent(plan.projectId, selected.eventName)).then(
                    () => selectEvent(null)
                  )
                }
              >
                이벤트 삭제
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
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
  run: (action: () => Promise<TrackingPlan>) => Promise<void>;
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
  plan
}: {
  advertisementGuide: ReactNode;
  plan: TrackingPlan;
}) {
  return (
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
          description="공개 npm 패키지를 설치해요. 브라우저에서는 GitHub Packages에 직접 접근하지 않아요."
          title="1. 수집 SDK 설치"
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
