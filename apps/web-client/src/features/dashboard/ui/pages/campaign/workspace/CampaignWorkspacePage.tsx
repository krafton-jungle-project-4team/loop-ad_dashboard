import {
  campaignDateKey,
  type DashboardCampaignPromotion,
  type DashboardCampaignSummary,
  type DashboardMain,
  type DashboardUpdatePromotionRequest
} from "@loopad/shared";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger
} from "@loopad/ui/shadcn/dropdown-menu";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarClock,
  CircleCheck,
  CirclePlay,
  Ellipsis,
  Plus,
  type LucideIcon
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  createDashboardCampaign,
  createDashboardPromotion,
  deleteDashboardCampaign,
  deleteDashboardPromotion,
  fetchDashboardCampaignDetail,
  updateDashboardCampaign,
  updateDashboardPromotion
} from "../../../../api/dashboard-api.js";
import { formatInteger, formatPercent } from "../../../../model/dashboard-format.js";
import { formatChannelLabel, formatMetricLabel } from "../../../../model/dashboard-labels.js";
import { useDashboardQueryState } from "../../../../model/dashboard-query.js";
import { dashboardCampaignDetailQueryKey } from "../../../../model/dashboard-query-keys.js";
import type { DashboardQuery } from "../../../../model/dashboard-types.js";
import { DashboardHeaderPortal } from "../../../../layout/DashboardHeaderSlot.js";
import { DashboardDateRangeSelect } from "../../../shared/DashboardDateRangeSelect.js";
import { EmptyState } from "../../../shared/EmptyState.js";
import { CampaignPerformanceSections } from "../CampaignPerformanceSections.js";
import { CampaignFormDialog } from "../components/CampaignFormDialog.js";
import { PromotionWorkspace } from "../promotion/PromotionComponent.js";
import {
  PromotionAddDialog,
  PromotionEditDialog
} from "../promotion/components/PromotionDialogs.js";
import {
  mutationErrorMessage,
  promotionCreateFormToRequest,
  uniquePromotionsById,
  type PromotionCreateFormState
} from "../promotion/promotionUtils.js";
import { EntityCardGrid } from "./EntityCardGrid.js";
import { HierarchyBreadcrumbs, type CampaignHierarchyLevel } from "./HierarchyBreadcrumbs.js";
import { groupCampaignsBySchedule, type CampaignScheduleStatus } from "./campaignSchedule.js";
import type { CampaignWorkspaceEntityCard } from "./campaign-workspace-types.js";
import { groupPromotionsByBoardStatus, type PromotionBoardStatus } from "./promotionBoardStatus.js";

type CampaignFormDialogState = { mode: "create" } | { campaignId: string; mode: "edit" } | null;

type CampaignCard = CampaignWorkspaceEntityCard & {
  campaign: DashboardCampaignSummary;
  kind: "campaign";
};

type PromotionCard = CampaignWorkspaceEntityCard & {
  kind: "promotion";
  promotion: DashboardCampaignPromotion;
};

const CAMPAIGN_SCHEDULE_SECTIONS: ReadonlyArray<{
  description: string;
  emptyMessage: string;
  icon: LucideIcon;
  label: string;
  status: CampaignScheduleStatus;
}> = [
  {
    description: "시작일이 가까운 순으로 보여요.",
    emptyMessage: "시작을 기다리는 캠페인이 없어요.",
    icon: CalendarClock,
    label: "예정",
    status: "scheduled"
  },
  {
    description: "종료일이 가까운 순으로 보여요.",
    emptyMessage: "현재 진행 중인 캠페인이 없어요.",
    icon: CirclePlay,
    label: "진행 중",
    status: "in_progress"
  },
  {
    description: "최근에 종료된 순으로 보여요.",
    emptyMessage: "완료된 캠페인이 없어요.",
    icon: CircleCheck,
    label: "완료됨",
    status: "completed"
  }
];

const PROMOTION_BOARD_SECTIONS: ReadonlyArray<{
  description: string;
  emptyMessage: string;
  label: string;
  status: PromotionBoardStatus;
}> = [
  {
    description: "첫 실험 실행을 기다리고 있어요.",
    emptyMessage: "준비 중인 프로모션이 없어요.",
    label: "준비 중",
    status: "preparing"
  },
  {
    description: "현재 실험을 실행하거나 평가하고 있어요.",
    emptyMessage: "진행 중인 프로모션이 없어요.",
    label: "진행 중",
    status: "in_progress"
  },
  {
    description: "평가 결과에 따라 다음 실험이 필요해요.",
    emptyMessage: "다음 실험이 필요한 프로모션이 없어요.",
    label: "다음 실험 필요",
    status: "next_experiment"
  },
  {
    description: "목표를 달성했거나 최대 실험 횟수를 마쳤어요.",
    emptyMessage: "완료된 프로모션이 없어요.",
    label: "완료됨",
    status: "completed"
  }
];

export function CampaignWorkspacePage({
  data,
  query
}: {
  data: DashboardMain;
  query: DashboardQuery;
}) {
  const queryClient = useQueryClient();
  const [, setDashboardQueryState] = useDashboardQueryState();
  const [campaignFormDialog, setCampaignFormDialog] = useState<CampaignFormDialogState>(null);
  const [deletingCampaignId, setDeletingCampaignId] = useState<string | null>(null);
  const [isPromotionAddDialogOpen, setIsPromotionAddDialogOpen] = useState(false);
  const [editingPromotionId, setEditingPromotionId] = useState<string | null>(null);
  const [deletingPromotionId, setDeletingPromotionId] = useState<string | null>(null);
  const selectedCampaign = data.campaigns.find(
    (campaign) => campaign.campaign_id === query.selectedCampaignId
  );
  const selectedCampaignId = selectedCampaign?.campaign_id ?? "";
  const campaignDetail = useQuery({
    enabled: Boolean(selectedCampaignId),
    queryFn: ({ signal }) => fetchDashboardCampaignDetail(query, selectedCampaignId, signal),
    queryKey: dashboardCampaignDetailQueryKey(query.projectId, selectedCampaignId)
  });
  const promotions = uniquePromotionsById(campaignDetail.data?.promotions ?? []);
  const selectedPromotion = promotions.find(
    (promotion) => promotion.promotion_id === query.selectedPromotionId
  );
  const selectedSegment = campaignDetail.data?.segments.find(
    (segment) =>
      segment.promotion_id === selectedPromotion?.promotion_id &&
      segment.segment_id === query.selectedSegmentId
  );
  const editingCampaign =
    campaignFormDialog?.mode === "edit"
      ? data.campaigns.find((campaign) => campaign.campaign_id === campaignFormDialog.campaignId)
      : undefined;
  const deletingCampaign = data.campaigns.find(
    (campaign) => campaign.campaign_id === deletingCampaignId
  );
  const editingPromotion = promotions.find(
    (promotion) => promotion.promotion_id === editingPromotionId
  );
  const deletingPromotion = promotions.find(
    (promotion) => promotion.promotion_id === deletingPromotionId
  );

  const createCampaignMutation = useMutation({
    mutationFn: (requestBody: Parameters<typeof createDashboardCampaign>[1]) =>
      createDashboardCampaign(query, requestBody),
    onSuccess: async (campaign) => {
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      await setDashboardQueryState({
        campaignView: "manage",
        createCampaign: false,
        promotionView: "manage",
        segmentView: "manage",
        selectedAdExperimentId: "",
        selectedCampaignId: campaign.campaign_id,
        selectedPromotionId: "",
        selectedSegmentId: ""
      });
      setCampaignFormDialog(null);
    }
  });
  const updateCampaignMutation = useMutation({
    mutationFn: ({
      campaignId,
      requestBody
    }: {
      campaignId: string;
      requestBody: Parameters<typeof updateDashboardCampaign>[2];
    }) => updateDashboardCampaign(query, campaignId, requestBody),
    onSuccess: async (campaign) => {
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      await queryClient.invalidateQueries({
        queryKey: dashboardCampaignDetailQueryKey(query.projectId, campaign.campaign_id)
      });
      setCampaignFormDialog(null);
    }
  });
  const deleteCampaignMutation = useMutation({
    mutationFn: (campaignId: string) => deleteDashboardCampaign(query, campaignId),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      if (query.selectedCampaignId === result.campaign_id) {
        await setDashboardQueryState({
          campaignView: "manage",
          promotionView: "manage",
          segmentView: "manage",
          selectedAdExperimentId: "",
          selectedCampaignId: "",
          selectedPromotionId: "",
          selectedSegmentId: ""
        });
      }
      setCampaignFormDialog(null);
      setDeletingCampaignId(null);
    }
  });
  const createPromotionMutation = useMutation({
    mutationFn: (form: PromotionCreateFormState) =>
      createDashboardPromotion(query, selectedCampaignId, promotionCreateFormToRequest(form)),
    onSuccess: async (promotion) => {
      await invalidateCampaignWorkspace(queryClient, query, selectedCampaignId);
      await setDashboardQueryState({
        campaignView: "manage",
        createPromotion: false,
        promotionView: "manage",
        segmentView: "manage",
        selectedAdExperimentId: "",
        selectedCampaignId,
        selectedPromotionId: promotion.promotion_id,
        selectedSegmentId: ""
      });
      setIsPromotionAddDialogOpen(false);
    }
  });
  const updatePromotionMutation = useMutation({
    mutationFn: ({
      promotionId,
      requestBody
    }: {
      promotionId: string;
      requestBody: DashboardUpdatePromotionRequest;
    }) => updateDashboardPromotion(query, promotionId, requestBody),
    onSuccess: async () => {
      await invalidateCampaignWorkspace(queryClient, query, selectedCampaignId);
      setEditingPromotionId(null);
    }
  });
  const deletePromotionMutation = useMutation({
    mutationFn: (promotionId: string) => deleteDashboardPromotion(query, promotionId),
    onSuccess: async (result) => {
      await invalidateCampaignWorkspace(queryClient, query, selectedCampaignId);
      if (query.selectedPromotionId === result.promotion_id) {
        await setDashboardQueryState({
          promotionView: "manage",
          segmentView: "manage",
          selectedAdExperimentId: "",
          selectedPromotionId: "",
          selectedSegmentId: ""
        });
      }
      setDeletingPromotionId(null);
    }
  });

  useEffect(() => {
    if (!query.selectedCampaignId || selectedCampaign) {
      return;
    }

    void setDashboardQueryState(
      {
        selectedAdExperimentId: "",
        selectedCampaignId: "",
        selectedPromotionId: "",
        selectedSegmentId: ""
      },
      { history: "replace" }
    );
  }, [query.selectedCampaignId, selectedCampaign, setDashboardQueryState]);

  useEffect(() => {
    if (!campaignDetail.data || !query.selectedPromotionId || selectedPromotion) {
      return;
    }

    void setDashboardQueryState(
      { selectedAdExperimentId: "", selectedPromotionId: "", selectedSegmentId: "" },
      { history: "replace" }
    );
  }, [campaignDetail.data, query.selectedPromotionId, selectedPromotion, setDashboardQueryState]);

  const campaignsBySchedule = groupCampaignsBySchedule(data.campaigns, campaignDateKey());
  const promotionsByBoardStatus = groupPromotionsByBoardStatus(
    promotions,
    campaignDetail.data?.ad_experiments ?? [],
    campaignDetail.data?.experiment_metrics ?? []
  );
  const activeHierarchyLevel = getActiveHierarchyLevel({
    campaignView: query.campaignView,
    hasCampaign: Boolean(selectedCampaign),
    hasPromotion: Boolean(selectedPromotion),
    hasSegment: Boolean(selectedSegment),
    promotionView: query.promotionView
  });
  const promotionMutationError =
    createPromotionMutation.error ?? updatePromotionMutation.error ?? deletePromotionMutation.error;
  const openCampaignView = (campaignId: string, campaignView: DashboardQuery["campaignView"]) => {
    void setDashboardQueryState({
      campaignView,
      promotionView: "manage",
      segmentView: "manage",
      selectedAdExperimentId: "",
      selectedCampaignId: campaignId,
      selectedPromotionId: "",
      selectedSegmentId: ""
    });
  };
  const openPromotionView = (promotionId: string, view: "manage" | "performance") => {
    void setDashboardQueryState({
      campaignView: "manage",
      promotionView: view,
      segmentView: "manage",
      selectedAdExperimentId: "",
      selectedCampaignId,
      selectedPromotionId: promotionId,
      selectedSegmentId: ""
    });
  };

  return (
    <div className="grid gap-6">
      <DashboardHeaderPortal>
        <HierarchyBreadcrumbs
          activeLevel={activeHierarchyLevel}
          onLevelSelect={(level) => {
            if (level === "campaign") {
              void setDashboardQueryState({
                campaignView: "manage",
                promotionView: "manage",
                segmentView: "manage",
                selectedAdExperimentId: "",
                selectedCampaignId: "",
                selectedPromotionId: "",
                selectedSegmentId: ""
              });
              return;
            }
            if (level === "promotion") {
              void setDashboardQueryState({
                campaignView: "manage",
                promotionView: "manage",
                segmentView: "manage",
                selectedAdExperimentId: "",
                selectedPromotionId: "",
                selectedSegmentId: ""
              });
              return;
            }
            if (level === "segment") {
              void setDashboardQueryState({
                campaignView: "manage",
                promotionView: "manage",
                segmentView: "manage",
                selectedAdExperimentId: "",
                selectedSegmentId: ""
              });
            }
          }}
          selectedLabels={{
            campaign: selectedCampaign?.campaign_name,
            promotion: selectedPromotion?.marketing_theme,
            segment: selectedSegment?.segment_name
          }}
        />
      </DashboardHeaderPortal>

      {promotionMutationError ? (
        <Alert variant="destructive">
          <AlertTitle>프로모션 작업을 마치지 못했어요</AlertTitle>
          <AlertDescription>{mutationErrorMessage(promotionMutationError)}</AlertDescription>
        </Alert>
      ) : null}

      {deleteCampaignMutation.isError ? (
        <Alert variant="destructive">
          <AlertTitle>캠페인을 삭제하지 못했어요</AlertTitle>
          <AlertDescription>{mutationErrorMessage(deleteCampaignMutation.error)}</AlertDescription>
        </Alert>
      ) : null}

      {!selectedCampaign ? (
        <section className="grid gap-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="grid gap-1">
              <h2 className="text-xl font-semibold tracking-tight text-foreground">
                캠페인을 선택해 주세요
              </h2>
              <p className="text-sm leading-6 text-muted-foreground">
                캠페인을 선택하면 프로모션을 관리하고 성과를 볼 수 있어요.
              </p>
            </div>
            <Button
              className="shrink-0"
              onClick={() => {
                createCampaignMutation.reset();
                setCampaignFormDialog({ mode: "create" });
              }}
              size="sm"
              type="button"
            >
              <Plus aria-hidden="true" data-icon="inline-start" />
              캠페인 만들기
            </Button>
          </div>
          <div className="grid min-w-0 gap-4">
            {CAMPAIGN_SCHEDULE_SECTIONS.map((section) => {
              const cards = campaignsBySchedule[section.status].map((campaign) =>
                toCampaignCard(campaign)
              );
              const StatusIcon = section.icon;

              return (
                <section
                  aria-labelledby={`campaign-schedule-${section.status}`}
                  className="grid min-w-0 gap-3 rounded-xl border bg-muted/25 p-3"
                  key={section.status}
                >
                  <div className="grid gap-1 border-b px-1 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-md border bg-background text-foreground">
                        <StatusIcon aria-hidden="true" className="size-4" />
                      </span>
                      <h3
                        className="text-base font-semibold tracking-tight text-foreground"
                        id={`campaign-schedule-${section.status}`}
                      >
                        {section.label}
                      </h3>
                      <Badge variant="secondary">{cards.length}</Badge>
                      <div className="ml-auto flex items-center gap-1">
                        <EntityColumnActionsMenu
                          cards={cards}
                          entityLabel="캠페인"
                          label={section.label}
                          onDelete={(card) => {
                            deleteCampaignMutation.reset();
                            setDeletingCampaignId(card.id);
                          }}
                          onEdit={(card) => {
                            updateCampaignMutation.reset();
                            deleteCampaignMutation.reset();
                            setCampaignFormDialog({ campaignId: card.id, mode: "edit" });
                          }}
                        />
                      </div>
                    </div>
                    <p className="text-xs leading-5 text-muted-foreground">{section.description}</p>
                  </div>
                  <EntityCardGrid
                    ariaLabel={`${section.label} 캠페인 목록`}
                    density="compact"
                    emptyState={<EmptyState message={section.emptyMessage} />}
                    entryActions={(card) => [
                      {
                        id: "workspace",
                        label: "프로모션 관리",
                        onSelect: () => openCampaignView(card.id, "manage")
                      },
                      {
                        id: "performance",
                        label: "성과",
                        onSelect: () => openCampaignView(card.id, "performance")
                      }
                    ]}
                    className="min-w-0"
                    items={cards}
                    layout="horizontal"
                  />
                </section>
              );
            })}
          </div>
        </section>
      ) : null}

      {selectedCampaign && !selectedPromotion && query.campaignView === "performance" ? (
        <div className="flex justify-end">
          <DashboardDateRangeSelect value={query.dateRange} />
        </div>
      ) : null}

      {selectedCampaign && !selectedPromotion && query.campaignView === "performance" ? (
        <CampaignPerformanceSections data={data} query={query} />
      ) : null}

      {selectedCampaign && query.campaignView === "manage" && campaignDetail.isError ? (
        <Alert variant="destructive">
          <AlertTitle>캠페인을 불러오지 못했어요</AlertTitle>
          <AlertDescription>
            {campaignDetail.error?.message ?? "다시 시도해 주세요."}
          </AlertDescription>
        </Alert>
      ) : null}
      {selectedCampaign && query.campaignView === "manage" && campaignDetail.isLoading ? (
        <EmptyState message="캠페인을 불러오는 중이에요." />
      ) : null}

      {selectedCampaign &&
      !selectedPromotion &&
      query.campaignView === "manage" &&
      campaignDetail.data ? (
        <section className="grid gap-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="grid gap-1">
              <h2 className="text-xl font-semibold tracking-tight text-foreground">프로모션</h2>
              <p className="text-sm leading-6 text-muted-foreground">
                프로모션을 선택하면 세그먼트 생성부터 광고 소재 승인과 실험 실행까지 이어집니다.
              </p>
            </div>
            <Button
              className="shrink-0"
              onClick={() => {
                createPromotionMutation.reset();
                setIsPromotionAddDialogOpen(true);
              }}
              size="sm"
              type="button"
            >
              <Plus aria-hidden="true" data-icon="inline-start" />
              프로모션 만들기
            </Button>
          </div>
          <div className="grid min-w-0 gap-4">
            {PROMOTION_BOARD_SECTIONS.map((section) => {
              const cards = promotionsByBoardStatus[section.status].map(toPromotionCard);

              return (
                <section
                  aria-labelledby={`promotion-board-${section.status}`}
                  className="grid min-w-0 gap-3 rounded-xl border bg-muted/25 p-3"
                  key={section.status}
                >
                  <div className="grid gap-1 border-b px-1 pb-3">
                    <div className="flex items-center gap-2">
                      <h3
                        className="text-base font-semibold tracking-tight text-foreground"
                        id={`promotion-board-${section.status}`}
                      >
                        {section.label}
                      </h3>
                      <Badge variant="secondary">{cards.length}</Badge>
                      <div className="ml-auto flex items-center gap-1">
                        <EntityColumnActionsMenu
                          cards={cards}
                          entityLabel="프로모션"
                          label={section.label}
                          onDelete={(card) => {
                            deletePromotionMutation.reset();
                            setDeletingPromotionId(card.id);
                          }}
                          onEdit={(card) => {
                            updatePromotionMutation.reset();
                            deletePromotionMutation.reset();
                            setEditingPromotionId(card.id);
                          }}
                        />
                      </div>
                    </div>
                    <p className="text-xs leading-5 text-muted-foreground">{section.description}</p>
                  </div>
                  <EntityCardGrid
                    ariaLabel={`${section.label} 프로모션 목록`}
                    className="min-w-0"
                    density="compact"
                    emptyState={<EmptyState message={section.emptyMessage} />}
                    entryActions={(card) => [
                      {
                        id: "manage",
                        label: "세그먼트 관리",
                        onSelect: () => openPromotionView(card.id, "manage")
                      },
                      {
                        id: "performance",
                        label: "성과",
                        onSelect: () => openPromotionView(card.id, "performance")
                      }
                    ]}
                    items={cards}
                    layout="horizontal"
                    showBadges={false}
                  />
                </section>
              );
            })}
          </div>
        </section>
      ) : null}

      {selectedCampaign && selectedPromotion && campaignDetail.data ? (
        <PromotionWorkspace
          data={data}
          mode={query.promotionView === "performance" ? "promotion" : "segment"}
          query={query}
        />
      ) : null}

      <CampaignFormDialog
        campaign={editingCampaign}
        createError={createCampaignMutation.error}
        createIsError={createCampaignMutation.isError}
        createIsPending={createCampaignMutation.isPending}
        mode={campaignFormDialog?.mode ?? "create"}
        onCreate={(requestBody) => createCampaignMutation.mutate(requestBody)}
        onOpenChange={(open) => {
          if (!open) {
            setCampaignFormDialog(null);
            if (query.createCampaign) {
              void setDashboardQueryState({ createCampaign: false }, { history: "replace" });
            }
          }
        }}
        onUpdate={(campaignId, requestBody) =>
          updateCampaignMutation.mutate({ campaignId, requestBody })
        }
        open={Boolean(campaignFormDialog) || query.createCampaign}
        updateError={updateCampaignMutation.error}
        updateIsError={updateCampaignMutation.isError}
        updateIsPending={updateCampaignMutation.isPending}
      />
      <AlertDialog
        onOpenChange={(open) => {
          if (!open && !deleteCampaignMutation.isPending) {
            setDeletingCampaignId(null);
          }
        }}
        open={Boolean(deletingCampaign)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>캠페인을 삭제할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingCampaign?.campaign_name} 캠페인과 연결된 항목이 모두 사라져요.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteCampaignMutation.isPending}>취소</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteCampaignMutation.isPending}
              onClick={(event) => {
                event.preventDefault();
                if (deletingCampaign) {
                  deleteCampaignMutation.mutate(deletingCampaign.campaign_id);
                }
              }}
              variant="destructive"
            >
              {deleteCampaignMutation.isPending ? "캠페인 삭제 중…" : "캠페인 삭제"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <PromotionAddDialog
        createIsPending={createPromotionMutation.isPending}
        onCreate={(form) => createPromotionMutation.mutate(form)}
        onOpenChange={(open) => {
          setIsPromotionAddDialogOpen(open);
          if (!open && query.createPromotion) {
            void setDashboardQueryState({ createPromotion: false }, { history: "replace" });
          }
        }}
        open={isPromotionAddDialogOpen || (query.createPromotion && Boolean(selectedCampaign))}
      />
      <PromotionEditDialog
        isPending={updatePromotionMutation.isPending}
        onOpenChange={(open) => {
          if (!open) {
            setEditingPromotionId(null);
          }
        }}
        onUpdate={(requestBody) => {
          if (editingPromotionId) {
            updatePromotionMutation.mutate({
              promotionId: editingPromotionId,
              requestBody
            });
          }
        }}
        open={Boolean(editingPromotionId)}
        promotion={editingPromotion}
      />
      <AlertDialog
        onOpenChange={(open) => {
          if (!open) {
            setDeletingPromotionId(null);
          }
        }}
        open={Boolean(deletingPromotionId)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>프로모션을 삭제할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingPromotion?.marketing_theme ?? "선택한 프로모션"}이 목록에서 사라져요. 연결된
              세그먼트, 광고 소재, 실행과 실험도 모두 사라지고 되돌릴 수 없어요.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              disabled={!deletingPromotionId || deletePromotionMutation.isPending}
              onClick={() => {
                if (deletingPromotionId) {
                  deletePromotionMutation.mutate(deletingPromotionId);
                }
              }}
              variant="destructive"
            >
              {deletePromotionMutation.isPending ? "프로모션 삭제 중…" : "프로모션 삭제"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function EntityColumnActionsMenu<Entity extends CampaignWorkspaceEntityCard>({
  cards,
  entityLabel,
  label,
  onDelete,
  onEdit
}: {
  cards: ReadonlyArray<Entity>;
  entityLabel: string;
  label: string;
  onDelete: (card: Entity) => void;
  onEdit: (card: Entity) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label={`${label} ${entityLabel} 작업`}
          size="icon-sm"
          title={`${label} ${entityLabel} 작업`}
          type="button"
          variant="ghost"
        >
          <Ellipsis aria-hidden="true" data-icon="inline-start" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>
          {label} {entityLabel}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {cards.length > 0 ? (
            cards.map((card) => (
              <DropdownMenuSub key={card.id}>
                <DropdownMenuSubTrigger>
                  <span className="truncate">{card.title}</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-32">
                  <DropdownMenuGroup>
                    <DropdownMenuItem onSelect={() => onEdit(card)}>수정</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => onDelete(card)} variant="destructive">
                      삭제
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            ))
          ) : (
            <DropdownMenuItem disabled>관리할 {entityLabel}이 없어요</DropdownMenuItem>
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function toCampaignCard(campaign: DashboardCampaignSummary): CampaignCard {
  return {
    campaign,
    dateRangeLabel: formatCampaignDateRange(campaign),
    description: campaign.objective ?? "아직 목표가 없어요",
    id: campaign.campaign_id,
    kind: "campaign",
    metrics: [
      { id: "promotions", label: "프로모션", value: formatInteger(campaign.promotion_count) },
      { id: "segments", label: "세그먼트", value: formatInteger(campaign.segment_count) },
      {
        id: "experiments",
        label: "광고 실험",
        value: formatInteger(campaign.ad_experiment_count)
      },
      {
        id: "achievement",
        label: "목표 달성률",
        value:
          campaign.latest_goal_achievement_rate === null
            ? "-"
            : formatPercent(campaign.latest_goal_achievement_rate)
      }
    ],
    title: campaign.campaign_name
  };
}

function formatCampaignDateRange(campaign: DashboardCampaignSummary): string {
  return `${formatCampaignDate(campaign.start_date)} ~ ${formatCampaignDate(campaign.end_date)}`;
}

function formatCampaignDate(value: string | null): string {
  if (!value) {
    return "미정";
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return value;
  }

  return `${Number(match[2])}.${Number(match[3])}`;
}

function toPromotionCard(promotion: DashboardCampaignPromotion): PromotionCard {
  return {
    description: promotion.message_brief ?? formatChannelLabel(promotion.channel),
    id: promotion.promotion_id,
    kind: "promotion",
    metrics: [
      { id: "channel", label: "노출 방식", value: formatChannelLabel(promotion.channel) },
      {
        id: "goal",
        label: "목표 지표",
        value: formatMetricLabel(promotion.goal_metric)
      },
      {
        id: "segments",
        label: "세그먼트",
        value: formatInteger(promotion.target_segment_count)
      },
      {
        id: "experiments",
        label: "광고 실험",
        value: formatInteger(promotion.ad_experiment_count)
      }
    ],
    promotion,
    title: promotion.marketing_theme
  };
}

function getActiveHierarchyLevel({
  campaignView,
  hasCampaign,
  hasPromotion,
  hasSegment,
  promotionView
}: {
  campaignView: DashboardQuery["campaignView"];
  hasCampaign: boolean;
  hasPromotion: boolean;
  hasSegment: boolean;
  promotionView: DashboardQuery["promotionView"];
}): CampaignHierarchyLevel {
  if (!hasCampaign || campaignView === "performance") {
    return "campaign";
  }
  if (!hasPromotion || promotionView === "performance") {
    return "promotion";
  }
  if (!hasSegment) {
    return "segment";
  }
  return "experiment";
}

async function invalidateCampaignWorkspace(
  queryClient: ReturnType<typeof useQueryClient>,
  query: DashboardQuery,
  campaignId: string
) {
  await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  await queryClient.invalidateQueries({
    queryKey: dashboardCampaignDetailQueryKey(query.projectId, campaignId)
  });
}
