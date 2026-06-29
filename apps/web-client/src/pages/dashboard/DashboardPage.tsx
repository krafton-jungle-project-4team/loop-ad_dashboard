import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  AppShell,
  Badge,
  Box,
  Button,
  Group,
  ScrollArea,
  Stack,
  Tabs,
  Text,
  Title
} from "@mantine/core";
import { Gauge, Play } from "lucide-react";
import { runDashboardAction } from "../../features/dashboard/api/dashboard-api.js";
import {
  dashboardActionLabels,
  dashboardTabs,
  dashboardTitles
} from "../../features/dashboard/model/dashboard-navigation.js";
import { parseDashboardQuery } from "../../features/dashboard/model/dashboard-query.js";
import type {
  DashboardActionState,
  DashboardTab
} from "../../features/dashboard/model/dashboard-types.js";
import { useDashboardResources } from "../../features/dashboard/model/use-dashboard-resources.js";
import { LoadingState } from "../../features/dashboard/ui/LoadingState.js";
import { renderDashboardPanel } from "../../features/dashboard/ui/render-dashboard-panel.js";

export function DashboardPage() {
  const [tab, setTab] = useState<DashboardTab>("collectionStatus");
  const [refreshKey, setRefreshKey] = useState(0);
  const [actionState, setActionState] = useState<DashboardActionState>({ status: "idle" });
  const query = useMemo(
    () => parseDashboardQuery(typeof window === "undefined" ? "" : window.location.search),
    []
  );
  const state = useDashboardResources(tab, query, refreshKey);
  const actionLabel = dashboardActionLabels[tab];

  useEffect(() => {
    setActionState({ status: "idle" });
  }, [tab]);

  async function handleRunAction() {
    if (!query || !actionLabel) {
      return;
    }

    setActionState({ status: "running" });
    try {
      await runDashboardAction(tab, query);
      setActionState({ status: "success" });
      setRefreshKey((current) => current + 1);
    } catch (error: unknown) {
      setActionState({
        status: "error",
        error: error instanceof Error ? error : new Error("작업 요청 실패")
      });
    }
  }

  return (
    <AppShell header={{ height: 72 }} padding={0}>
      <AppShell.Header bg="white" withBorder>
        <Group h="100%" justify="space-between" px={{ base: "md", md: "xl" }}>
          <Group gap="sm">
            <Box bg="appleInk.9" bdrs="md" c="white" p={8}>
              <Gauge size={20} />
            </Box>
            <div>
              <Title c="appleInk.9" order={1} size={22}>
                LoopAd
              </Title>
              <Text c="appleInk.5" size="xs">
                MVP Dashboard
              </Text>
            </div>
          </Group>
          <Group gap="xs" visibleFrom="sm">
            <Badge color="actionBlue.6" radius="xl" variant="light">
              {query?.projectId ?? "projectId 필요"}
            </Badge>
            <Badge color="actionBlue.6" radius="xl" variant="outline">
              {query?.experimentId ?? "experimentId 필요"}
            </Badge>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Main bg="appleInk.0">
        <ScrollArea h="calc(100vh - 72px)" offsetScrollbars>
          <Box maw={1440} mx="auto" px={{ base: "md", md: "xl" }} py="xl">
            <Stack gap="xl">
              <Stack gap="md">
                <Text c="actionBlue.6" fw={600}>
                  Dashboard
                </Text>
                <Title c="appleInk.9" order={2} size={42}>
                  {dashboardTitles[tab]}
                </Title>
                <Tabs
                  color="actionBlue.6"
                  onChange={(value) => {
                    if (isDashboardTab(value)) {
                      setTab(value);
                    }
                  }}
                  radius="xl"
                  value={tab}
                  variant="pills"
                >
                  <Tabs.List>
                    {dashboardTabs.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Tabs.Tab
                          key={item.value}
                          leftSection={<Icon size={16} />}
                          value={item.value}
                        >
                          {item.label}
                        </Tabs.Tab>
                      );
                    })}
                  </Tabs.List>
                </Tabs>
              </Stack>

              {actionLabel ? (
                <Group justify="flex-end">
                  <Button
                    color="actionBlue.6"
                    disabled={!query}
                    leftSection={<Play size={16} />}
                    loading={actionState.status === "running"}
                    onClick={() => {
                      void handleRunAction();
                    }}
                    radius="xl"
                    variant="filled"
                  >
                    {actionLabel}
                  </Button>
                </Group>
              ) : null}
              {actionState.status === "success" ? (
                <Alert color="green" radius="lg" title="작업 완료" variant="light">
                  최신 데이터를 다시 불러왔습니다.
                </Alert>
              ) : null}
              {actionState.status === "error" ? (
                <Alert color="red" radius="lg" title="작업 요청 실패" variant="light">
                  {actionState.error.message}
                </Alert>
              ) : null}
              {state.status === "idle" ? (
                <Alert
                  color="actionBlue.6"
                  radius="lg"
                  title="조회 컨텍스트가 필요합니다"
                  variant="light"
                >
                  URL에 projectId와 experimentId를 명시해주세요.
                </Alert>
              ) : null}
              {state.status === "loading" ? <LoadingState /> : null}
              {state.status === "error" ? (
                <Alert color="red" radius="lg" title="대시보드 API 요청 실패" variant="light">
                  {state.error.message}
                </Alert>
              ) : null}
              {state.status === "success" ? renderDashboardPanel(state.data) : null}
            </Stack>
          </Box>
        </ScrollArea>
      </AppShell.Main>
    </AppShell>
  );
}

function isDashboardTab(value: string | null): value is DashboardTab {
  return dashboardTabs.some((tab) => tab.value === value);
}
