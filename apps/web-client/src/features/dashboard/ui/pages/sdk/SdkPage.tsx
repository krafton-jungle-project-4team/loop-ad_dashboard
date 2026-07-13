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
  Terminal,
  type LucideIcon
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { TrackingPlanWorkspace } from "./TrackingPlanWorkspace.js";

const registryInstallCode = `# .npmrc
@krafton-jungle-project-4team:registry=https://npm.pkg.github.com

npm install @krafton-jungle-project-4team/loop-ad_advertisement_sdk@latest`;

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

export async function renderHomeTopBanner(user: { id: string; sessionId: string }): Promise<void> {
  const eventClient = await startLoopAdCollection({
    userId: user.id,
    sessionId: user.sessionId
  });
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
    renderFallbackBanner("지금 추천할 프로모션이 없어요.");
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

<script src="https://krafton-jungle-project-4team.github.io/loop-ad_advertisement_sdk/loop-ad-advertisement-sdk.iife.js"></script>
<script>
  // 이벤트 수집 문서의 client를 window.loopAdEventClient에 연결한 뒤 사용합니다.
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
      window.loopAdEventClient?.track("promotion_impression", toPromotionFields(decision));
    },
    onClick(decision) {
      window.loopAdEventClient?.track("promotion_click", toPromotionFields(decision));
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
  "광고를 보여 줄 targetId 요소가 화면에 있어요.",
  "ads.render() 결과가 empty이면 직접 fallback UI를 보여줍니다.",
  "광고 노출과 클릭은 onImpression, onClick에서 수집 SDK로 보내요."
];

const prerequisites = [
  {
    label: "프로젝트 ID",
    value: "Dashboard에서 만든 서비스 식별자"
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
  return (
    <TrackingPlanWorkspace advertisementGuide={<AdvertisementSdkGuide />} projectId={projectId} />
  );
}

function AdvertisementSdkGuide() {
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
          title="광고 SDK 연동 절차"
          description="광고 지면을 만들고 decision과 노출·클릭 콜백을 연결하는 순서입니다."
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
              body="공개 npm 패키지로 배포된 광고 SDK를 설치해요."
              icon={PackageCheck}
              number="1"
              title="패키지 설치"
            >
              <CodeBlock code={registryInstallCode} language="bash" title=".npmrc / terminal" />
            </GuideStep>
            <GuideStep
              body="광고 SDK는 광고를 고르고 화면에 보여 줘요. 먼저 이벤트 수집 가이드를 적용한 뒤 노출·클릭 정보를 수집 SDK로 넘겨 주세요."
              icon={FileCode2}
              number="2"
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
        <Badge variant="secondary">광고 SDK</Badge>
      </div>
      <div className="grid gap-2">
        <h1 className="text-[28px] font-semibold tracking-tight text-[#1d1d1f] md:text-[34px]">
          광고 SDK 연동 가이드
        </h1>
        <p className="max-w-3xl text-sm leading-6 text-muted-foreground md:text-base">
          일반 웹 프로젝트에 광고 지면을 붙이는 절차입니다. 프로젝트 값, 사용자 세션, 광고 지면
          이름만 실제 값으로 바꾸면 돼요.
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
          광고 SDK는 지정한 영역에 광고를 보여 줘요. 앱에서는 광고 응답과 노출·클릭 정보만 연결하면
          돼요.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        <Alert className="border-primary/20 bg-accent/60">
          <Code2 className="text-primary" />
          <AlertTitle>필수 흐름</AlertTitle>
          <AlertDescription>
            이벤트 수집 가이드를 먼저 적용한 뒤 광고 SDK의 결과와 콜백을 처리해요.
          </AlertDescription>
        </Alert>
        <div className="grid gap-2 sm:grid-cols-3">
          <SummaryMetric label="지면" value="placementId + targetId" />
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
        <CardDescription>연동이 안 된다면 아래 세 가지를 먼저 확인해 보세요.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <TroubleshootingItem
          title="광고 영역이 비어 있음"
          body="targetId element가 실제 DOM에 있는지 확인하고, decision.status가 empty이면 fallback UI를 직접 보여줍니다."
        />
        <TroubleshootingItem
          title="응답 처리를 어디서 해야 할지 모름"
          body="ads.render() 결과는 광고를 보여 준 직후 처리해요. 노출과 클릭은 onImpression과 onClick에서 처리해 주세요."
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
