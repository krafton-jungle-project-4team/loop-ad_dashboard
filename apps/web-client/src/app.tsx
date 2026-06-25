import { useEffect, useState } from "react";
import {
  AppShell,
  Badge,
  Box,
  Burger,
  Button,
  Card,
  Center,
  Group,
  Loader,
  NavLink,
  Progress,
  RingProgress,
  ScrollArea,
  SimpleGrid,
  Stack,
  Table,
  Text,
  ThemeIcon,
  Title
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  Bot,
  ChartNoAxesCombined,
  Check,
  Gauge,
  LayoutDashboard,
  Megaphone,
  Sparkles
} from "lucide-react";
import {
  ConversionReportSchema,
  CreativeReportSchema,
  DashboardOverviewSchema,
  InsightReportSchema,
  RecommendationReportSchema,
  createApiSuccessResponseSchema,
  type ConversionReport,
  type CreativeReport,
  type CustomerSegment,
  type DashboardOverview,
  type FunnelStep,
  type InsightReport,
  type MetricValue,
  type NamedPerformance,
  type RecommendationReport,
  type TimeSeriesPoint
} from "@loopad/shared";
import type { z } from "zod";

type Tab = "overview" | "conversion" | "insights" | "recommendations" | "creatives";
type Resources = {
  overview: DashboardOverview;
  conversion: ConversionReport;
  insights: InsightReport;
  recommendations: RecommendationReport;
  creatives: CreativeReport;
};

const projectId = import.meta.env.VITE_PROJECT_ID ?? "loopad-demo-shop";
const apiBaseUrl = (import.meta.env.VITE_DASHBOARD_API_BASE_URL ?? "/api").replace(/\/$/, "");

const tabs: Array<{ value: Tab; label: string; icon: typeof LayoutDashboard }> = [
  { value: "overview", label: "메인 대시보드", icon: LayoutDashboard },
  { value: "conversion", label: "구매전환", icon: ChartNoAxesCombined },
  { value: "insights", label: "AI 분석", icon: Bot },
  { value: "recommendations", label: "AI 추천", icon: Sparkles },
  { value: "creatives", label: "컨텐츠 생성", icon: Megaphone }
];

const titles: Record<Tab, string> = {
  overview: "메인 대시보드",
  conversion: "구매전환",
  insights: "AI 분석",
  recommendations: "AI 추천",
  creatives: "컨텐츠 생성"
};

export function App() {
  const [opened, { toggle }] = useDisclosure();
  const [tab, setTab] = useState<Tab>("overview");
  const state = useResources();

  return (
    <AppShell
      header={{ height: 64 }}
      navbar={{ width: 280, breakpoint: "md", collapsed: { mobile: !opened } }}
      padding={0}
    >
      <AppShell.Header bg="white" withBorder>
        <Group h="100%" justify="space-between" px="xl">
          <Group gap="md">
            <Burger hiddenFrom="md" onClick={toggle} opened={opened} size="sm" />
            <Group gap="sm">
              <Box bg="appleInk.9" bdrs="md" c="white" p={8}>
                <Gauge size={20} />
              </Box>
              <div>
                <Title c="appleInk.9" order={1} size={22}>
                  LoopAd
                </Title>
                <Text c="dimmed" size="xs">
                  Marketing Intelligence Dashboard
                </Text>
              </div>
            </Group>
          </Group>
          <Badge color="actionBlue.6" radius="xl" variant="light">
            LIVE
          </Badge>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar bg="appleInk.9" c="white" p="md">
        <Stack gap="lg">
          <Box px="sm" py="md">
            <Text c="appleInk.2" size="sm">
              project
            </Text>
            <Text fw={700}>{projectId}</Text>
          </Box>
          <Stack gap={6}>
            {tabs.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  active={item.value === tab}
                  color="actionBlue.6"
                  key={item.value}
                  label={item.label}
                  leftSection={<Icon size={18} />}
                  onClick={() => setTab(item.value)}
                  variant={item.value === tab ? "filled" : "subtle"}
                />
              );
            })}
          </Stack>
        </Stack>
      </AppShell.Navbar>

      <AppShell.Main bg="appleInk.0">
        <ScrollArea h="calc(100vh - 64px)" offsetScrollbars>
          <Box maw={1500} mx="auto" px={{ base: "md", md: "xl" }} py="xl">
            <Stack gap="xl">
              <div>
                <Text c="actionBlue.6" fw={700}>
                  Dashboard
                </Text>
                <Title c="appleInk.9" order={2} size={42}>
                  {titles[tab]}
                </Title>
              </div>
              {state.status === "loading" ? <LoadingState /> : null}
              {state.status === "error" ? <Text c="red">{state.error.message}</Text> : null}
              {state.status === "success" ? renderPage(tab, state.data) : null}
            </Stack>
          </Box>
        </ScrollArea>
      </AppShell.Main>
    </AppShell>
  );
}

function OverviewPage({ overview }: { overview: DashboardOverview }) {
  return (
    <Stack gap="xl">
      <SimpleGrid cols={{ base: 1, sm: 2, xl: 4 }} spacing="lg">
        <Metric metric={overview.metrics.purchaseConversionRate} />
        <Metric metric={overview.metrics.checkoutDropOffRate} />
        <Metric metric={overview.metrics.realtimePurchases} />
        <Metric metric={overview.metrics.forecastRevenue} />
      </SimpleGrid>
      <SimpleGrid cols={{ base: 1, xl: 3 }} spacing="lg">
        <Section title="피크타임 행동 이벤트와 실시간 구매">
          <Bars events={overview.recentBehaviorEvents} purchases={overview.recentPurchases} />
        </Section>
        <Card bg="appleInk.8" c="white" p="xl">
          <Stack gap="xl">
            <Text c="actionBlue.2" fw={700}>
              Forecast
            </Text>
            <Title c="white" order={2} size={36}>
              {overview.forecast.title}
            </Title>
            <Bars
              events={overview.forecast.plannedRevenue}
              purchases={overview.forecast.actualRevenue}
            />
          </Stack>
        </Card>
      </SimpleGrid>
      <Title c="appleInk.9" order={2} size={34}>
        세그먼트 현황
      </Title>
      <SimpleGrid cols={{ base: 1, md: 2, xl: 4 }} spacing="lg">
        <Section title="마케팅 채널">
          <Performance items={overview.segmentPerformance.channels} />
        </Section>
        <Section title="지역별 성과">
          <Performance items={overview.segmentPerformance.regions} />
        </Section>
        <Section title="연령/성별 성과">
          <Performance items={overview.segmentPerformance.ageGender} />
        </Section>
        <Section title="기기별 구매 비중">
          <DeviceRing items={overview.segmentPerformance.devices} />
        </Section>
      </SimpleGrid>
      <Section title="카테고리별 구매 현황">
        <Performance items={overview.segmentPerformance.categories} />
      </Section>
    </Stack>
  );
}

function ConversionPage({ conversion }: { conversion: ConversionReport }) {
  return (
    <Stack gap="xl">
      <Section title="구매 전환 퍼널">
        <Funnel steps={conversion.funnel} />
      </Section>
      <SimpleGrid cols={{ base: 1, xl: 2 }} spacing="lg">
        <Comparison title="기기별 퍼널 비교" rows={conversion.deviceComparison} />
        <Comparison title="채널별 퍼널 비교" rows={conversion.channelComparison} />
      </SimpleGrid>
      <Section title="고객군별 구매 행동 테이블">
        <Table.ScrollContainer minWidth={860}>
          <Table verticalSpacing="md">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>고객군</Table.Th>
                <Table.Th>구매 전환율</Table.Th>
                <Table.Th>주요 이탈률</Table.Th>
                <Table.Th>예상 매출</Table.Th>
                <Table.Th>관찰 신호</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {conversion.customerBehaviors.map((row) => (
                <Table.Tr key={row.segment}>
                  <Table.Td fw={700}>{row.segment}</Table.Td>
                  <Table.Td>{row.conversionRate}</Table.Td>
                  <Table.Td>{row.dropOffRate}</Table.Td>
                  <Table.Td>{row.forecastRevenue}</Table.Td>
                  <Table.Td>{row.observedSignals.join(", ")}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Section>
    </Stack>
  );
}

function InsightsPage({ insights }: { insights: InsightReport }) {
  const detail = insights.selectedInsight;
  return (
    <Stack gap="xl">
      <Section title="전환율 상위 고객군 목록">
        <SegmentTable segments={insights.topSegments} />
      </Section>
      {detail ? (
        <Section title="AI 분석 요약">
          <Stack gap="lg">
            <Title order={2}>{detail.segment.name}</Title>
            <SimpleGrid cols={{ base: 1, md: 4 }}>
              <Metric metric={{ label: "실제 전환율", value: detail.actualConversionRate }} />
              <Metric metric={{ label: "예상 전환율", value: detail.expectedConversionRate }} />
              <Metric metric={{ label: "전환율 차이", value: detail.conversionGap }} />
              <Metric metric={{ label: "예상 매출", value: detail.forecastRevenue }} />
            </SimpleGrid>
            <SimpleGrid cols={{ base: 1, lg: 3 }}>
              <Section title="품절/가격/채널/기기 관찰 신호">
                <Signals items={detail.observedSignals} />
              </Section>
              <Section title="과거 구매이력">
                <Performance items={detail.purchaseHistory} />
              </Section>
              <Section title="주요 이탈 단계">
                <Text>{detail.summary}</Text>
              </Section>
            </SimpleGrid>
            <Section title="구매 단계 흐름">
              <CompactFlow steps={detail.purchaseFlow} />
            </Section>
          </Stack>
        </Section>
      ) : null}
      <Section title="전환율 하위 고객군 목록">
        <SegmentTable segments={insights.bottomSegments} />
      </Section>
    </Stack>
  );
}

function RecommendationsPage({ recommendations }: { recommendations: RecommendationReport }) {
  return (
    <Stack gap="xl">
      <Section title="고객군 목록">
        <Table.ScrollContainer minWidth={960}>
          <Table verticalSpacing="md">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>고객군</Table.Th>
                <Table.Th>추천 액션</Table.Th>
                <Table.Th>추천 근거</Table.Th>
                <Table.Th>예상 전환율 상승</Table.Th>
                <Table.Th>예상 매출</Table.Th>
                <Table.Th>우선순위</Table.Th>
                <Table.Th>적용 채널</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {recommendations.actions.map((action) => (
                <Table.Tr key={action.id}>
                  <Table.Td fw={700}>{action.segment.name}</Table.Td>
                  <Table.Td>{action.action}</Table.Td>
                  <Table.Td>{action.rationale}</Table.Td>
                  <Table.Td>{action.expectedConversionLift}</Table.Td>
                  <Table.Td>{action.forecastRevenue}</Table.Td>
                  <Table.Td>{action.priority}</Table.Td>
                  <Table.Td>{action.channels.join(", ")}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Section>
      {recommendations.actions[0] ? (
        <Section title="구매 단계 흐름">
          <CompactFlow steps={recommendations.actions[0].purchaseFlow} />
        </Section>
      ) : null}
    </Stack>
  );
}

function CreativesPage({ creatives }: { creatives: CreativeReport }) {
  const selected = creatives.creatives[0];
  return (
    <Stack gap="xl">
      <Section title="고객군 목록">
        <SegmentTable segments={creatives.creatives.map((creative) => creative.segment)} />
      </Section>
      {selected ? (
        <Section title={selected.segment.name}>
          <SimpleGrid cols={{ base: 1, xl: 3 }}>
            <Card bg="appleInk.0" p="xl" withBorder>
              <Stack gap="lg">
                <Group justify="space-between">
                  <Title order={3}>생성된 광고 문구</Title>
                  <Badge color="actionBlue.6" radius="xl" variant="light">
                    {selected.channels[0]}
                  </Badge>
                </Group>
                <Title order={4}>{selected.copy.headline}</Title>
                <Text>{selected.copy.body}</Text>
                <Group justify="space-between">
                  <Button color="actionBlue.6">{selected.copy.cta}</Button>
                  <Button color="actionBlue.6" variant="light">
                    관리자 승인
                  </Button>
                </Group>
              </Stack>
            </Card>
            <Media title="이미지 광고 영역" label={selected.imageAsset?.label ?? ""} />
            <Media title="영상 썸네일 영역" label={selected.videoAsset?.label ?? ""} />
          </SimpleGrid>
          <Group mt="lg">
            <Badge color="actionBlue.6" radius="xl" variant="light">
              A/B 테스트 실행 상태: {selected.abTestStatus}
            </Badge>
            <Badge color="actionBlue.6" radius="xl" variant="light">
              발송 채널: {selected.channels.join(", ")}
            </Badge>
          </Group>
        </Section>
      ) : null}
    </Stack>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card bg="white" p="xl" radius="lg" withBorder>
      <Title c="appleInk.9" mb="lg" order={2} size="h3">
        {title}
      </Title>
      {children}
    </Card>
  );
}

function Metric({ metric }: { metric: MetricValue }) {
  return (
    <Card bg="white" p="xl" radius="lg" withBorder>
      <Stack gap={6}>
        <Text c="dimmed" fw={600} size="sm">
          {metric.label}
        </Text>
        <Title c="appleInk.9" order={3} size={42}>
          {metric.value}
        </Title>
        <Text c="dimmed" size="sm">
          {metric.delta ?? metric.description}
        </Text>
      </Stack>
    </Card>
  );
}

function Performance({ items }: { items: NamedPerformance[] }) {
  const max = Math.max(...items.map((item) => item.value), 1);
  return (
    <Stack gap="md">
      {items.map((item) => (
        <Stack gap={6} key={item.name}>
          <Group justify="space-between">
            <Text fw={600}>{item.name}</Text>
            <Text fw={700}>{item.displayValue}</Text>
          </Group>
          <Progress color="actionBlue.6" radius="xs" value={(item.value / max) * 100} />
        </Stack>
      ))}
    </Stack>
  );
}

function Bars({ events, purchases }: { events: TimeSeriesPoint[]; purchases: TimeSeriesPoint[] }) {
  return (
    <Stack gap="xl">
      <BarTrack color="actionBlue.6" points={events} />
      <BarTrack color="appleInk.4" points={purchases} />
    </Stack>
  );
}

function BarTrack({ points, color }: { points: TimeSeriesPoint[]; color: string }) {
  const max = Math.max(...points.map((point) => point.value), 1);
  return (
    <Group align="end" gap={8} wrap="nowrap">
      {points.map((point) => (
        <Stack align="center" gap={8} key={point.label} style={{ flex: 1 }}>
          <Box
            bg={color}
            h={Math.max(8, (point.value / max) * 120)}
            style={{ borderRadius: 999 }}
            w="100%"
          />
          <Text c="dimmed" size="xs">
            {point.label}
          </Text>
        </Stack>
      ))}
    </Group>
  );
}

function Funnel({ steps }: { steps: FunnelStep[] }) {
  return (
    <SimpleGrid cols={{ base: 1, sm: 2, lg: 5 }}>
      {steps.map((step, index) => (
        <Box
          bg="appleInk.0"
          bdrs="lg"
          key={step.key}
          p="lg"
          style={{ border: "1px solid var(--mantine-color-gray-3)" }}
        >
          <Stack gap="sm">
            <Group justify="space-between">
              <Text c="dimmed" size="xs">
                단계 {index + 1}
              </Text>
              <Text c="actionBlue.6" fw={700}>
                {step.conversionRate}%
              </Text>
            </Group>
            <Text fw={700}>{step.label}</Text>
            <Text c="dimmed">{step.displayUserCount}</Text>
            <Progress color="actionBlue.6" radius="xs" value={step.conversionRate} />
            <Text c="dimmed" size="xs">
              이탈률 {step.dropOffRate}%
            </Text>
          </Stack>
        </Box>
      ))}
    </SimpleGrid>
  );
}

function CompactFlow({ steps }: { steps: FunnelStep[] }) {
  return (
    <SimpleGrid cols={{ base: 1, sm: 5 }}>
      {steps.map((step) => (
        <Box key={step.key}>
          <Text c="dimmed" size="xs">
            {step.label}
          </Text>
          <Text fw={700}>{step.conversionRate}%</Text>
          <Progress color="actionBlue.6" radius="xs" value={step.conversionRate} />
        </Box>
      ))}
    </SimpleGrid>
  );
}

function SegmentTable({ segments }: { segments: CustomerSegment[] }) {
  return (
    <Table.ScrollContainer minWidth={900}>
      <Table verticalSpacing="md">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>고객군</Table.Th>
            <Table.Th>채널</Table.Th>
            <Table.Th>연령</Table.Th>
            <Table.Th>성별</Table.Th>
            <Table.Th>카테고리</Table.Th>
            <Table.Th>지역</Table.Th>
            <Table.Th>기기</Table.Th>
            <Table.Th>전환율</Table.Th>
            <Table.Th>주요 이탈 단계</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {segments.map((segment) => (
            <Table.Tr key={segment.id}>
              <Table.Td fw={700}>{segment.name}</Table.Td>
              <Table.Td>{segment.channel}</Table.Td>
              <Table.Td>{segment.ageGroup}</Table.Td>
              <Table.Td>{segment.gender}</Table.Td>
              <Table.Td>{segment.category}</Table.Td>
              <Table.Td>{segment.region}</Table.Td>
              <Table.Td>{segment.device}</Table.Td>
              <Table.Td>
                <Text c="red.5" fw={800}>
                  {segment.conversionRate}
                </Text>
              </Table.Td>
              <Table.Td>{segment.majorDropOffStep}</Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}

function Comparison({
  title,
  rows
}: {
  title: string;
  rows: ConversionReport["deviceComparison"];
}) {
  return (
    <Section title={title}>
      <Table.ScrollContainer minWidth={620}>
        <Table verticalSpacing="md">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>구분</Table.Th>
              {rows[0]?.steps.map((step) => (
                <Table.Th key={step.key}>{step.label}</Table.Th>
              ))}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows.map((row) => (
              <Table.Tr key={row.segment}>
                <Table.Td fw={700}>{row.segment}</Table.Td>
                {row.steps.map((step) => (
                  <Table.Td key={`${row.segment}-${step.key}`}>{step.displayUserCount}</Table.Td>
                ))}
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
    </Section>
  );
}

function DeviceRing({ items }: { items: NamedPerformance[] }) {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  return (
    <Group justify="space-between">
      <RingProgress
        sections={items.map((item, index) => ({
          value: total > 0 ? (item.value / total) * 100 : 0,
          color: index === 0 ? "actionBlue.6" : "appleInk.4"
        }))}
        size={180}
        thickness={30}
      />
      <Performance items={items} />
    </Group>
  );
}

function Signals({ items }: { items: string[] }) {
  return (
    <Stack gap="md">
      {items.map((item) => (
        <Group key={item}>
          <ThemeIcon color="actionBlue.6" radius="xl">
            <Check size={16} />
          </ThemeIcon>
          <Text>{item}</Text>
        </Group>
      ))}
    </Stack>
  );
}

function Media({ title, label }: { title: string; label: string }) {
  return (
    <Card bg="appleInk.0" p="xl" withBorder>
      <Stack gap="md">
        <Title order={3}>{title}</Title>
        <Center
          h={220}
          style={{ border: "1px dashed var(--mantine-color-gray-4)", borderRadius: 18 }}
        >
          <Stack align="center">
            <Text c="dimmed" fw={700} size="xl">
              {title}
            </Text>
            <Text c="dimmed">{label}</Text>
          </Stack>
        </Center>
        <Button color="actionBlue.6" fullWidth variant="light">
          관리자 승인
        </Button>
      </Stack>
    </Card>
  );
}

function LoadingState() {
  return (
    <Center h={420}>
      <Stack align="center">
        <Loader color="actionBlue.6" />
        <Text c="dimmed">데이터를 불러오는 중입니다.</Text>
      </Stack>
    </Center>
  );
}

function renderPage(tab: Tab, data: Resources) {
  switch (tab) {
    case "overview":
      return <OverviewPage overview={data.overview} />;
    case "conversion":
      return <ConversionPage conversion={data.conversion} />;
    case "insights":
      return <InsightsPage insights={data.insights} />;
    case "recommendations":
      return <RecommendationsPage recommendations={data.recommendations} />;
    case "creatives":
      return <CreativesPage creatives={data.creatives} />;
  }
}

function useResources() {
  const [state, setState] = useState<
    | { status: "loading"; data?: undefined; error?: undefined }
    | { status: "success"; data: Resources; error?: undefined }
    | { status: "error"; data?: undefined; error: Error }
  >({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    fetchResources(controller.signal)
      .then((data) => setState({ status: "success", data }))
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setState({
            status: "error",
            error: error instanceof Error ? error : new Error("데이터 요청 실패")
          });
        }
      });
    return () => controller.abort();
  }, []);

  return state;
}

async function fetchResources(signal: AbortSignal): Promise<Resources> {
  const [overview, conversion, insights, recommendations, creatives] = await Promise.all([
    request("/dashboard/overview", DashboardOverviewSchema, signal),
    request("/dashboard/conversion", ConversionReportSchema, signal),
    request("/dashboard/ai-insights", InsightReportSchema, signal),
    request("/dashboard/ai-recommendations", RecommendationReportSchema, signal),
    request("/creatives/generated", CreativeReportSchema, signal)
  ]);
  return { overview, conversion, insights, recommendations, creatives };
}

async function request<T>(path: string, schema: z.ZodType<T>, signal: AbortSignal): Promise<T> {
  const url = new URL(`${apiBaseUrl}${path}`, window.location.origin);
  url.searchParams.set("projectId", projectId);
  const response = await fetch(url, { headers: { Accept: "application/json" }, signal });
  if (!response.ok) {
    throw new Error(`API 요청 실패: ${response.status}`);
  }
  return createApiSuccessResponseSchema(schema).parse(await response.json()).data;
}
