import type {
  SdkPublishedSchema,
  TrackingPlan,
  TrackingPlanEvent,
  TrackingPlanJsonSchema,
  TrackingPlanPropertyType
} from "@loopad/shared";
import { Button } from "@loopad/ui/shadcn/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@loopad/ui/shadcn/card";
import { Field, FieldLabel } from "@loopad/ui/shadcn/field";
import { NativeSelect, NativeSelectOption } from "@loopad/ui/shadcn/native-select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@loopad/ui/shadcn/tabs";
import { Link } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  describeEventSchemaVersion,
  eventSdkInitCode,
  eventSdkInstallCode,
  eventSdkTrackCode
} from "../../../model/sdk-guide.js";
import {
  getPublishedTrackingPlanSchema,
  getTrackingPlan,
  publishTrackingPlan
} from "../../../api/tracking-plan-api.js";

type MarketingEventPreview = {
  attributes: readonly string[];
  description: string;
  name: string;
  useCase: string;
};

const MARKETING_EVENT_PREVIEWS: readonly MarketingEventPreview[] = [
  {
    name: "sign_up_completed",
    description: "새로 가입한 고객의 기본 특성과 유입 경로를 확인해요.",
    attributes: ["name", "gender", "age_group", "signup_channel"],
    useCase: "신규 회원 환영 캠페인"
  },
  {
    name: "product_favorited",
    description: "고객이 관심을 보인 상품과 선호 정보를 확인해요.",
    attributes: ["product_name", "category", "preferred_brand", "price_range"],
    useCase: "관심 상품 맞춤 추천"
  },
  {
    name: "add_to_cart",
    description: "구매를 고민 중인 상품과 장바구니 상태를 확인해요.",
    attributes: ["product_name", "category", "quantity", "is_discounted"],
    useCase: "장바구니 이탈 고객 리마인드"
  },
  {
    name: "purchase_completed",
    description: "구매한 상품과 결제 특성을 바탕으로 후속 마케팅을 준비해요.",
    attributes: ["product_name", "category", "payment_amount", "purchased_at"],
    useCase: "재구매 유도 및 연관 상품 추천"
  }
];

export function TrackingPlanWorkspace({ projectId }: { projectId: string }) {
  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">이벤트 관리</h1>
          <p className="text-sm text-muted-foreground">
            마케팅에 사용할 고객 행동과 고객 정보를 확인해요.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link params={{ projectId }} to="/developer/$projectId">
            개발자 페이지
          </Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">고객 이벤트</CardTitle>
          <CardDescription>
            캠페인과 고객 세그먼트에 바로 활용할 수 있는 주요 이벤트예요.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 lg:grid-cols-2">
          {MARKETING_EVENT_PREVIEWS.map((event) => (
            <article className="grid gap-4 rounded-xl border bg-background p-4" key={event.name}>
              <div className="grid gap-1">
                <h2 className="text-base font-semibold">{event.name}</h2>
                <p className="text-sm leading-6 text-muted-foreground">{event.description}</p>
              </div>
              <div className="grid gap-2">
                <strong className="text-xs font-medium text-muted-foreground">고객 정보</strong>
                <div className="flex flex-wrap gap-2">
                  {event.attributes.map((attribute) => (
                    <span
                      className="rounded-full border bg-muted/40 px-3 py-1 text-sm"
                      key={attribute}
                    >
                      {attribute}
                    </span>
                  ))}
                </div>
              </div>
              <p className="border-t pt-3 text-xs text-muted-foreground">
                활용 예시 · {event.useCase}
              </p>
            </article>
          ))}
        </CardContent>
      </Card>
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
