import { useMemo, useState } from "react";
import {
  Alert,
  AppShell,
  Badge,
  Box,
  Group,
  ScrollArea,
  Stack,
  Tabs,
  Text,
  Title
} from "@mantine/core";
import { Gauge } from "lucide-react";
import {
  dashboardTabs,
  dashboardTitles
} from "../../features/dashboard/model/dashboard-navigation.js";
import { parseDashboardQuery } from "../../features/dashboard/model/dashboard-query.js";
import type { DashboardTab } from "../../features/dashboard/model/dashboard-types.js";
import { useDashboardResources } from "../../features/dashboard/model/use-dashboard-resources.js";
import { LoadingState } from "../../features/dashboard/ui/LoadingState.js";
import { renderDashboardPanel } from "../../features/dashboard/ui/render-dashboard-panel.js";

export function DashboardPage() {
  const [tab, setTab] = useState<DashboardTab>("events");
  const query = useMemo(
    () => parseDashboardQuery(typeof window === "undefined" ? "" : window.location.search),
    []
  );
  const state = useDashboardResources(query);

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
                Read-only MVP Dashboard
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
              {state.status === "success" ? renderDashboardPanel(tab, state.data) : null}
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
