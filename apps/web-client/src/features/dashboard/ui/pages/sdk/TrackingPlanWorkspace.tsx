import type {
  TrackingPlan,
  TrackingPlanEvent,
  TrackingPlanJsonSchema,
  TrackingPlanPropertyType,
  TrackingPlanValidation
} from "@loopad/shared";
import { Badge } from "@loopad/ui/shadcn/badge";
import { Button } from "@loopad/ui/shadcn/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@loopad/ui/shadcn/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@loopad/ui/shadcn/tabs";
import { useEffect, useState, type ReactNode } from "react";
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
  name: string;
  type: Exclude<TrackingPlanPropertyType, "object">;
  required: boolean;
};

export function TrackingPlanWorkspace({
  projectId,
  legacyGuide
}: {
  projectId: string;
  legacyGuide: ReactNode;
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
      setError(cause instanceof Error ? cause.message : "요청을 처리하지 못했습니다.");
    }
  }

  if (loading)
    return <p className="text-sm text-muted-foreground">Tracking Plan을 불러오는 중입니다.</p>;

  if (!plan) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tracking Plan이 없습니다</CardTitle>
          <CardDescription>표준 11개 이벤트를 포함한 기본 draft를 생성합니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={() =>
              void run(() => createTrackingPlan(projectId, { name: "Default Tracking Plan" }))
            }
          >
            기본 Tracking Plan 생성
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
          <p className="text-sm text-muted-foreground">폼으로 이벤트 계약을 설계하고 게시합니다.</p>
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
          <TabsTrigger value="developer">개발자 가이드</TabsTrigger>
          <TabsTrigger value="legacy">기존 연동 가이드</TabsTrigger>
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
        <TabsContent value="developer">
          <DeveloperGuide plan={plan} />
        </TabsContent>
        <TabsContent value="legacy">{legacyGuide}</TabsContent>
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
          <CardDescription>표준 이벤트는 system으로 보존됩니다.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2">
          <Button variant="outline" onClick={() => selectEvent(null)}>
            새 이벤트
          </Button>
          {plan.events.map((event) => (
            <button
              className="flex items-center justify-between rounded-md border px-3 py-2 text-left text-sm"
              key={event.eventName}
              onClick={() => selectEvent(event)}
              type="button"
            >
              <span>{event.eventName}</span>
              <Badge variant="outline">{event.status}</Badge>
            </button>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{selected ? selected.eventName : "새 이벤트"}</CardTitle>
          <CardDescription>
            JSON을 직접 편집하지 않고 속성명, 타입, 필수 여부를 지정합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Field label="이벤트명">
            <input
              className="h-10 rounded-md border px-3"
              disabled={Boolean(selected)}
              value={eventName}
              onChange={(event) => setEventName(event.target.value)}
            />
          </Field>
          <Field label="설명">
            <textarea
              className="min-h-20 rounded-md border p-3"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </Field>
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <strong className="text-sm">속성</strong>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setProperties([...properties, { name: "", type: "string", required: false }])
                }
              >
                속성 추가
              </Button>
            </div>
            {properties.map((property, index) => (
              <div
                className="grid gap-2 rounded-md border p-3 md:grid-cols-[1fr_160px_auto_auto]"
                key={`${index}-${property.name}`}
              >
                <input
                  className="h-9 rounded-md border px-2"
                  placeholder="property_name"
                  value={property.name}
                  onChange={(event) =>
                    setProperties(
                      replaceAt(properties, index, { ...property, name: event.target.value })
                    )
                  }
                />
                <select
                  className="h-9 rounded-md border px-2"
                  value={property.type}
                  onChange={(event) =>
                    setProperties(
                      replaceAt(properties, index, {
                        ...property,
                        type: event.target.value as PropertyDraft["type"]
                      })
                    )
                  }
                >
                  {(["string", "number", "integer", "boolean", "array"] as const).map((type) => (
                    <option key={type}>{type}</option>
                  ))}
                </select>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    checked={property.required}
                    type="checkbox"
                    onChange={(event) =>
                      setProperties(
                        replaceAt(properties, index, {
                          ...property,
                          required: event.target.checked
                        })
                      )
                    }
                  />
                  필수
                </label>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    setProperties(properties.filter((_, propertyIndex) => propertyIndex !== index))
                  }
                >
                  삭제
                </Button>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button disabled={!eventName.trim()} onClick={() => void save()}>
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
            줄바꿈으로 구분한 정확한 Origin만 공개 schema를 조회할 수 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <textarea
            className="min-h-32 rounded-md border p-3"
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
            Origin은 조작 가능하며 인증 수단이 아닙니다.
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">게시</CardTitle>
          <CardDescription>
            revision snapshot 생성과 active revision 전환은 하나의 transaction입니다.
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

function DeveloperGuide({ plan }: { plan: TrackingPlan }) {
  const connectionUrl = `https://dashboard.api.dev.loop-ad.org/api/public/v1/sdk/connections/${plan.sdkKey}`;
  const code = `const sdk = await LoopAdEventSDK.init({\n  connectionUrl: "${connectionUrl}",\n  debug: import.meta.env.DEV\n});\n\nsdk.setIdentity({ userId: user.id, sessionId: session.id });\nsdk.track("page_view");`;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">최소 연결 예제</CardTitle>
        <CardDescription>
          connection fetch 실패는 init 실패로 처리하고 호출부에서 명시적으로 대응하세요.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <pre className="overflow-auto rounded-md bg-slate-950 p-4 text-sm text-slate-100">
          <code>{code}</code>
        </pre>
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="font-medium">{label}</span>
      {children}
    </label>
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
  const schemaProperties: Record<string, TrackingPlanJsonSchema> = {};
  for (const property of properties) {
    const name = property.name.trim();
    if (!name) continue;
    schemaProperties[name] =
      property.type === "array"
        ? { type: "array", items: { type: "string" } }
        : { type: property.type };
  }
  return {
    type: "object",
    properties: schemaProperties,
    required: properties
      .filter((property) => property.required && property.name.trim())
      .map((property) => property.name.trim())
  };
}

function propertiesFromSchema(schema: TrackingPlanJsonSchema): PropertyDraft[] {
  const required = new Set(schema.required ?? []);
  return Object.entries(schema.properties ?? {}).map(([name, property]) => ({
    name,
    type: property.type === "object" ? "string" : property.type,
    required: required.has(name)
  }));
}
