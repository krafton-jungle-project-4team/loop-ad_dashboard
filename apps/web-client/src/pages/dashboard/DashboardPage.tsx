import { useState } from "react";
import {
  AppShell,
  Badge,
  Box,
  Burger,
  Group,
  NavLink,
  ScrollArea,
  Stack,
  Text,
  Title
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { Gauge } from "lucide-react";
import { projectId } from "../../features/dashboard/model/dashboard-config.js";
import {
  dashboardTabs,
  dashboardTitles
} from "../../features/dashboard/model/dashboard-navigation.js";
import type { DashboardTab } from "../../features/dashboard/model/dashboard-types.js";
import { useDashboardAiJob } from "../../features/dashboard/model/use-dashboard-ai-job.js";
import { useDashboardResources } from "../../features/dashboard/model/use-dashboard-resources.js";
import { LoadingState } from "../../features/dashboard/ui/LoadingState.js";
import { renderDashboardPanel } from "../../features/dashboard/ui/render-dashboard-panel.js";

export function DashboardPage() {
  const [opened, { toggle }] = useDisclosure();
  const [tab, setTab] = useState<DashboardTab>("overview");
  const state = useDashboardResources();
  const aiJobState = useDashboardAiJob(aiJobKindByTab[tab]);

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
            {dashboardTabs.map((item) => {
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
                  {dashboardTitles[tab]}
                </Title>
              </div>
              {state.status === "loading" ? <LoadingState /> : null}
              {state.status === "error" ? <Text c="red">{state.error.message}</Text> : null}
              {state.status === "success"
                ? renderDashboardPanel(tab, state.data, aiJobState)
                : null}
            </Stack>
          </Box>
        </ScrollArea>
      </AppShell.Main>
    </AppShell>
  );
}

const aiJobKindByTab = {
  overview: undefined,
  conversion: undefined,
  insights: "insight",
  recommendations: "recommendation",
  creatives: "creative"
} as const;
