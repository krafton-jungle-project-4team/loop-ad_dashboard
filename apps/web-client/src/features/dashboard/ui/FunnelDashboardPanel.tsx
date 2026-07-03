import {
  type DashboardCreateFunnelRequest,
  type DashboardFunnelList
} from "@loopad/shared";
import { Alert, AlertDescription, AlertTitle } from "@loopad/ui/shadcn/alert";
import { Badge } from "@loopad/ui/shadcn/badge";
import { Button } from "@loopad/ui/shadcn/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@loopad/ui/shadcn/card";
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
import { createDashboardFunnel, fetchDashboardEventCatalog } from "../api/dashboard-api.js";
import {
  dashboardEventCatalogQueryKey,
  dashboardTabQueryKey
} from "../model/dashboard-query-keys.js";
import type { DashboardQuery } from "../model/dashboard-types.js";
import { EmptyState } from "./EmptyState.js";

const DEFAULT_STEPS: DashboardCreateFunnelRequest["steps"] = [
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
  const eventCatalog = useQuery({
    queryFn: ({ signal }) => fetchDashboardEventCatalog(query, signal),
    queryKey: dashboardEventCatalogQueryKey(query.projectId)
  });
  const eventOptions = eventCatalog.data?.events ?? [];
  const createMutation = useMutation({
    mutationFn: () => createDashboardFunnel(query, { funnel_name: funnelName, steps }),
    onSuccess: async () => {
      setFunnelName("");
      setSteps(createDefaultSteps());
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.funnels.map((funnel) => (
                  <TableRow key={funnel.funnel_id}>
                    <TableCell>{funnel.funnel_name}</TableCell>
                    <TableCell>{funnel.steps.map(stepLabel).join(" -> ")}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{funnel.status}</Badge>
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
    </div>
  );

  function addStep() {
    setSteps((current) => [...current, { step_name: "", event_name: "" }]);
  }

  function removeStep(index: number) {
    setSteps((current) => current.filter((_, currentIndex) => currentIndex !== index));
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

function createDefaultSteps(): DashboardCreateFunnelRequest["steps"] {
  return DEFAULT_STEPS.map((step) => ({ ...step }));
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
