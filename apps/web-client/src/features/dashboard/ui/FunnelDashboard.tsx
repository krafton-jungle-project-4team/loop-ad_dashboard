import {
  type DashboardCreateFunnelRequest,
  DashboardFunnelEventNameSchema,
  type DashboardFunnelList
} from "@loopad/shared";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "@loopad/ui/charts";
import { Alert, AlertDescription, AlertTitle } from "@loopad/ui/shadcn/alert";
import { Badge } from "@loopad/ui/shadcn/badge";
import { Button } from "@loopad/ui/shadcn/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@loopad/ui/shadcn/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@loopad/ui/shadcn/chart";
import { Field, FieldGroup, FieldLabel } from "@loopad/ui/shadcn/field";
import { Input } from "@loopad/ui/shadcn/input";
import { NativeSelect, NativeSelectOption } from "@loopad/ui/shadcn/native-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@loopad/ui/shadcn/table";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import {
  createDashboardFunnel,
  deleteDashboardFunnel,
  fetchDashboardEventCatalog,
  fetchDashboardFunnelMetrics
} from "../api/dashboard-api.js";
import {
  dashboardEventCatalogQueryKey,
  dashboardFunnelMetricsQueryKey,
  dashboardTabQueryKey
} from "../model/dashboard-query-keys.js";
import { formatStatusLabel } from "../model/dashboard-labels.js";
import type { DashboardQuery } from "../model/dashboard-types.js";
import { EmptyState } from "./EmptyState.js";

type FunnelDraftStep = {
  step_name: string;
  event_name: string;
};

const DEFAULT_STEPS: FunnelDraftStep[] = [
  { step_name: "", event_name: "" },
  { step_name: "", event_name: "" }
];

export function FunnelDashboardPanel({
  data,
  query
}: {
  data: DashboardFunnelList;
  query: DashboardQuery;
}) {
  const queryClient = useQueryClient();
  const [funnelName, setFunnelName] = useState("");
  const [steps, setSteps] = useState(() => createDefaultSteps());
  const [selectedFunnelId, setSelectedFunnelId] = useState("");
  const eventCatalog = useQuery({
    queryFn: ({ signal }) => fetchDashboardEventCatalog(query, signal),
    queryKey: dashboardEventCatalogQueryKey(query.projectId)
  });
  const selectedFunnel = data.funnels.find((funnel) => funnel.funnel_id === selectedFunnelId);
  const funnelMetrics = useQuery({
    enabled: Boolean(selectedFunnelId),
    queryFn: ({ signal }) => fetchDashboardFunnelMetrics(query, selectedFunnelId, signal),
    queryKey: dashboardFunnelMetricsQueryKey(query.projectId, selectedFunnelId)
  });
  const eventOptions = eventCatalog.data?.events ?? [];
  const createMutation = useMutation({
    mutationFn: () => createDashboardFunnel(query, createFunnelRequest(funnelName, steps)),
    onSuccess: async () => {
      setFunnelName("");
      setSteps(createDefaultSteps());
      await queryClient.invalidateQueries({ queryKey: dashboardTabQueryKey("funnels") });
    }
  });
  const deleteMutation = useMutation({
    mutationFn: (funnelId: string) => deleteDashboardFunnel(query, funnelId),
    onSuccess: async (result) => {
      setSelectedFunnelId((current) => (current === result.funnel_id ? "" : current));
      await queryClient.invalidateQueries({ queryKey: dashboardTabQueryKey("funnels") });
    }
  });
  const isEventCatalogEmpty = eventCatalog.isSuccess && eventOptions.length === 0;
  const canSave =
    Boolean(funnelName.trim()) &&
    steps.length >= 2 &&
    steps.every((step) => step.step_name.trim() && step.event_name.trim());

  return (
    <div className="grid gap-6">
      <Card className="w-full min-w-0 rounded-[18px] bg-white py-5 shadow-none ring-1 ring-black/10">
        <CardHeader className="gap-1.5 px-5">
          <CardTitle className="text-[22px] font-semibold tracking-tight text-[#1d1d1f]">
            퍼널 생성
          </CardTitle>
          <CardDescription>
            수집된 이벤트 목록에서 단계를 선택해 퍼널을 저장합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 px-5">
          {eventCatalog.isError ? (
            <Alert variant="destructive">
              <AlertTitle>이벤트 목록을 불러오지 못했습니다</AlertTitle>
              <AlertDescription>
                수집 이벤트 카탈로그 API 응답을 확인해주세요.
              </AlertDescription>
            </Alert>
          ) : null}
          {isEventCatalogEmpty ? (
            <Alert>
              <AlertTitle>선택 가능한 이벤트가 없습니다</AlertTitle>
              <AlertDescription>
                ClickHouse에 수집된 퍼널 이벤트가 있어야 단계를 선택할 수 있습니다.
              </AlertDescription>
            </Alert>
          ) : null}
          {createMutation.isError ? (
            <Alert variant="destructive">
              <AlertTitle>퍼널을 저장하지 못했습니다</AlertTitle>
              <AlertDescription>{mutationErrorMessage(createMutation.error)}</AlertDescription>
            </Alert>
          ) : null}
          {deleteMutation.isError ? (
            <Alert variant="destructive">
              <AlertTitle>퍼널을 삭제하지 못했습니다</AlertTitle>
              <AlertDescription>{mutationErrorMessage(deleteMutation.error)}</AlertDescription>
            </Alert>
          ) : null}
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="funnel-name">퍼널 이름</FieldLabel>
              <Input
                disabled={createMutation.isPending}
                id="funnel-name"
                onChange={(event) => setFunnelName(event.target.value)}
                value={funnelName}
              />
            </Field>
          </FieldGroup>
          <div className="grid gap-3">
            {steps.map((step, index) => (
              <div className="grid gap-2 md:grid-cols-[1fr_auto]" key={index}>
                <NativeSelect
                  aria-label={`${index + 1}번째 퍼널 이벤트`}
                  className="w-full"
                  disabled={
                    eventCatalog.isLoading || !eventOptions.length || createMutation.isPending
                  }
                  onChange={(event) => selectEvent(index, event.target.value)}
                  value={step.event_name}
                >
                  <NativeSelectOption value="">
                    {eventPlaceholder(eventCatalog.isLoading, isEventCatalogEmpty)}
                  </NativeSelectOption>
                  {eventOptions.map((eventItem) => (
                    <NativeSelectOption key={eventItem.event_name} value={eventItem.event_name}>
                      {eventItem.display_name} ({eventItem.event_name})
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
                <Button
                  disabled={steps.length <= 2 || createMutation.isPending}
                  onClick={() => removeStep(index)}
                  size="icon"
                  type="button"
                  variant="outline"
                >
                  <Trash2 data-icon="inline-start" />
                </Button>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={!eventOptions.length || createMutation.isPending}
              onClick={addStep}
              type="button"
              variant="outline"
            >
              <Plus data-icon="inline-start" />
              단계 추가
            </Button>
            <Button
              disabled={!canSave || createMutation.isPending}
              onClick={() => createMutation.mutate()}
              type="button"
            >
              저장
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="w-full min-w-0 rounded-[18px] bg-white py-5 shadow-none ring-1 ring-black/10">
        <CardHeader className="gap-1.5 px-5">
          <CardTitle className="text-[22px] font-semibold tracking-tight text-[#1d1d1f]">
            퍼널 목록
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5">
          {data.funnels.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>퍼널</TableHead>
                  <TableHead>단계</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.funnels.map((funnel) => (
                  <TableRow
                    aria-selected={selectedFunnelId === funnel.funnel_id}
                    className="cursor-pointer"
                    key={funnel.funnel_id}
                    onClick={() => selectFunnel(funnel.funnel_id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        selectFunnel(funnel.funnel_id);
                      }
                    }}
                    tabIndex={0}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span>{funnel.funnel_name}</span>
                        {selectedFunnelId === funnel.funnel_id ? (
                          <Badge variant="outline">선택됨</Badge>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>{funnel.steps.map(stepLabel).join(" -> ")}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{formatStatusLabel(funnel.status)}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          disabled={deleteMutation.isPending}
                          onClick={(event) => {
                            event.stopPropagation();
                            deleteMutation.mutate(funnel.funnel_id);
                          }}
                          size="icon"
                          type="button"
                          variant="outline"
                        >
                          <Trash2 data-icon="inline-start" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState message="등록된 퍼널이 없습니다." />
          )}
        </CardContent>
      </Card>

      <Card className="w-full min-w-0 rounded-[18px] bg-white py-5 shadow-none ring-1 ring-black/10">
        <CardHeader className="gap-1.5 px-5">
          <CardTitle className="text-[22px] font-semibold tracking-tight text-[#1d1d1f]">
            퍼널 단계별 수치
          </CardTitle>
          <CardDescription>
            선택한 퍼널의 단계별 도달 사용자 수를 표시합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-5">
          {funnelMetrics.isError ? (
            <Alert variant="destructive">
              <AlertTitle>퍼널 수치를 불러오지 못했습니다</AlertTitle>
              <AlertDescription>{mutationErrorMessage(funnelMetrics.error)}</AlertDescription>
            </Alert>
          ) : null}
          {selectedFunnel ? (
            <ChartContainer
              className="min-h-[280px] w-full"
              config={{
                event_count: {
                  color: "var(--chart-1)",
                  label: "도달 수"
                }
              }}
            >
              <LineChart data={funnelMetrics.data?.steps ?? []}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="step_name"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  activeDot={{ r: 6 }}
                  dataKey="event_count"
                  dot={{ r: 4 }}
                  stroke="var(--color-event_count)"
                  strokeWidth={2}
                  type="linear"
                />
              </LineChart>
            </ChartContainer>
          ) : (
            <EmptyState message="수치를 확인할 퍼널을 선택해주세요." />
          )}
        </CardContent>
      </Card>
    </div>
  );

  function addStep() {
    setSteps((current) => [...current, { step_name: "", event_name: "" }]);
  }

  function removeStep(index: number) {
    setSteps((current) => current.filter((_, currentIndex) => currentIndex !== index));
  }

  function selectFunnel(funnelId: string) {
    setSelectedFunnelId(funnelId);
  }

  function selectEvent(index: number, eventName: string) {
    const eventItem = eventOptions.find((item) => item.event_name === eventName);
    setSteps((current) =>
      current.map((step, currentIndex) =>
        currentIndex === index
          ? {
              event_name: eventName,
              step_name: eventItem?.display_name ?? ""
            }
          : step
      )
    );
  }
}

function createDefaultSteps(): FunnelDraftStep[] {
  return DEFAULT_STEPS.map((step) => ({ ...step }));
}

function createFunnelRequest(
  funnelName: string,
  steps: FunnelDraftStep[]
): DashboardCreateFunnelRequest {
  return {
    funnel_name: funnelName,
    steps: steps.map((step) => ({
      step_name: step.step_name,
      event_name: DashboardFunnelEventNameSchema.parse(step.event_name)
    }))
  };
}

function eventPlaceholder(isLoading: boolean, isEmpty: boolean): string {
  if (isLoading) {
    return "이벤트 불러오는 중";
  }
  if (isEmpty) {
    return "선택 가능한 이벤트 없음";
  }
  return "이벤트 선택";
}

function stepLabel(step: DashboardFunnelList["funnels"][number]["steps"][number]): string {
  return `${step.step_name} (${step.event_name})`;
}

function mutationErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "API 요청 실패";
}
