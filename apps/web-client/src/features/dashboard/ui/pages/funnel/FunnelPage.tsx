import {
  type DashboardCreateFunnelRequest,
  type DashboardFunnel,
  DashboardFunnelEventNameSchema,
  type DashboardFunnelList,
  type DashboardFunnelMetricStep,
  type DashboardFunnelPreviewRequest
} from "@loopad/shared";
import { Area, AreaChart, CartesianGrid, LabelList, XAxis, YAxis } from "@loopad/ui/charts";
import { Alert, AlertDescription, AlertTitle } from "@loopad/ui/shadcn/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@loopad/ui/shadcn/alert-dialog";
import { Badge } from "@loopad/ui/shadcn/badge";
import { Button } from "@loopad/ui/shadcn/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@loopad/ui/shadcn/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@loopad/ui/shadcn/chart";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@loopad/ui/shadcn/dialog";
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
import { Link, useBlocker } from "@tanstack/react-router";
import { ChevronDown, GripHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { useId, useMemo, useRef, useState } from "react";
import {
  createDashboardFunnel,
  deleteDashboardFunnel,
  fetchDashboardEventCatalog,
  fetchDashboardFunnel,
  fetchDashboardFunnelMetrics,
  previewDashboardFunnelMetrics,
  updateDashboardFunnel
} from "../../../api/dashboard-api.js";
import {
  dashboardEventCatalogQueryKey,
  dashboardFunnelDetailQueryKey,
  dashboardFunnelMetricsQueryKey,
  dashboardFunnelPreviewQueryKey,
  dashboardTabQueryKey
} from "../../../model/dashboard-query-keys.js";
import { formatStatusLabel } from "../../../model/dashboard-labels.js";
import type { DashboardQuery } from "../../../model/dashboard-types.js";
import { EmptyState } from "../../shared/EmptyState.js";
import {
  DETAIL_PANEL_COLLAPSED_HEIGHT,
  DETAIL_PANEL_HEADER_HEIGHT,
  getDetailPanelMaxHeight,
  useFunnelDetailPanelResize
} from "./useFunnelDetailPanelResize.js";

type FunnelDraftStep = {
  step_name: string;
  event_name: string;
};

type DraftDialogMode = "create" | "edit";

type FunnelDraftSnapshot = {
  funnelName: string;
  steps: FunnelDraftStep[];
};

const DEFAULT_STEPS: FunnelDraftStep[] = [
  { step_name: "", event_name: "" },
  { step_name: "", event_name: "" }
];

export function FunnelPage({ data, query }: { data: DashboardFunnelList; query: DashboardQuery }) {
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [draftDialogMode, setDraftDialogMode] = useState<DraftDialogMode>("create");
  const [editingFunnelId, setEditingFunnelId] = useState("");
  const [isDraftLoading, setIsDraftLoading] = useState(false);
  const [draftLoadError, setDraftLoadError] = useState<string | null>(null);
  const [funnelName, setFunnelName] = useState("");
  const [steps, setSteps] = useState(() => createDefaultSteps());
  const draftBaselineRef = useRef<FunnelDraftSnapshot>(
    createFunnelDraftSnapshot("", createDefaultSteps())
  );
  const [isDiscardDraftDialogOpen, setIsDiscardDraftDialogOpen] = useState(false);
  const [selectedFunnelId, setSelectedFunnelId] = useState("");
  const {
    detailPanelHeight,
    handleDetailPanelResizeKeyDown,
    isDetailPanelCollapsed,
    setIsDetailPanelCollapsed,
    startDetailPanelResize
  } = useFunnelDetailPanelResize();
  const eventCatalog = useQuery({
    queryFn: ({ signal }) => fetchDashboardEventCatalog(query, signal),
    queryKey: dashboardEventCatalogQueryKey(query.projectId)
  });
  const eventOptions = eventCatalog.data?.events ?? [];
  const selectedFunnel = data.funnels.find((funnel) => funnel.funnel_id === selectedFunnelId);
  const previewRequest = useMemo(() => createFunnelPreviewRequest(steps), [steps]);
  const previewEventNames = previewRequest?.steps.map((step) => step.event_name) ?? [];
  const funnelPreview = useQuery({
    enabled: Boolean(previewRequest),
    queryFn: ({ signal }) => previewDashboardFunnelMetrics(query, previewRequest!, signal),
    queryKey: dashboardFunnelPreviewQueryKey(query.projectId, previewEventNames)
  });
  const funnelMetrics = useQuery({
    enabled: Boolean(selectedFunnelId),
    queryFn: ({ signal }) => fetchDashboardFunnelMetrics(query, selectedFunnelId, signal),
    queryKey: dashboardFunnelMetricsQueryKey(query.projectId, selectedFunnelId)
  });
  const createMutation = useMutation({
    mutationFn: () => createDashboardFunnel(query, createFunnelRequest(funnelName, steps)),
    onSuccess: async () => {
      resetDraft();
      setDraftBaseline("", createDefaultSteps());
      setIsCreateDialogOpen(false);
      await queryClient.invalidateQueries({ queryKey: dashboardTabQueryKey("funnels") });
    }
  });
  const updateMutation = useMutation({
    mutationFn: () => {
      if (!editingFunnelId) {
        throw new Error("수정할 사용자 여정이 없습니다.");
      }
      return updateDashboardFunnel(query, editingFunnelId, createFunnelRequest(funnelName, steps));
    },
    onSuccess: async (result) => {
      resetDraft();
      setDraftBaseline("", createDefaultSteps());
      setEditingFunnelId("");
      setDraftDialogMode("create");
      setIsCreateDialogOpen(false);
      setSelectedFunnelId(result.funnel_id);
      await queryClient.invalidateQueries({ queryKey: dashboardTabQueryKey("funnels") });
      await queryClient.invalidateQueries({
        queryKey: dashboardFunnelDetailQueryKey(query.projectId, result.funnel_id)
      });
      await queryClient.invalidateQueries({
        queryKey: dashboardFunnelMetricsQueryKey(query.projectId, result.funnel_id)
      });
    }
  });
  const deleteMutation = useMutation({
    mutationFn: (funnelId: string) => deleteDashboardFunnel(query, funnelId),
    onSuccess: async (result) => {
      setSelectedFunnelId((current) => (current === result.funnel_id ? "" : current));
      await queryClient.invalidateQueries({ queryKey: dashboardTabQueryKey("funnels") });
    }
  });
  const isEditMode = draftDialogMode === "edit";
  const isDraftSaving = createMutation.isPending || updateMutation.isPending;
  const hasDirtyDraft =
    isCreateDialogOpen &&
    !isDraftLoading &&
    !isDraftSaving &&
    !areFunnelDraftSnapshotsEqual(
      createFunnelDraftSnapshot(funnelName, steps),
      draftBaselineRef.current
    );
  const navigationBlocker = useBlocker({
    disabled: !hasDirtyDraft,
    enableBeforeUnload: hasDirtyDraft,
    shouldBlockFn: () => true,
    withResolver: true
  });
  const draftMutationError = createMutation.error ?? updateMutation.error;
  const isEventCatalogEmpty = eventCatalog.isSuccess && eventOptions.length === 0;
  const canSave =
    !isDraftLoading &&
    (!isEditMode || Boolean(editingFunnelId)) &&
    Boolean(funnelName.trim()) &&
    steps.length >= 2 &&
    steps.every((step) => step.step_name.trim() && step.event_name.trim());
  const previewSteps =
    funnelPreview.data?.steps ??
    previewRequest?.steps.map((step, index) => ({
      step_order: index + 1,
      step_name: step.step_name,
      event_name: step.event_name,
      event_count: 0
    })) ??
    [];

  return (
    <div className="grid min-h-full grid-rows-[auto_1fr] gap-6">
      <Card className="w-full min-w-0 bg-white py-5 shadow-none">
        <CardHeader className="flex flex-col gap-3 px-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="grid gap-1.5">
            <CardTitle className="text-[22px] font-semibold tracking-tight text-[#1d1d1f]">
              사용자 여정 목록
            </CardTitle>
            <CardDescription>저장된 사용자 여정을 선택해 단계별 지표를 확인합니다.</CardDescription>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button asChild variant="outline">
              <Link
                params={{ projectId: query.projectId, tabPath: "campaigns" }}
                search={(current) => ({
                  ...current,
                  campaignView: "manage",
                  createCampaign: true
                })}
                to="/dashboard/$projectId/$tabPath"
              >
                <Plus data-icon="inline-start" />새 캠페인
              </Link>
            </Button>
            <Button onClick={openCreateDialog} type="button">
              <Plus data-icon="inline-start" />
              사용자 여정 생성
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-5">
          {deleteMutation.isError ? (
            <Alert className="mb-4" variant="destructive">
              <AlertTitle>사용자 여정을 삭제하지 못했습니다</AlertTitle>
              <AlertDescription>{mutationErrorMessage(deleteMutation.error)}</AlertDescription>
            </Alert>
          ) : null}
          {data.funnels.length > 0 ? (
            <div className="overflow-hidden rounded-lg border border-black/10">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>이름</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead className="text-right">단계</TableHead>
                    <TableHead>수정일</TableHead>
                    <TableHead className="w-[132px] text-right">작업</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.funnels.map((funnel) => (
                    <TableRow
                      aria-selected={selectedFunnelId === funnel.funnel_id}
                      className="cursor-pointer"
                      data-state={selectedFunnelId === funnel.funnel_id ? "selected" : undefined}
                      key={funnel.funnel_id}
                      onClick={() => openDetails(funnel.funnel_id)}
                      onKeyDown={(event) => {
                        if (event.currentTarget !== event.target) {
                          return;
                        }
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          openDetails(funnel.funnel_id);
                        }
                      }}
                      tabIndex={0}
                    >
                      <TableCell>
                        <div className="max-w-[360px] truncate text-left font-medium text-foreground">
                          {funnel.funnel_name}
                        </div>
                        <div className="mt-1 max-w-[360px] truncate text-xs text-muted-foreground">
                          {funnel.funnel_id}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{formatStatusLabel(funnel.status)}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {funnelStepCount(funnel).toLocaleString()}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {formatDateTime(funnel.updated_at)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            disabled={isDraftLoading || updateMutation.isPending}
                            onClick={(event) => {
                              event.stopPropagation();
                              void openEditDialog(funnel.funnel_id);
                            }}
                            size="sm"
                            type="button"
                            variant="outline"
                          >
                            <Pencil data-icon="inline-start" />
                            수정
                          </Button>
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
                            <span className="sr-only">사용자 여정 삭제</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <EmptyState message="등록된 사용자 여정이 없습니다." />
          )}
        </CardContent>
      </Card>

      <section
        className="sticky bottom-0 z-10 grid self-end overflow-hidden rounded-t-2xl border border-black/10 bg-white shadow-[0_-18px_40px_rgba(15,23,42,0.14)]"
        data-testid="funnel-detail-panel"
        style={{
          gridTemplateRows: `${DETAIL_PANEL_HEADER_HEIGHT}px minmax(0, 1fr)`,
          height: isDetailPanelCollapsed ? DETAIL_PANEL_COLLAPSED_HEIGHT : detailPanelHeight
        }}
      >
        <div className="relative flex min-h-0 items-center justify-between gap-4 border-b px-6 lg:px-8">
          <div
            aria-label="상세 패널 높이 조절"
            aria-orientation="horizontal"
            aria-valuemax={getDetailPanelMaxHeight()}
            aria-valuemin={DETAIL_PANEL_COLLAPSED_HEIGHT}
            aria-valuenow={
              isDetailPanelCollapsed ? DETAIL_PANEL_COLLAPSED_HEIGHT : detailPanelHeight
            }
            className="absolute left-1/2 top-1 flex h-6 w-16 -translate-x-1/2 cursor-row-resize items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            onKeyDown={handleDetailPanelResizeKeyDown}
            onPointerDown={startDetailPanelResize}
            role="separator"
            tabIndex={0}
          >
            <GripHorizontal size={18} />
          </div>
          <h2 className="min-w-0 truncate pt-1 text-lg font-semibold tracking-tight text-[#1d1d1f]">
            {selectedFunnel?.funnel_name ?? "사용자 여정 선택"}
          </h2>
          <Button
            aria-label={isDetailPanelCollapsed ? "상세 패널 펼치기" : "상세 패널 접기"}
            onClick={() => setIsDetailPanelCollapsed((current) => !current)}
            size="icon"
            type="button"
            variant="ghost"
          >
            <ChevronDown
              className={
                isDetailPanelCollapsed ? "rotate-180 transition-transform" : "transition-transform"
              }
              data-icon="inline-start"
            />
          </Button>
        </div>
        {isDetailPanelCollapsed ? null : (
          <div className="grid min-h-0 gap-6 overflow-hidden px-6 py-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(380px,0.85fr)] lg:px-8">
            {!selectedFunnel ? (
              <div className="lg:col-span-2">
                <EmptyState message="사용자 여정을 선택하면 단계별 지표가 표시됩니다." />
              </div>
            ) : (
              <>
                {funnelMetrics.isError ? (
                  <Alert className="lg:col-span-2" variant="destructive">
                    <AlertTitle>사용자 여정 수치를 불러오지 못했습니다</AlertTitle>
                    <AlertDescription>{mutationErrorMessage(funnelMetrics.error)}</AlertDescription>
                  </Alert>
                ) : null}
                {funnelMetrics.data ? (
                  <>
                    <FunnelMetricChart steps={funnelMetrics.data.steps} />
                    <FunnelMetricTable steps={funnelMetrics.data.steps} />
                  </>
                ) : (
                  <div className="lg:col-span-2">
                    <EmptyState message="사용자 여정 지표를 불러오는 중입니다." />
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </section>

      <Dialog onOpenChange={handleCreateDialogOpenChange} open={isCreateDialogOpen}>
        <DialogContent className="w-[min(96vw,1180px)] max-w-none overflow-visible p-0">
          <DialogHeader className="border-b px-8 py-6">
            <DialogTitle className="text-2xl font-semibold">
              {isEditMode ? "사용자 여정 수정" : "새 사용자 여정 생성"}
            </DialogTitle>
            <DialogDescription>
              {isEditMode
                ? "저장된 사용자 여정 이름과 단계 순서를 변경합니다."
                : "수집된 이벤트를 순서대로 선택하면 단계별 전환 수가 미리 계산됩니다."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 px-8 py-6 lg:grid-cols-[minmax(320px,0.85fr)_minmax(480px,1.15fr)]">
            {isDraftLoading ? (
              <Alert className="lg:col-span-2">
                <AlertTitle>사용자 여정 정보를 불러오는 중입니다</AlertTitle>
                <AlertDescription>저장된 단계 구성을 가져오고 있습니다.</AlertDescription>
              </Alert>
            ) : null}
            {draftLoadError ? (
              <Alert className="lg:col-span-2" variant="destructive">
                <AlertTitle>사용자 여정 정보를 불러오지 못했습니다</AlertTitle>
                <AlertDescription>{draftLoadError}</AlertDescription>
              </Alert>
            ) : null}
            {eventCatalog.isError ? (
              <Alert className="lg:col-span-2" variant="destructive">
                <AlertTitle>이벤트 목록을 불러오지 못했습니다</AlertTitle>
                <AlertDescription>수집 이벤트 카탈로그 API 응답을 확인해주세요.</AlertDescription>
              </Alert>
            ) : null}
            {isEventCatalogEmpty ? (
              <Alert className="lg:col-span-2">
                <AlertTitle>선택 가능한 이벤트가 없습니다</AlertTitle>
                <AlertDescription>
                  ClickHouse에 수집된 사용자 여정 이벤트가 있어야 단계를 선택할 수 있습니다.
                </AlertDescription>
              </Alert>
            ) : null}
            {draftMutationError ? (
              <Alert className="lg:col-span-2" variant="destructive">
                <AlertTitle>사용자 여정을 저장하지 못했습니다</AlertTitle>
                <AlertDescription>{mutationErrorMessage(draftMutationError)}</AlertDescription>
              </Alert>
            ) : null}
            <div className="grid content-start gap-5">
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="funnel-name">사용자 여정 이름</FieldLabel>
                  <Input
                    disabled={isDraftLoading || isDraftSaving}
                    autoComplete="off"
                    id="funnel-name"
                    name="funnelName"
                    onChange={(event) => setFunnelName(event.target.value)}
                    value={funnelName}
                  />
                </Field>
              </FieldGroup>
              <div className="grid gap-3">
                {steps.map((step, index) => (
                  <div className="grid gap-2 md:grid-cols-[1fr_auto]" key={index}>
                    <NativeSelect
                      aria-label={`${index + 1}번째 사용자 여정 이벤트`}
                      className="w-full"
                      disabled={
                        eventCatalog.isLoading ||
                        !eventOptions.length ||
                        isDraftLoading ||
                        isDraftSaving
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
                      disabled={steps.length <= 2 || isDraftLoading || isDraftSaving}
                      onClick={() => removeStep(index)}
                      size="icon"
                      type="button"
                      variant="outline"
                    >
                      <Trash2 data-icon="inline-start" />
                      <span className="sr-only">단계 삭제</span>
                    </Button>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  disabled={!eventOptions.length || isDraftLoading || isDraftSaving}
                  onClick={addStep}
                  type="button"
                  variant="outline"
                >
                  <Plus data-icon="inline-start" />
                  단계 추가
                </Button>
              </div>
            </div>
            <section className="grid content-start gap-3 border-t pt-5 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
              <div className="grid gap-1">
                <h3 className="text-base font-semibold text-foreground">단계별 전환 미리보기</h3>
                <p className="text-sm text-muted-foreground">
                  사용자별 이벤트 발생 순서를 기준으로 각 단계까지 도달한 수를 표시합니다.
                </p>
              </div>
              {funnelPreview.isError ? (
                <Alert variant="destructive">
                  <AlertTitle>미리보기를 불러오지 못했습니다</AlertTitle>
                  <AlertDescription>{mutationErrorMessage(funnelPreview.error)}</AlertDescription>
                </Alert>
              ) : null}
              {previewSteps.length > 0 ? (
                <FunnelMetricChart steps={previewSteps} />
              ) : (
                <EmptyState message="이벤트를 선택하면 미리보기가 표시됩니다." />
              )}
            </section>
          </div>
          <DialogFooter className="px-8 py-5">
            <Button
              disabled={isDraftSaving}
              onClick={requestCloseDraftDialog}
              type="button"
              variant="ghost"
            >
              취소
            </Button>
            <Button disabled={!canSave || isDraftSaving} onClick={saveFunnel} type="button">
              {isDraftSaving ? "저장 중" : isEditMode ? "변경 저장" : "저장"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog
        onOpenChange={(open) => {
          if (!open) {
            cancelDiscardDraft();
          }
        }}
        open={isDiscardDraftDialogOpen || navigationBlocker.status === "blocked"}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>작성 중인 변경사항을 버릴까요?</AlertDialogTitle>
            <AlertDialogDescription>
              저장하지 않은 사용자 여정 변경사항이 사라집니다. 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelDiscardDraft}>계속 편집</AlertDialogCancel>
            <AlertDialogAction onClick={discardDraftAndContinue} variant="destructive">
              변경사항 버리기
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );

  function addStep() {
    setSteps((current) => [...current, { step_name: "", event_name: "" }]);
  }

  function handleCreateDialogOpenChange(isOpen: boolean) {
    if (!isOpen) {
      requestCloseDraftDialog();
      return;
    }

    setIsCreateDialogOpen(true);
  }

  function closeDraftDialogNow() {
    setIsCreateDialogOpen(false);
    createMutation.reset();
    updateMutation.reset();
    setDraftDialogMode("create");
    setDraftLoadError(null);
    setEditingFunnelId("");
    setIsDraftLoading(false);
    resetDraft();
    setDraftBaseline("", createDefaultSteps());
  }

  function requestCloseDraftDialog() {
    if (hasDirtyDraft) {
      setIsDiscardDraftDialogOpen(true);
      return;
    }

    closeDraftDialogNow();
  }

  function cancelDiscardDraft() {
    setIsDiscardDraftDialogOpen(false);
    navigationBlocker.reset?.();
  }

  function discardDraftAndContinue() {
    setIsDiscardDraftDialogOpen(false);
    if (navigationBlocker.status === "blocked") {
      navigationBlocker.proceed?.();
      return;
    }

    closeDraftDialogNow();
  }

  function openCreateDialog() {
    createMutation.reset();
    updateMutation.reset();
    setDraftDialogMode("create");
    setDraftLoadError(null);
    setEditingFunnelId("");
    setIsDraftLoading(false);
    resetDraft();
    setDraftBaseline("", createDefaultSteps());
    setIsCreateDialogOpen(true);
  }

  function openDetails(funnelId: string) {
    setSelectedFunnelId(funnelId);
  }

  async function openEditDialog(funnelId: string) {
    createMutation.reset();
    updateMutation.reset();
    setDraftDialogMode("edit");
    setDraftLoadError(null);
    setEditingFunnelId(funnelId);
    setIsDraftLoading(true);
    resetDraft();
    setIsCreateDialogOpen(true);

    try {
      const funnel = await queryClient.fetchQuery({
        queryFn: ({ signal }) => fetchDashboardFunnel(query, funnelId, signal),
        queryKey: dashboardFunnelDetailQueryKey(query.projectId, funnelId)
      });
      const draftSteps = createDraftStepsFromFunnel(funnel);
      setFunnelName(funnel.funnel_name);
      setSteps(draftSteps);
      setDraftBaseline(funnel.funnel_name, draftSteps);
    } catch (error) {
      setDraftLoadError(mutationErrorMessage(error));
    } finally {
      setIsDraftLoading(false);
    }
  }

  function removeStep(index: number) {
    setSteps((current) => current.filter((_, currentIndex) => currentIndex !== index));
  }

  function resetDraft() {
    setFunnelName("");
    setSteps(createDefaultSteps());
  }

  function setDraftBaseline(nextFunnelName: string, nextSteps: FunnelDraftStep[]) {
    draftBaselineRef.current = createFunnelDraftSnapshot(nextFunnelName, nextSteps);
  }

  function saveFunnel() {
    if (isEditMode) {
      updateMutation.mutate();
      return;
    }

    createMutation.mutate();
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

function FunnelMetricChart({ steps }: { steps: DashboardFunnelMetricStep[] }) {
  const gradientId = `${useId().replace(/:/g, "")}-funnel-event-count`;

  return (
    <ChartContainer
      className="h-[260px] w-full"
      config={{
        event_count: {
          color: "var(--chart-1)",
          label: "도달 수"
        }
      }}
    >
      <AreaChart data={steps} margin={{ bottom: 16, left: 10, right: 28, top: 40 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="5%" stopColor="var(--color-event_count)" stopOpacity={0.32} />
            <stop offset="95%" stopColor="var(--color-event_count)" stopOpacity={0.04} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="step_name" tickLine={false} tickMargin={14} axisLine={false} />
        <YAxis allowDecimals={false} tickLine={false} axisLine={false} tickMargin={12} width={56} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Area
          dataKey="event_count"
          fill={`url(#${gradientId})`}
          stroke="var(--color-event_count)"
          strokeWidth={2}
          type="monotone"
        >
          <LabelList
            className="fill-foreground text-xs font-medium"
            dataKey="event_count"
            formatter={formatMetricLabel}
            offset={12}
            position="top"
          />
        </Area>
      </AreaChart>
    </ChartContainer>
  );
}

function FunnelMetricTable({ steps }: { steps: DashboardFunnelMetricStep[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>단계</TableHead>
          <TableHead>이벤트</TableHead>
          <TableHead className="text-right">도달 수</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {steps.map((step) => (
          <TableRow key={`${step.step_order}-${step.event_name}`}>
            <TableCell>{step.step_name}</TableCell>
            <TableCell>{step.event_name}</TableCell>
            <TableCell className="text-right">{step.event_count.toLocaleString()}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function createDefaultSteps(): FunnelDraftStep[] {
  return DEFAULT_STEPS.map((step) => ({ ...step }));
}

function createFunnelDraftSnapshot(
  funnelName: string,
  steps: FunnelDraftStep[]
): FunnelDraftSnapshot {
  return {
    funnelName: funnelName.trim(),
    steps: steps.map((step) => ({
      event_name: step.event_name.trim(),
      step_name: step.step_name.trim()
    }))
  };
}

function areFunnelDraftSnapshotsEqual(
  left: FunnelDraftSnapshot,
  right: FunnelDraftSnapshot
): boolean {
  if (left.funnelName !== right.funnelName || left.steps.length !== right.steps.length) {
    return false;
  }

  return left.steps.every(
    (step, index) =>
      step.event_name === right.steps[index]?.event_name &&
      step.step_name === right.steps[index]?.step_name
  );
}

function createDraftStepsFromFunnel(funnel: DashboardFunnel): FunnelDraftStep[] {
  const draftSteps: FunnelDraftStep[] = funnel.steps.map((step) => ({
    event_name: step.event_name,
    step_name: step.step_name
  }));

  while (draftSteps.length < 2) {
    draftSteps.push({ event_name: "", step_name: "" });
  }

  return draftSteps;
}

function funnelStepCount(funnel: DashboardFunnelList["funnels"][number]): number {
  if (typeof funnel.step_count === "number") {
    return funnel.step_count;
  }

  const legacyFunnel = funnel as DashboardFunnelList["funnels"][number] & {
    steps?: unknown[];
  };
  return legacyFunnel.steps?.length ?? 0;
}

function createFunnelPreviewRequest(
  steps: FunnelDraftStep[]
): DashboardFunnelPreviewRequest | null {
  const selectedSteps = steps.filter((step) => step.step_name.trim() && step.event_name.trim());
  if (selectedSteps.length === 0) {
    return null;
  }

  return {
    steps: selectedSteps.map((step) => ({
      step_name: step.step_name,
      event_name: DashboardFunnelEventNameSchema.parse(step.event_name)
    }))
  };
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

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(date);
}

function mutationErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "API 요청 실패";
}

function formatMetricLabel(value: unknown): string {
  return typeof value === "number" ? value.toLocaleString() : String(value ?? "");
}
