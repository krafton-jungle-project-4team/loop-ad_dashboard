import { Alert, AlertDescription, AlertTitle } from "@loopad/ui/shadcn/alert";
import { Badge } from "@loopad/ui/shadcn/badge";
import { Button } from "@loopad/ui/shadcn/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@loopad/ui/shadcn/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@loopad/ui/shadcn/tabs";
import {
  Check,
  Clipboard,
  Code2,
  FileCode2,
  PackageCheck,
  PlayCircle,
  ShieldCheck,
  Terminal,
  type LucideIcon
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { TrackingPlanWorkspace } from "./TrackingPlanWorkspace.js";

const registryInstallCode = `# .npmrc
@krafton-jungle-project-4team:registry=https://npm.pkg.github.com
# GitHub Packages 접근 권한이 필요한 환경이면 아래 토큰을 함께 설정합니다.
# //npm.pkg.github.com/:_authToken=\${GITHUB_PACKAGES_TOKEN}

npm install \
  @krafton-jungle-project-4team/loop-ad_event_sdk@latest \
  @krafton-jungle-project-4team/loop-ad_advertisement_sdk@latest`;

const collectionSdkCode = String.raw`// src/lib/loop-ad-events.ts
import {
  init as initLoopAdEvents,
  type LoopAdEventSdkClient,
  type TrackFields
} from "@krafton-jungle-project-4team/loop-ad_event_sdk";

const loopAdConfig = {
  projectId: import.meta.env.VITE_LOOP_AD_PROJECT_ID,
  writeKey: import.meta.env.VITE_LOOP_AD_WRITE_KEY
};

let eventClient: LoopAdEventSdkClient | null = null;

export function startLoopAdCollection(): LoopAdEventSdkClient {
  eventClient ??= initLoopAdEvents({
    projectId: loopAdConfig.projectId,
    writeKey: loopAdConfig.writeKey,
    autoTrackPageViews: true,
    collectDomEvents: true,
    context: {
      device: detectDevice()
    }
  });

  return eventClient;
}

export function identifyLoopAdUser(identity: {
  userId: string;
  sessionId: string;
}): void {
  startLoopAdCollection().setIdentity(identity, {
    device: detectDevice()
  });
}

export function trackLoopAdEvent(eventName: string, fields?: TrackFields): void {
  startLoopAdCollection().track(eventName, fields);
}

export function clearLoopAdIdentity(): void {
  eventClient?.clearIdentity();
}

function detectDevice(): "mobile" | "desktop" {
  return window.matchMedia("(max-width: 767px)").matches ? "mobile" : "desktop";
}`;

const authHookCode = String.raw`// 앱 시작 또는 auth/session layer
import {
  clearLoopAdIdentity,
  identifyLoopAdUser,
  startLoopAdCollection,
  trackLoopAdEvent
} from "./loop-ad-events";

startLoopAdCollection();

auth.onSignedIn((user, session) => {
  identifyLoopAdUser({
    userId: user.id,
    sessionId: session.id
  });
});

auth.onSignedOut(() => {
  clearLoopAdIdentity();
});

trackLoopAdEvent("product_detail_view", {
  properties: {
    product_id: "product_123",
    category: "outerwear"
  }
});`;

const domAttributeCode = String.raw`<button
  data-loopad-event="promotion_click"
  data-loopad-placement-id="HOME_TOP_BANNER"
  data-loopad-prop-button-label="hero_cta"
>
  프로모션 보기
</button>`;

const advertisementSdkCode = String.raw`// src/lib/loop-ad-ads.ts
import {
  init as initLoopAdAds,
  type AdvertisementDecision,
  type AdvertisementFilledDecision
} from "@krafton-jungle-project-4team/loop-ad_advertisement_sdk";
import { startLoopAdCollection } from "./loop-ad-events";

const loopAdConfig = {
  apiBaseUrl: import.meta.env.VITE_LOOP_AD_DASHBOARD_API_BASE_URL,
  projectId: import.meta.env.VITE_LOOP_AD_PROJECT_ID,
  promotionRunId: import.meta.env.VITE_LOOP_AD_PROMOTION_RUN_ID
};

export async function renderHomeTopBanner(user: { id: string }): Promise<void> {
  const eventClient = startLoopAdCollection();
  const ads = initLoopAdAds({
    apiBaseUrl: loopAdConfig.apiBaseUrl,
    projectId: loopAdConfig.projectId,
    userId: user.id,
    promotionRunId: loopAdConfig.promotionRunId
  });

  const decision = await ads.render({
    placementId: "HOME_TOP_BANNER",
    targetId: "loopad-home-top-banner",
    onImpression(filledDecision) {
      eventClient.track("promotion_impression", toPromotionFields(filledDecision));
    },
    onClick(filledDecision) {
      eventClient.track("promotion_click", toPromotionFields(filledDecision));
    }
  });

  handleAdDecision(decision);
}

function handleAdDecision(decision: AdvertisementDecision): void {
  if (decision.status === "empty") {
    renderFallbackBanner("추천할 프로모션이 없습니다.");
    return;
  }

  console.info("광고가 렌더링되었습니다.", {
    placementId: decision.placementId,
    title: decision.ad.title,
    targetUrl: decision.ad.targetUrl
  });
}

function toPromotionFields(decision: AdvertisementFilledDecision) {
  const tracking = decision.tracking;

  return {
    campaignId: tracking.campaign_id,
    promotionId: tracking.promotion_id,
    promotionRunId: tracking.promotion_run_id,
    adExperimentId: tracking.ad_experiment_id,
    segmentId: tracking.segment_id,
    contentId: tracking.content_id,
    contentOptionId: tracking.content_option_id,
    promotionChannel: tracking.promotion_channel,
    placementId: tracking.placement_id,
    targetUrl: tracking.target_url,
    properties: {
      source: "loop_ad_advertisement_sdk"
    }
  };
}

function renderFallbackBanner(message: string): void {
  const target = document.getElementById("loopad-home-top-banner");
  target?.replaceChildren(message);
}`;

const placementMarkupCode = String.raw`<section aria-label="추천 프로모션">
  <div id="loopad-home-top-banner"></div>
</section>`;

const scriptTagCode = String.raw`<div id="loopad-home-top-banner"></div>

<script src="https://krafton-jungle-project-4team.github.io/loop-ad_event_sdk/loop-ad-event-sdk.iife.js"></script>
<script src="https://krafton-jungle-project-4team.github.io/loop-ad_advertisement_sdk/loop-ad-advertisement-sdk.iife.js"></script>
<script>
  const eventSdk = LoopAdEventSDK.init({
    projectId: "your-project-id",
    writeKey: "your-public-write-key",
    autoTrackPageViews: true,
    collectDomEvents: true
  });

  eventSdk.setIdentity({
    userId: currentUser.id,
    sessionId: currentSession.id
  });

  const ads = LoopAdAdvertisementSDK.init({
    apiBaseUrl: window.LOOP_AD_API_BASE_URL,
    projectId: "your-project-id",
    userId: currentUser.id,
    promotionRunId: "current-promotion-run-id"
  });

  ads.render({
    placementId: "HOME_TOP_BANNER",
    targetId: "loopad-home-top-banner",
    onImpression(decision) {
      eventSdk.track("promotion_impression", toPromotionFields(decision));
    },
    onClick(decision) {
      eventSdk.track("promotion_click", toPromotionFields(decision));
    }
  });

  function toPromotionFields(decision) {
    const tracking = decision.tracking;

    return {
      campaignId: tracking.campaign_id,
      promotionId: tracking.promotion_id,
      promotionRunId: tracking.promotion_run_id,
      adExperimentId: tracking.ad_experiment_id,
      segmentId: tracking.segment_id,
      contentId: tracking.content_id,
      contentOptionId: tracking.content_option_id,
      promotionChannel: tracking.promotion_channel,
      placementId: tracking.placement_id,
      targetUrl: tracking.target_url
    };
  }
</script>`;

const checklistItems = [
  "로그인 직후 setIdentity()가 userId와 sessionId를 함께 받습니다.",
  "track()에 서비스 이벤트명과 필요한 properties만 넘깁니다.",
  "ads.render() 결과가 empty이면 직접 fallback UI를 보여줍니다.",
  "filled 광고의 노출과 클릭은 onImpression, onClick 콜백에서 처리합니다."
];

const prerequisites = [
  {
    label: "프로젝트 ID",
    value: "Dashboard에서 만든 서비스 식별자"
  },
  {
    label: "쓰기 키",
    value: "브라우저 SDK에 전달할 public write key"
  },
  {
    label: "Promotion run ID",
    value: "현재 노출할 프로모션 실행 식별자"
  },
  {
    label: "사용자 세션",
    value: "userId와 sessionId가 모두 준비된 로그인 세션"
  },
  {
    label: "광고 지면",
    value: "placementId와 광고가 들어갈 target element id"
  }
];

export function SdkPage({ projectId }: { projectId: string }) {
  return <TrackingPlanWorkspace projectId={projectId} legacyGuide={<LegacySdkGuide />} />;
}

function LegacySdkGuide() {
  return (
    <div className="grid gap-6">
      <PageHeader />

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <GuideSummary />
        <PrerequisitesPanel />
      </section>

      <section className="grid gap-4">
        <SectionHeading
          eyebrow="Procedure"
          title="SDK 연동 절차"
          description="일반적인 웹 프론트엔드 프로젝트에서 두 SDK를 함께 연결하는 순서입니다."
        />
        <Tabs defaultValue="npm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <TabsList>
              <TabsTrigger value="npm">npm 패키지</TabsTrigger>
              <TabsTrigger value="script">script tag</TabsTrigger>
            </TabsList>
            <Badge>latest 기준</Badge>
          </div>
          <TabsContent className="grid gap-4" value="npm">
            <GuideStep
              body="GitHub Packages registry를 프로젝트에 연결하고 두 SDK를 최신 버전으로 설치합니다."
              icon={PackageCheck}
              number="1"
              title="패키지를 설치합니다"
            >
              <CodeBlock code={registryInstallCode} language="bash" title=".npmrc / terminal" />
            </GuideStep>
            <GuideStep
              body="수집 SDK는 앱 부팅 시 먼저 시작해도 됩니다. 단, userId와 sessionId가 준비되기 전 이벤트는 전송되지 않습니다."
              icon={ShieldCheck}
              number="2"
              title="수집 SDK를 초기화합니다"
            >
              <CodeBlock code={collectionSdkCode} language="ts" title="loop-ad-events.ts" />
            </GuideStep>
            <GuideStep
              body="인증 계층에서 identity를 주입하고, 서비스 도메인 이벤트는 track()으로 수집합니다."
              icon={PlayCircle}
              number="3"
              title="로그인 세션과 이벤트를 연결합니다"
            >
              <CodeBlock code={authHookCode} language="ts" title="auth integration" />
              <CodeBlock code={domAttributeCode} language="html" title="DOM attribute tracking" />
            </GuideStep>
            <GuideStep
              body="광고 SDK는 decision 요청과 DOM 렌더링을 담당합니다. 노출/클릭 지표는 콜백에서 수집 SDK로 넘깁니다."
              icon={FileCode2}
              number="4"
              title="광고 SDK를 렌더링 지면에 붙입니다"
            >
              <CodeBlock code={placementMarkupCode} language="html" title="ad placement" />
              <CodeBlock code={advertisementSdkCode} language="ts" title="loop-ad-ads.ts" />
            </GuideStep>
          </TabsContent>
          <TabsContent value="script">
            <GuideStep
              body="빌드 파이프라인에 npm 패키지를 넣기 어렵다면 GitHub Pages로 배포된 IIFE 번들을 직접 불러옵니다."
              icon={Terminal}
              number="A"
              title="정적 페이지나 CMS에 붙입니다"
            >
              <CodeBlock code={scriptTagCode} language="html" title="script tag integration" />
            </GuideStep>
          </TabsContent>
        </Tabs>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <VerifyPanel />
        <TroubleshootingPanel />
      </section>
    </div>
  );
}

function PageHeader() {
  return (
    <div className="grid gap-4 border-b border-black/10 pb-6">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">How-to guide</Badge>
        <Badge variant="secondary">수집 SDK</Badge>
        <Badge variant="secondary">광고 SDK</Badge>
      </div>
      <div className="grid gap-2">
        <h1 className="text-[28px] font-semibold tracking-tight text-[#1d1d1f] md:text-[34px]">
          SDK 연동 가이드
        </h1>
        <p className="max-w-3xl text-sm leading-6 text-muted-foreground md:text-base">
          일반 웹 프로젝트에 SDK를 붙일 때 필요한 코드만 정리했습니다. 프로젝트 값, 사용자 세션,
          광고 지면 이름만 실제 값으로 바꾸면 됩니다.
        </p>
      </div>
    </div>
  );
}

function GuideSummary() {
  return (
    <Card className="bg-white shadow-none">
      <CardHeader>
        <CardTitle className="text-[20px] font-semibold tracking-tight text-[#1d1d1f]">
          목표
        </CardTitle>
        <CardDescription className="leading-6">
          수집 SDK는 사용자 행동 이벤트를 기록하고, 광고 SDK는 지정한 영역에 광고를 렌더링합니다. 앱
          코드는 로그인 세션 연결, 광고 응답 처리, 노출/클릭 콜백만 담당하면 됩니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        <Alert className="border-primary/20 bg-accent/60">
          <Code2 className="text-primary" />
          <AlertTitle>필수 흐름</AlertTitle>
          <AlertDescription>
            수집 SDK를 시작하고, 로그인 후 identity를 설정한 뒤, 광고 SDK의 render 결과와 콜백을
            처리합니다.
          </AlertDescription>
        </Alert>
        <div className="grid gap-2 sm:grid-cols-3">
          <SummaryMetric label="수집" value="init + setIdentity + track" />
          <SummaryMetric label="광고" value="render + decision 처리" />
          <SummaryMetric label="콜백" value="impression / click" />
        </div>
      </CardContent>
    </Card>
  );
}

function PrerequisitesPanel() {
  return (
    <Card className="bg-white shadow-none">
      <CardHeader>
        <CardTitle className="text-base font-semibold text-[#1d1d1f]">준비물</CardTitle>
        <CardDescription>코드에 넣기 전에 프로젝트에서 준비할 값입니다.</CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-3">
          {prerequisites.map((item) => (
            <div
              className="grid gap-1 border-b border-black/10 pb-3 last:border-0 last:pb-0"
              key={item.label}
            >
              <dt className="text-sm font-semibold text-[#1d1d1f]">{item.label}</dt>
              <dd className="text-sm leading-5 text-muted-foreground">{item.value}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}

function VerifyPanel() {
  return (
    <Card className="bg-white shadow-none">
      <CardHeader>
        <CardTitle className="text-base font-semibold text-[#1d1d1f]">검증</CardTitle>
        <CardDescription>배포 전 브라우저에서 확인할 최소 항목입니다.</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="grid gap-2">
          {checklistItems.map((item) => (
            <li className="flex gap-2 text-sm leading-6 text-muted-foreground" key={item}>
              <Check className="mt-1 size-4 shrink-0 text-primary" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function TroubleshootingPanel() {
  return (
    <Card className="bg-white shadow-none">
      <CardHeader>
        <CardTitle className="text-base font-semibold text-[#1d1d1f]">문제 해결</CardTitle>
        <CardDescription>대부분의 연동 오류는 아래 세 가지에서 시작합니다.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <TroubleshootingItem
          title="이벤트가 보이지 않음"
          body="setIdentity()가 호출되기 전이면 이벤트가 기록되지 않습니다. userId와 sessionId가 모두 있는지 먼저 확인합니다."
        />
        <TroubleshootingItem
          title="광고 영역이 비어 있음"
          body="targetId element가 실제 DOM에 있는지 확인하고, decision.status가 empty이면 fallback UI를 직접 보여줍니다."
        />
        <TroubleshootingItem
          title="응답 처리를 어디서 해야 할지 모름"
          body="ads.render()가 반환한 decision은 렌더링 직후 처리하고, 노출/클릭은 onImpression과 onClick 콜백에서 처리합니다."
        />
      </CardContent>
    </Card>
  );
}

function SectionHeading({
  description,
  eyebrow,
  title
}: {
  description: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="grid gap-1">
      <span className="text-xs font-semibold uppercase tracking-normal text-primary">
        {eyebrow}
      </span>
      <h2 className="text-[22px] font-semibold tracking-tight text-[#1d1d1f]">{title}</h2>
      <p className="max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  );
}

function GuideStep({
  body,
  children,
  icon: Icon,
  number,
  title
}: {
  body: string;
  children: ReactNode;
  icon: LucideIcon;
  number: string;
  title: string;
}) {
  return (
    <Card className="bg-white shadow-none">
      <CardHeader className="gap-3">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground">
            {number}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Icon className="size-4 text-primary" />
              <CardTitle className="text-base font-semibold text-[#1d1d1f]">{title}</CardTitle>
            </div>
            <CardDescription className="mt-1 leading-6">{body}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3">{children}</CardContent>
    </Card>
  );
}

function CodeBlock({ code, language, title }: { code: string; language: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const resetCopiedTimeoutRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (resetCopiedTimeoutRef.current !== null) {
        window.clearTimeout(resetCopiedTimeoutRef.current);
      }
    },
    []
  );

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      if (resetCopiedTimeoutRef.current !== null) {
        window.clearTimeout(resetCopiedTimeoutRef.current);
      }
      setCopied(true);
      resetCopiedTimeoutRef.current = window.setTimeout(() => {
        setCopied(false);
        resetCopiedTimeoutRef.current = null;
      }, 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-lg border border-black/10 bg-[#101820]">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-[#17212b] px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <Terminal className="size-4 shrink-0 text-[#8bb7e8]" />
          <span className="truncate text-xs font-semibold text-white">{title}</span>
          <Badge className="bg-white/10 text-white hover:bg-white/10">{language}</Badge>
        </div>
        <Button
          className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
          onClick={handleCopy}
          size="sm"
          type="button"
          variant="outline"
        >
          {copied ? <Check /> : <Clipboard />}
          {copied ? "복사됨" : "복사"}
        </Button>
      </div>
      <pre className="max-h-[520px] overflow-auto p-4 text-[13px] leading-6 text-[#e6edf3]">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 rounded-lg border border-black/10 bg-[#fafafc] p-3">
      <span className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
        {label}
      </span>
      <span className="break-words text-sm font-semibold text-[#1d1d1f]">{value}</span>
    </div>
  );
}

function TroubleshootingItem({ body, title }: { body: string; title: string }) {
  return (
    <div className="grid gap-1">
      <h3 className="text-sm font-semibold text-[#1d1d1f]">{title}</h3>
      <p className="text-sm leading-6 text-muted-foreground">{body}</p>
    </div>
  );
}
