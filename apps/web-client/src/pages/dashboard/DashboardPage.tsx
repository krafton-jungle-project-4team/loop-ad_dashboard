import { useMemo, useState } from "react";
import {
  Alert,
  AppShell,
  Badge,
  Box,
  Group,
  NavLink,
  ScrollArea,
  Stack,
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
  const [tab, setTab] = useState<DashboardTab>("main");
  const query = useMemo(
    () => parseDashboardQuery(typeof window === "undefined" ? "" : window.location.search),
    []
  );
  const state = useDashboardResources(tab, query, 0);

  return (
    <AppShell header={{ height: 52 }} navbar={{ width: 280, breakpoint: "sm" }} padding={0}>
      <AppShell.Header bg="white" withBorder>
        <Group h="100%" justify="center" px={{ base: "md", md: "xl" }} pos="relative">
          <Title c="appleInk.9" order={1} size={20}>
            {dashboardTitles[tab]}
          </Title>
          <Group gap="xs" pos="absolute" right={32} visibleFrom="sm">
            <Badge color="actionBlue.6" radius="xl" variant="light">
              {query?.projectId ?? "projectId 필요"}
            </Badge>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar bg="white" p="md" withBorder>
        <Stack gap="xl">
          <Group gap="sm">
            <Box bg="appleInk.9" bdrs="md" c="white" p={8}>
              <Gauge size={18} />
            </Box>
            <div>
              <Title c="appleInk.9" order={2} size={18}>
                loop-ad
              </Title>
              <Text c="appleInk.5" size="xs">
                Dashboard
              </Text>
            </div>
          </Group>

          <Stack gap={4}>
            {dashboardTabs.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.value}
                  active={tab === item.value}
                  color="actionBlue.6"
                  label={item.label}
                  leftSection={<Icon size={16} />}
                  onClick={() => setTab(item.value)}
                  variant="light"
                />
              );
            })}
          </Stack>
        </Stack>
      </AppShell.Navbar>

      <AppShell.Main bg="appleInk.0">
        <ScrollArea h="calc(100vh - 52px)" offsetScrollbars>
          <Box maw={1280} mx="auto" px={{ base: "md", md: "xl" }} py="xl">
            {state.status === "idle" ? (
              <Alert
                color="actionBlue.6"
                radius="lg"
                title="조회 컨텍스트가 필요합니다"
                variant="light"
              >
                URL에 projectId를 명시해주세요.
              </Alert>
            ) : null}
            {state.status === "loading" ? <LoadingState /> : null}
            {state.status === "error" ? (
              <Alert color="red" radius="lg" title="대시보드 API 요청 실패" variant="light">
                {state.error.message}
              </Alert>
            ) : null}
            {state.status === "success" ? renderDashboardPanel(state.data) : null}
          </Box>
        </ScrollArea>
      </AppShell.Main>
    </AppShell>
  );
}
